export interface AgentActorContext {
    email?: string;
    name?: string;
    handle?: string;
    channel?: 'telegram' | 'whatsapp' | 'web';
}

export type GithubIntent = 'issues' | 'pullRequests' | 'issuesAndPullRequests';

export interface ConversationHints {
    lastGithubIntent?: GithubIntent;
    lastActionablePrompt?: string;
    updatedAt: number;
}

const conversationHintsByActor = new Map<string, ConversationHints>();
export const HINT_TTL_MS = 1000 * 60 * 60;

export function clearConversationHints() {
    conversationHintsByActor.clear();
}

export function normalize(value?: string) {
    return (value || '').trim().toLowerCase();
}

export function isTaskOwnedByActor(owner: string | undefined, actor?: AgentActorContext) {
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

export function getActorKey(actor?: AgentActorContext) {
    const email = normalize(actor?.email);
    if (email) return `email:${email}`;
    const handle = normalize(actor?.handle);
    if (handle) return `handle:${handle}`;
    return '';
}

export function inferGithubIntent(prompt: string): GithubIntent | null {
    const text = normalize(prompt);
    const hasIssue = /\bissue|issues\b/.test(text);
    const hasPr = /\bpr|prs|pull request|pull requests\b/.test(text);

    if (hasIssue && hasPr) return 'issuesAndPullRequests';
    if (hasPr) return 'pullRequests';
    if (hasIssue) return 'issues';
    return null;
}

export function rewriteShortGithubFollowUp(prompt: string, actor?: AgentActorContext) {
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

export function isVagueFollowUp(text: string) {
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

export function rewriteVagueFollowUp(prompt: string, actor?: AgentActorContext) {
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

export function shouldStoreAsActionablePrompt(prompt: string) {
    const value = normalize(prompt);
    if (!value) return false;
    if (isVagueFollowUp(value)) return false;
    if (/^(hi|hello|hey|yo|help)\b/.test(value)) return false;
    return value.length >= 6;
}

export function updateConversationHints(prompt: string, actor?: AgentActorContext) {
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
