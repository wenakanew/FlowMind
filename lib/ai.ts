import { GoogleGenAI, Type } from '@google/genai';
import { getTasks, createTask } from './notion';

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
    return {
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
        }
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
        }
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
            systemInstruction: "You are FlowMind, an AI personal assistant. Be accurate, direct, and action-oriented. Proactively use tools to complete requests when possible. For task questions like 'today', prefer checking pending tasks and today's deadlines without unnecessary back-and-forth. Never reveal data that doesn't belong to the authenticated user context provided by tools.",
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
        console.log(`🛠️ Model requested tool: ${call.name} with args`, call.args);

        let toolResult;
        const impl = toolsImplementation[call.name];

        if (impl) {
            try {
                toolResult = await impl(call.args);
            } catch (error: any) {
                console.error(`Error executing ${call.name}:`, error);
                toolResult = { error: error.message || "An unknown error occurred" };
            }
        } else {
            toolResult = { error: `Tool ${call.name} not implemented.` };
        }

        console.log(`⏎ Returning tool result to model:`, toolResult);

        // Send the function response back to the model
        response = await chat.sendMessage({
            message: [{
                functionResponse: {
                    name: call.name,
                    response: toolResult
                }
            }]
        });
    }

    finalAnswer = response.text || "";
    return finalAnswer;
}
