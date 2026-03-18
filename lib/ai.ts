import { GoogleGenAI, Type } from '@google/genai';
import { getTasks, createTask, getUserByEmail } from './notion';
import {
    githubCreatePullRequest,
    githubCreateRepo,
    githubGetCurrentUser,
    githubListIssues,
    githubListPullRequests,
    githubListRepos,
    githubSearchIssues,
} from './external/github-api';
import {
    calendarCreateEvent,
    calendarListEvents,
    gmailListMessages,
    gmailReplyToMessage,
    gmailSendEmail,
} from './external/google-api';

interface AgentActorContext {
    email?: string;
    name?: string;
    handle?: string;
    channel?: 'telegram' | 'whatsapp' | 'web';
}

type GithubIntent = 'issues' | 'pullRequests' | 'issuesAndPullRequests';

interface ConversationHints {
    lastGithubIntent?: GithubIntent;
    lastActionablePrompt?: string;
    updatedAt: number;
}

let aiClient: GoogleGenAI | null = null;
const conversationHintsByActor = new Map<string, ConversationHints>();
const HINT_TTL_MS = 1000 * 60 * 60;

export function getAIClient() {
    if (!aiClient) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not set');
        }
        aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return aiClient;
}

function normalize(value?: string) {
    return (value || '').trim().toLowerCase();
}

function isTaskOwnedByActor(owner: string | undefined, actor?: AgentActorContext) {
    if (!actor?.email && !actor?.name && !actor?.handle) {
        return true;
    }

    const ownerText = normalize(owner);
    if (!ownerText) {
        return false;
    }

    const checks = [normalize(actor.email), normalize(actor.name), normalize(actor.handle)].filter(Boolean);
    return checks.some((value) => ownerText.includes(value));
}

function getActorKey(actor?: AgentActorContext) {
    const email = normalize(actor?.email);
    if (email) return `email:${email}`;
    const handle = normalize(actor?.handle);
    if (handle) return `handle:${handle}`;
    return '';
}

function inferGithubIntent(prompt: string): GithubIntent | null {
    const text = normalize(prompt);
    const hasIssue = /\bissue|issues\b/.test(text);
    const hasPr = /\bpr|prs|pull request|pull requests\b/.test(text);

    if (hasIssue && hasPr) return 'issuesAndPullRequests';
    if (hasPr) return 'pullRequests';
    if (hasIssue) return 'issues';
    return null;
}

function rewriteShortGithubFollowUp(prompt: string, actor?: AgentActorContext) {
    const actorKey = getActorKey(actor);
    if (!actorKey) return prompt;

    const hints = conversationHintsByActor.get(actorKey);
    if (!hints) return prompt;
    if (Date.now() - hints.updatedAt > HINT_TTL_MS) {
        conversationHintsByActor.delete(actorKey);
        return prompt;
    }

    const trimmed = prompt.trim();
    const isLikelyRepoOnly = /^[a-z0-9_.-]{2,100}$/i.test(trimmed);
    if (!isLikelyRepoOnly) return prompt;

    if (hints.lastGithubIntent === 'issues') {
        return `Check open GitHub issues for repository \"${trimmed}\" under my connected account owner.`;
    }

    if (hints.lastGithubIntent === 'pullRequests') {
        return `Check open GitHub pull requests for repository \"${trimmed}\" under my connected account owner.`;
    }

    if (hints.lastGithubIntent === 'issuesAndPullRequests') {
        return `Check both open GitHub issues and open pull requests for repository \"${trimmed}\" under my connected account owner.`;
    }

    return prompt;
}

function isVagueFollowUp(text: string) {
    const value = normalize(text);
    return (
        value === 'what about now' ||
        value === 'what about now?' ||
        value === 'now?' ||
        value === 'check now' ||
        value === 'try again' ||
        value === 'ok check' ||
        value === 'okay check'
    );
}

function rewriteVagueFollowUp(prompt: string, actor?: AgentActorContext) {
    if (!isVagueFollowUp(prompt)) {
        return prompt;
    }

    const actorKey = getActorKey(actor);
    if (!actorKey) return prompt;

    const hints = conversationHintsByActor.get(actorKey);
    if (!hints?.lastActionablePrompt) {
        return prompt;
    }

    return `Retry this user request now and provide a direct answer: ${hints.lastActionablePrompt}`;
}

