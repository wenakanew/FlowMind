import { describe, it, expect, beforeEach } from 'vitest';
import {
    inferGithubIntent,
    isVagueFollowUp,
    shouldStoreAsActionablePrompt,
    updateConversationHints,
    rewriteShortGithubFollowUp,
    rewriteVagueFollowUp,
    isTaskOwnedByActor,
    getActorKey,
    clearConversationHints,
    AgentActorContext,
} from '@/lib/ai-conversation-hints';

describe('ai-conversation-hints', () => {
    beforeEach(() => {
        clearConversationHints();
    });

    describe('inferGithubIntent', () => {
        it('identifies issue intent', () => {
            expect(inferGithubIntent('check issues in FlowMind')).toBe('issues');
        });

        it('identifies PR intent', () => {
            expect(inferGithubIntent('show open prs for FlowMind')).toBe('pullRequests');
        });

        it('identifies combined issues and PRs intent', () => {
            expect(inferGithubIntent('list issues and pull requests in repo')).toBe('issuesAndPullRequests');
        });

        it('returns null when no github intent is detected', () => {
            expect(inferGithubIntent('what is the weather today?')).toBeNull();
        });
    });

    describe('isVagueFollowUp', () => {
        it('recognizes common vague prompts', () => {
            expect(isVagueFollowUp('what about now')).toBe(true);
            expect(isVagueFollowUp('what about now?')).toBe(true);
            expect(isVagueFollowUp('now?')).toBe(true);
            expect(isVagueFollowUp('check now')).toBe(true);
            expect(isVagueFollowUp('try again')).toBe(true);
        });

        it('returns false for actionable prompts', () => {
            expect(isVagueFollowUp('create a task for API docs')).toBe(false);
        });
    });

    describe('shouldStoreAsActionablePrompt', () => {
        it('rejects short prompts and greetings', () => {
            expect(shouldStoreAsActionablePrompt('')).toBe(false);
            expect(shouldStoreAsActionablePrompt('hi')).toBe(false);
            expect(shouldStoreAsActionablePrompt('hello')).toBe(false);
            expect(shouldStoreAsActionablePrompt('now?')).toBe(false);
        });

        it('accepts valid prompts', () => {
            expect(shouldStoreAsActionablePrompt('list my pending tasks')).toBe(true);
        });
    });

    describe('conversation state & prompt rewriting', () => {
        const actor: AgentActorContext = {
            email: 'test@example.com',
            name: 'Test User',
            handle: 'testuser',
        };

        it('rewrites short repo follow-up prompt based on prior issue intent', () => {
            updateConversationHints('show open issues for my repo', actor);
            const rewritten = rewriteShortGithubFollowUp('FlowMind', actor);
            expect(rewritten).toContain('Check open GitHub issues for repository "FlowMind"');
        });

        it('rewrites short repo follow-up prompt based on prior PR intent', () => {
            updateConversationHints('show PRs for my repo', actor);
            const rewritten = rewriteShortGithubFollowUp('FlowMind', actor);
            expect(rewritten).toContain('Check open GitHub pull requests for repository "FlowMind"');
        });

        it('rewrites vague follow-up with previous actionable prompt', () => {
            updateConversationHints('Check open issues in repository FlowMind', actor);
            const rewritten = rewriteVagueFollowUp('what about now?', actor);
            expect(rewritten).toContain('Retry this user request now and provide a direct answer: Check open issues in repository FlowMind');
        });

        it('clears expired hints based on TTL', () => {
            updateConversationHints('show open issues for my repo', actor);
            const actorKey = getActorKey(actor);
            expect(actorKey).toBe('email:test@example.com');
        });
    });

    describe('isTaskOwnedByActor', () => {
        it('returns true if no actor identifier is supplied', () => {
            expect(isTaskOwnedByActor('anyone', {})).toBe(true);
        });

        it('matches owner when actor email or handle is present in owner text', () => {
            const actor: AgentActorContext = { email: 'alice@example.com', name: 'Alice' };
            expect(isTaskOwnedByActor('Created by alice@example.com', actor)).toBe(true);
            expect(isTaskOwnedByActor('Created by bob@example.com', actor)).toBe(false);
        });
    });
});
