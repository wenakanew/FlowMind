import { GoogleGenAI, Type } from '@google/genai';
import { getTasks, createTask, getUserByEmail } from './notion';
import {
    githubCreatePullRequest,
    githubCreateRepo,
    githubGetCurrentUser,
    githubListIssues,
    githubListPullRequests,
    githubListRepos,
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

let aiClient: GoogleGenAI | null = null;

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

function createToolsImplementation(actor?: AgentActorContext): Record<string, Function> {
    let cachedLinkedUser: Awaited<ReturnType<typeof getUserByEmail>> | null | undefined;

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

    const getGoogleToken = async () => {
        const user = await getLinkedUser();
        const token = user?.gmailAccessToken || user?.googleCalendarAccessToken;
        if (!token) {
            throw new Error('Google is not connected for this account. Please connect Google in Integrations.');
        }
        return token;
    };

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
            const token = await getGithubToken();
            const profile = await githubGetCurrentUser(token);
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
            return { repo };
        },
        githubListIssues: async (args: any) => {
            const token = await getGithubToken();
            const issues = await githubListIssues(token, args.owner, args.repo, args.state || 'open', args.limit || 20);
            return { count: issues.length, issues };
        },
        githubListPullRequests: async (args: any) => {
            const token = await getGithubToken();
            const pullRequests = await githubListPullRequests(token, args.owner, args.repo, args.state || 'open', args.limit || 20);
            return { count: pullRequests.length, pullRequests };
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
            return { pullRequest };
        },
        gmailListMessages: async (args: any) => {
            const token = await getGoogleToken();
            const messages = await gmailListMessages(token, args?.query || '', args?.limit || 10);
            return { count: messages.length, messages };
        },
        gmailSendEmail: async (args: any) => {
            const token = await getGoogleToken();
            const sent = await gmailSendEmail(token, args.to, args.subject, args.body);
            return { sent };
        },
        gmailReplyEmail: async (args: any) => {
            const token = await getGoogleToken();
            const sent = await gmailReplyToMessage(token, args.messageId, args.body);
            return { sent };
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
            );
            return { event };
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
                    owner: { type: Type.STRING, description: 'Repository owner/org.' },
                    repo: { type: Type.STRING, description: 'Repository name.' },
                    state: { type: Type.STRING, description: 'Issue state: open, closed, all.' },
                    limit: { type: Type.NUMBER, description: 'Maximum issues to return.' },
                },
                required: ['owner', 'repo'],
            },
        },
        {
            name: 'githubListPullRequests',
            description: 'List pull requests for a GitHub repository.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    owner: { type: Type.STRING, description: 'Repository owner/org.' },
                    repo: { type: Type.STRING, description: 'Repository name.' },
                    state: { type: Type.STRING, description: 'PR state: open, closed, all.' },
                    limit: { type: Type.NUMBER, description: 'Maximum pull requests to return.' },
                },
                required: ['owner', 'repo'],
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
            description: 'Create a Google Calendar event.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: 'Event title.' },
                    startDateTime: { type: Type.STRING, description: 'Event start in ISO datetime format.' },
                    endDateTime: { type: Type.STRING, description: 'Event end in ISO datetime format.' },
                    description: { type: Type.STRING, description: 'Optional event description.' },
                },
                required: ['summary', 'startDateTime', 'endDateTime'],
            },
        },
    ] as any
};

export async function runAgent(prompt: string, actor?: AgentActorContext) {
    const ai = getAIClient();
    const model = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';
    const toolsImplementation = createToolsImplementation(actor);

    console.log(`🧠 Agent received prompt: "${prompt}"`);

    // In a real chat app, you would pass the whole conversation history array.
    // We are simulating a single stateless turn for this PoC.
    const chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: "You are FlowMind, an AI personal assistant. Be accurate, direct, and action-oriented. Proactively use tools to complete requests when possible. You can use Notion task tools, GitHub tools, Gmail tools, and Google Calendar tools for connected accounts. If a requested integration is not connected, clearly tell the user which integration to connect in the Integrations page. For task questions like 'today', prefer checking pending tasks and today's deadlines without unnecessary back-and-forth. Never reveal data that doesn't belong to the authenticated user context provided by tools.",
            tools: [notionToolDeclaration],
            temperature: 0.35,
        }
    });

    let response = await chat.sendMessage({ message: prompt });
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