function shouldStoreAsActionablePrompt(prompt: string) {
    const value = normalize(prompt);
    if (!value) return false;
    if (isVagueFollowUp(value)) return false;
    if (/^(hi|hello|hey|yo|help)\b/.test(value)) return false;
    return value.length >= 6;
}

function updateConversationHints(prompt: string, actor?: AgentActorContext) {
    const actorKey = getActorKey(actor);
    if (!actorKey) return;

    const existing = conversationHintsByActor.get(actorKey);
    const intent = inferGithubIntent(prompt) || existing?.lastGithubIntent;
    const lastActionablePrompt = shouldStoreAsActionablePrompt(prompt)
        ? prompt
        : existing?.lastActionablePrompt;

    conversationHintsByActor.set(actorKey, {
        lastGithubIntent: intent,
        lastActionablePrompt,
        updatedAt: Date.now(),
    });
}

function createToolsImplementation(actor?: AgentActorContext): Record<string, Function> {
    let cachedLinkedUser: Awaited<ReturnType<typeof getUserByEmail>> | null | undefined;
    let cachedGithubProfile: Awaited<ReturnType<typeof githubGetCurrentUser>> | null | undefined;

    const getLinkedUser = async () => {
        if (!actor?.email) {
            throw new Error('No authenticated user context is available for this request.');
        }

        if (typeof cachedLinkedUser !== 'undefined') {
            return cachedLinkedUser;
        }

        cachedLinkedUser = await getUserByEmail(actor.email);
        if (!cachedLinkedUser) {
            throw new Error('No linked user record found. Please sign in and sync profile first.');
        }

        return cachedLinkedUser;
    };

    const getGithubToken = async () => {
        const user = await getLinkedUser();
        if (!user?.githubAccessToken) {
            throw new Error('GitHub is not connected for this account. Please connect GitHub in Integrations.');
        }
        return user.githubAccessToken;
    };

    const getGithubProfile = async () => {
        if (typeof cachedGithubProfile !== 'undefined') {
            if (!cachedGithubProfile) {
                throw new Error('Unable to read connected GitHub profile for this account.');
            }
            return cachedGithubProfile;
        }

        const token = await getGithubToken();
        cachedGithubProfile = await githubGetCurrentUser(token);
        if (!cachedGithubProfile) {
            throw new Error('Unable to read connected GitHub profile for this account.');
        }
        return cachedGithubProfile;
    };

    const getGoogleToken = async () => {
        const user = await getLinkedUser();
        const token = user?.gmailAccessToken || user?.googleCalendarAccessToken;
        if (!token) {
            throw new Error('Google is not connected for this account. Please connect Google in Integrations.');
        }
        return token;
    };

    const createAuditTask = async (title: string, status: string = 'Done', deadline?: string) => {
        const owner = actor?.email || actor?.name || actor?.handle;
        try {
            const task = await createTask(title, status, owner, deadline);
            return task;
        } catch (error) {
            console.error('Failed to create audit task:', error);
            return null;
        }
    };

    const getFeatureCatalog = () => ({
        messaging: [
            'Telegram and WhatsApp linked chat with identity-aware context',
            'Cross-tool actions from chat (tasks, email, calendar, GitHub)',
        ],
        taskAutomation: [
            'Create and manage tasks in Notion Tasks DB',
            'Automatic completed-task logging for sent emails and replies',
            'Automatic completed-task logging for created calendar events',
            'Automatic completed-task logging for GitHub repo/PR creation',
            'Meeting reminder tasks scheduled 2 minutes before event start',
        ],
        google: [
            'List Gmail messages',
            'Send email and reply to existing email',
            'List upcoming Google Calendar events',
            'Create Google Calendar events with Google Meet links',
            'Schedule meeting and email the Meet URL in one action',
        ],
        github: [
            'Get connected GitHub profile',
            'List repositories',
            'List issues / PRs by repo (owner defaults to connected profile)',
            'List open issues and PRs across your account',
            'Create repositories and pull requests',
        ],
        safeguards: [
            'User-scoped data isolation by linked account context',
            'Integration-aware error messages when tools are disconnected',
        ],
    });

    return {
        getConnectedAccounts: async () => {
            const user = await getLinkedUser();
            return {
                telegramConnected: Boolean(user?.telegramUsername),
                whatsappConnected: Boolean(user?.whatsappNumber),
                githubConnected: Boolean(user?.githubAccessToken),
                gmailConnected: Boolean(user?.gmailAccessToken),
                googleCalendarConnected: Boolean(user?.googleCalendarAccessToken),
            };
        },
        getFeatureCatalog: async () => getFeatureCatalog(),
        getTasks: async (args: any) => {
            const tasks = await getTasks(args?.statusFilter);

            const ownedOnly = tasks.filter((task) => isTaskOwnedByActor(task.owner, actor));
            const includeDone = !!args?.includeDone;
            const forToday = !!args?.forToday;
            const today = new Date().toISOString().slice(0, 10);

            let filtered = includeDone
                ? ownedOnly
                : ownedOnly.filter((task) => normalize(task.status) !== 'done');

            if (forToday) {
                filtered = filtered.filter((task) => (task.deadline || '').startsWith(today));
            }

            const limit = Math.max(1, Math.min(25, Number(args?.limit) || 10));
            return {
                tasks: filtered.slice(0, limit),
                total: filtered.length,
            };
        },
        createTask: async (args: any) => {
            const owner = actor?.email || actor?.name || actor?.handle;
            const task = await createTask(args.title, args.status || 'To Do', owner);
            return { task };
        },
        githubGetProfile: async () => {
            const profile = await getGithubProfile();
            return { profile };
        },
        githubListRepos: async (args: any) => {
            const token = await getGithubToken();
            const repos = await githubListRepos(token, args?.limit);
            return {
                count: repos.length,
                repos,
            };
        },
        githubCreateRepo: async (args: any) => {
            const token = await getGithubToken();
            const repo = await githubCreateRepo(token, args.name, args.description, args.private ?? true);
            const task = await createAuditTask(`GitHub repo created: ${repo.full_name}`, 'Done');
            return { repo, taskLogged: Boolean(task), task };
        },
        githubListIssues: async (args: any) => {
            const token = await getGithubToken();
            const profile = await getGithubProfile();
            const owner = (args?.owner || '').trim() || profile.login;
            const repo = (args?.repo || '').trim();

            if (!repo) {
                throw new Error('Repository name is required. Example: "check PRs in FlowMind". I will default owner to your account automatically.');
            }

            const issues = await githubListIssues(token, owner, repo, args?.state || 'open', args?.limit || 20);
            return {
                owner,
                repo,
                count: issues.length,
                issues,
            };
        },
        githubListPullRequests: async (args: any) => {
            const token = await getGithubToken();
            const profile = await getGithubProfile();
            const owner = (args?.owner || '').trim() || profile.login;
            const repo = (args?.repo || '').trim();

            if (!repo) {
                throw new Error('Repository name is required. Example: "check PRs in FlowMind". I will default owner to your account automatically.');
            }

            const pullRequests = await githubListPullRequests(token, owner, repo, args?.state || 'open', args?.limit || 20);
            return {
                owner,
                repo,
                count: pullRequests.length,
                pullRequests,
            };
        },
        githubListMyOpenWork: async (args: any) => {
            const token = await getGithubToken();
            const profile = await getGithubProfile();
            const limit = Math.max(1, Math.min(100, Number(args?.limit) || 50));
            const scope = args?.scope === 'authored' ? 'authored' : 'owned';
            const includeIssues = args?.includeIssues !== false;
            const includePullRequests = args?.includePullRequests !== false;

            const qualifiers = scope === 'authored'
                ? `author:${profile.login}`
                : `user:${profile.login}`;

            const [issues, pullRequests] = await Promise.all([
                includeIssues
                    ? githubSearchIssues(token, `${qualifiers} is:issue state:open`, limit)
                    : Promise.resolve([]),
                includePullRequests
                    ? githubSearchIssues(token, `${qualifiers} is:pr state:open`, limit)
                    : Promise.resolve([]),
            ]);

            return {
                owner: profile.login,
                scope,
                issueCount: issues.length,
                pullRequestCount: pullRequests.length,
                issues,
                pullRequests,
            };
        },
        githubCreatePullRequest: async (args: any) => {
            const token = await getGithubToken();
            const pullRequest = await githubCreatePullRequest(
                token,
                args.owner,
                args.repo,
                args.title,
                args.head,
                args.base,
                args.body,
            );
            const task = await createAuditTask(
                `GitHub PR created: ${args.owner}/${args.repo} #${pullRequest.number} ${args.title}`,
                'Done',
            );
            return { pullRequest, taskLogged: Boolean(task), task };
        },
        gmailListMessages: async (args: any) => {
            const token = await getGoogleToken();
            const messages = await gmailListMessages(token, args?.query || '', args?.limit || 10);
            return { count: messages.length, messages };
        },
        gmailSendEmail: async (args: any) => {
            const token = await getGoogleToken();
            const sent = await gmailSendEmail(token, args.to, args.subject, args.body);
            const task = await createAuditTask(
                `Email sent to ${args.to} about ${args.subject || 'No subject'}`,
                'Done',
            );
            return { sent, taskLogged: Boolean(task), task };
        },
        gmailReplyEmail: async (args: any) => {
            const token = await getGoogleToken();
            const sent = await gmailReplyToMessage(token, args.messageId, args.body);
            const task = await createAuditTask(
                `Email reply sent for message ${args.messageId}`,
                'Done',
            );
            return { sent, taskLogged: Boolean(task), task };
        },
        calendarListEvents: async (args: any) => {
            const token = await getGoogleToken();
            const events = await calendarListEvents(token, args?.timeMin, args?.timeMax, args?.limit || 10);
            return { count: events.length, events };
        },
        calendarCreateEvent: async (args: any) => {
            const token = await getGoogleToken();
            const event = await calendarCreateEvent(
                token,
                args.summary,
                args.startDateTime,
                args.endDateTime,
                args.description,
                args.createMeetLink !== false,
            );

            const meetUrl =
                event.hangoutLink ||
                event.conferenceData?.entryPoints?.find((entry) => entry?.entryPointType === 'video')?.uri ||
                null;

            const summary = args.summary || 'Meeting';
            const scheduledTask = await createAuditTask(
                `Meeting scheduled: ${summary}`,
                'Done',
                args.startDateTime,
            );

            let reminderTask = null;
            try {
                const startMs = Date.parse(args.startDateTime || '');
                if (!Number.isNaN(startMs)) {
                    const reminderAt = new Date(startMs - 2 * 60 * 1000).toISOString();
                    const owner = actor?.email || actor?.name || actor?.handle;
                    reminderTask = await createTask(
                        `Reminder: you have a meeting with ${summary} at ${new Date(startMs).toISOString()}`,
                        'To Do',
                        owner,
                        reminderAt,
                    );
                }
            } catch (error) {
                console.error('Failed to create reminder task:', error);
            }

            return {
                event,
                meetUrl,
                taskLogged: Boolean(scheduledTask),
                scheduledTask,
                reminderTask,
                reminderPolicy: 'A reminder task is created for 2 minutes before meeting start.',
            };
        },
        scheduleMeetingAndEmail: async (args: any) => {
            const token = await getGoogleToken();
            const event = await calendarCreateEvent(
                token,
                args.summary,
                args.startDateTime,
                args.endDateTime,
                args.description,
                args.createMeetLink !== false,
            );

            const meetUrl =
                event.hangoutLink ||
                event.conferenceData?.entryPoints?.find((entry) => entry?.entryPointType === 'video')?.uri ||
                null;

            const recipient = String(args.recipientEmail || '').trim();
            const bodyLines = [
                `Hello,`,
                '',
                args.customIntro || `You are invited to "${args.summary}". Please avail yourself for the meeting.`,
                '',
                `Start: ${args.startDateTime}`,
                `End: ${args.endDateTime}`,
                meetUrl ? `Google Meet link: ${meetUrl}` : 'Meeting link: (Google Meet link was not returned by Calendar API)',
                event.htmlLink ? `Calendar event: ${event.htmlLink}` : '',
                '',
                'Regards,',
                actor?.name || 'FlowMind Assistant',
            ].filter(Boolean);

            let emailResult: { id: string; threadId: string } | null = null;
            if (recipient) {
                emailResult = await gmailSendEmail(
                    token,
                    recipient,
                    args.emailSubject || `Meeting invite: ${args.summary}`,
                    bodyLines.join('\n'),
                );
            }

            const summary = args.summary || 'Meeting';
            const scheduledTask = await createAuditTask(
                `Meeting scheduled: ${summary}`,
                'Done',
                args.startDateTime,
            );
            const emailTask = recipient
                ? await createAuditTask(`Email sent to ${recipient} about meeting ${summary}`, 'Done')
                : null;

            let reminderTask = null;
            try {
                const startMs = Date.parse(args.startDateTime || '');
                if (!Number.isNaN(startMs)) {
                    const reminderAt = new Date(startMs - 2 * 60 * 1000).toISOString();
                    const owner = actor?.email || actor?.name || actor?.handle;
                    reminderTask = await createTask(
                        `Reminder: you have a meeting with ${summary} at ${new Date(startMs).toISOString()}`,
                        'To Do',
                        owner,
                        reminderAt,
                    );
                }
            } catch (error) {
                console.error('Failed to create reminder task:', error);
            }

            return {
                event,
                meetUrl,
                emailSent: Boolean(emailResult),
                emailResult,
                tasksLogged: {
                    meeting: Boolean(scheduledTask),
                    email: Boolean(emailTask),
                    reminder: Boolean(reminderTask),
                },
                scheduledTask,
                emailTask,
                reminderTask,
            };
        },
    };
}

