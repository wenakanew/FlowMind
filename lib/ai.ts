import { getGeminiClient } from './gemini-client';
import {
    AgentActorContext,
    rewriteShortGithubFollowUp,
    rewriteVagueFollowUp,
    updateConversationHints,
} from './ai-conversation-hints';
import { notionToolDeclaration, createToolsImplementation } from './ai-tools';

export type { AgentActorContext };

export function getAIClient() {
    return getGeminiClient();
}

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