const notionToolDeclaration = {
    functionDeclarations: [
        {
            name: "getTasks",
            description: "Retrieves tasks from the user's Notion Tasks Database. Use this to check existing tasks, todo lists, or completed items.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    statusFilter: {
                        type: Type.STRING,
                        description: "Optional filter to only return tasks with a specific status (e.g. 'To Do', 'In Progress', 'Done')."
                    },
                    forToday: {
                        type: Type.BOOLEAN,
                        description: "If true, only return tasks with deadline equal to today."
                    },
                    includeDone: {
                        type: Type.BOOLEAN,
                        description: "If true, include tasks with Done status."
                    },
                    limit: {
                        type: Type.NUMBER,
                        description: "Max number of tasks to return (1-25)."
                    }
                }
            }
        },
        {
            name: "createTask",
            description: "Creates a new task in the user's Notion Tasks Database. Use this when the user asks you to remember to do something or add a task.",
            parameters: {
                type: Type.OBJECT,
                properties: {
                    title: {
                        type: Type.STRING,
                        description: "The name or title of the task to be created."
                    },
                    status: {
                        type: Type.STRING,
                        description: "The initial status of the task. Should typically be 'To Do' unless specified otherwise."
                    }
                },
                required: ["title"]
            }
        },
        {
            name: 'getConnectedAccounts',
            description: 'Returns which integrations are currently connected for the authenticated user.',
            parameters: {
                type: Type.OBJECT,
                properties: {},
            },
        },
        {
            name: 'getFeatureCatalog',
            description: 'Returns the complete list of FlowMind capabilities and automation features.',
            parameters: {
                type: Type.OBJECT,
                properties: {},
            },
        },
        {
            name: 'githubGetProfile',
            description: 'Get basic profile information for the connected GitHub account.',
            parameters: { type: Type.OBJECT, properties: {} },
        },
        {
            name: 'githubListRepos',
            description: 'List repositories from the connected GitHub account.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    limit: { type: Type.NUMBER, description: 'Maximum repos to return (1-100).' },
                },
            },
        },
        {
            name: 'githubCreateRepo',
            description: 'Create a new repository in the connected GitHub account.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'Repository name.' },
                    description: { type: Type.STRING, description: 'Repository description.' },
                    private: { type: Type.BOOLEAN, description: 'Whether repo should be private.' },
                },
                required: ['name'],
            },
        },
        {
            name: 'githubListIssues',
            description: 'List issues for a GitHub repository.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    owner: { type: Type.STRING, description: 'Repository owner/org. Optional; defaults to connected GitHub username.' },
                    repo: { type: Type.STRING, description: 'Repository name.' },
                    state: { type: Type.STRING, description: 'Issue state: open, closed, all.' },
                    limit: { type: Type.NUMBER, description: 'Maximum issues to return.' },
                },
                required: ['repo'],
            },
        },
        {
            name: 'githubListPullRequests',
            description: 'List pull requests for a GitHub repository.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    owner: { type: Type.STRING, description: 'Repository owner/org. Optional; defaults to connected GitHub username.' },
                    repo: { type: Type.STRING, description: 'Repository name.' },
                    state: { type: Type.STRING, description: 'PR state: open, closed, all.' },
                    limit: { type: Type.NUMBER, description: 'Maximum pull requests to return.' },
                },
                required: ['repo'],
            },
        },
        {
            name: 'githubListMyOpenWork',
            description: 'List open GitHub issues and/or pull requests across all repositories for the connected account.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    scope: { type: Type.STRING, description: 'owned (default) or authored.' },
                    includeIssues: { type: Type.BOOLEAN, description: 'Include open issues in the result.' },
                    includePullRequests: { type: Type.BOOLEAN, description: 'Include open pull requests in the result.' },
                    limit: { type: Type.NUMBER, description: 'Maximum items per category (1-100).' },
                },
            },
        },
        {
            name: 'githubCreatePullRequest',
            description: 'Create a pull request in a GitHub repository.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    owner: { type: Type.STRING, description: 'Repository owner/org.' },
                    repo: { type: Type.STRING, description: 'Repository name.' },
                    title: { type: Type.STRING, description: 'PR title.' },
                    head: { type: Type.STRING, description: 'Head branch name.' },
                    base: { type: Type.STRING, description: 'Base branch name.' },
                    body: { type: Type.STRING, description: 'PR body.' },
                },
                required: ['owner', 'repo', 'title', 'head', 'base'],
            },
        },
        {
            name: 'gmailListMessages',
            description: 'List recent Gmail messages from the connected Google account.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING, description: 'Gmail search query.' },
                    limit: { type: Type.NUMBER, description: 'Maximum messages to return.' },
                },
            },
        },
        {
            name: 'gmailSendEmail',
            description: 'Send a new email using connected Gmail account.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    to: { type: Type.STRING, description: 'Recipient email.' },
                    subject: { type: Type.STRING, description: 'Email subject.' },
                    body: { type: Type.STRING, description: 'Plain text email body.' },
                },
                required: ['to', 'subject', 'body'],
            },
        },
        {
            name: 'gmailReplyEmail',
            description: 'Reply to an existing Gmail message by message ID.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    messageId: { type: Type.STRING, description: 'Gmail message ID to reply to.' },
                    body: { type: Type.STRING, description: 'Reply body text.' },
                },
                required: ['messageId', 'body'],
            },
        },
        {
            name: 'calendarListEvents',
            description: 'List upcoming events from connected Google Calendar.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    timeMin: { type: Type.STRING, description: 'ISO start date-time filter.' },
                    timeMax: { type: Type.STRING, description: 'ISO end date-time filter.' },
                    limit: { type: Type.NUMBER, description: 'Maximum events to return.' },
                },
            },
        },
        {
            name: 'calendarCreateEvent',
            description: 'Create a Google Calendar event. Can generate a Google Meet link when createMeetLink is true (default).',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: 'Event title.' },
                    startDateTime: { type: Type.STRING, description: 'Event start in ISO datetime format.' },
                    endDateTime: { type: Type.STRING, description: 'Event end in ISO datetime format.' },
                    description: { type: Type.STRING, description: 'Optional event description.' },
                    createMeetLink: { type: Type.BOOLEAN, description: 'Whether to generate a Google Meet URL for this event. Defaults to true.' },
                },
                required: ['summary', 'startDateTime', 'endDateTime'],
            },
        },
        {
            name: 'scheduleMeetingAndEmail',
            description: 'Create a Google Calendar meeting (with Google Meet link) and send the meeting link via Gmail in one action.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: 'Meeting title.' },
                    startDateTime: { type: Type.STRING, description: 'Meeting start in ISO datetime format.' },
                    endDateTime: { type: Type.STRING, description: 'Meeting end in ISO datetime format.' },
                    description: { type: Type.STRING, description: 'Optional meeting description.' },
                    recipientEmail: { type: Type.STRING, description: 'Recipient email for meeting link.' },
                    emailSubject: { type: Type.STRING, description: 'Optional email subject override.' },
                    customIntro: { type: Type.STRING, description: 'Optional custom email intro line.' },
                    createMeetLink: { type: Type.BOOLEAN, description: 'Whether to generate a Google Meet URL. Defaults to true.' },
                },
                required: ['summary', 'startDateTime', 'endDateTime', 'recipientEmail'],
            },
        },
    ] as any
};

export async function runAgent(prompt: string, actor?: AgentActorContext) {
    const ai = getAIClient();
    const model = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';
    const toolsImplementation = createToolsImplementation(actor);
    const actorLine = actor?.email
        ? `Authenticated actor email: ${actor.email}.`
        : 'No authenticated actor email available.';
    const actorNameLine = actor?.name ? `Actor name: ${actor.name}.` : '';
    const actorHandleLine = actor?.handle ? `Messaging handle: ${actor.handle}.` : '';
    const actorChannelLine = actor?.channel ? `Channel: ${actor.channel}.` : '';
    const shortRewritePrompt = rewriteShortGithubFollowUp(prompt, actor);
    const effectivePrompt = rewriteVagueFollowUp(shortRewritePrompt, actor);
    updateConversationHints(effectivePrompt, actor);

    console.log(`🧠 Agent received prompt: "${prompt}"`);
    if (effectivePrompt !== prompt) {
        console.log(`↪️ Rewritten prompt with follow-up context: "${effectivePrompt}"`);
    }

    // In a real chat app, you would pass the whole conversation history array.
    // We are simulating a single stateless turn for this PoC.
    const chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: [
                "You are FlowMind, an AI personal assistant. Be accurate, direct, and action-oriented.",
                "Proactively use tools to complete requests when possible.",
                "Use the authenticated actor context in this session and never ask who the owner is if GitHub is connected; default owner to the connected GitHub profile automatically.",
                "For requests like 'open PRs/issues in my GitHub', use githubListMyOpenWork first before asking follow-up questions.",
                "If user gives just a repository name after a prior GitHub question, treat it as repo and proceed with default owner.",
                "Do not reset the conversation with generic greetings unless the user is explicitly greeting you.",
                "When you send an email, reply to an email, or schedule a meeting, always ensure there is a corresponding task record in Notion Tasks DB.",
                "When scheduling a meeting, ensure reminder workflow is represented with a reminder task set for 2 minutes before meeting start.",
                "You can generate Google Meet links when creating Calendar events; prefer this for meeting requests.",
                "For requests that ask to schedule a meeting and email the link, use scheduleMeetingAndEmail.",
                "When user asks 'what can you do?', call getFeatureCatalog and summarize capabilities clearly.",
                "If a requested integration is not connected, clearly tell the user which integration to connect in the Integrations page.",
                "For task questions like 'today', prefer checking pending tasks and today's deadlines without unnecessary back-and-forth.",
                "Never reveal data that doesn't belong to the authenticated user context provided by tools.",
                actorLine,
                actorNameLine,
                actorHandleLine,
                actorChannelLine,
            ].filter(Boolean).join(' '),
            tools: [notionToolDeclaration],
            temperature: 0.35,
        }
    });

    let response = await chat.sendMessage({ message: effectivePrompt });
    let finalAnswer = "";

    // The SDK chat session handles keeping history. 
    // If the model decides to call functions, response.functionCalls will be populated.
    while (response.functionCalls && response.functionCalls.length > 0) {
        const call = response.functionCalls[0];
        const toolName = call.name || '';
        console.log(`🛠️ Model requested tool: ${toolName} with args`, call.args);

        let toolResult;
        const impl = toolName ? toolsImplementation[toolName] : undefined;

        if (impl) {
            try {
                toolResult = await impl(call.args);
            } catch (error: any) {
                console.error(`Error executing ${toolName}:`, error);
                toolResult = { error: error.message || "An unknown error occurred" };
            }
        } else {
            toolResult = { error: `Tool ${toolName || 'unknown'} not implemented.` };
        }

        console.log(`⏎ Returning tool result to model:`, toolResult);

        // Send the function response back to the model
        response = await chat.sendMessage({
            message: [{
                functionResponse: {
                    name: toolName,
                    response: toolResult
                }
            }]
        });
    }

    finalAnswer = response.text || "";
    return finalAnswer;
}
