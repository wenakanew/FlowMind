import { GoogleGenAI, Type } from '@google/genai';
import { getTasks, createTask } from './notion';

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

// Map tool names to the actual internal implementation
const toolsImplementation: Record<string, Function> = {
    getTasks: async (args: any) => {
        const tasks = await getTasks(args.statusFilter);
        return { tasks };
    },
    createTask: async (args: any) => {
        const task = await createTask(args.title, args.status);
        return { task };
    }
};

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

export async function runAgent(prompt: string) {
    const ai = getAIClient();
    const model = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash';

    console.log(`🧠 Agent received prompt: "${prompt}"`);

    // In a real chat app, you would pass the whole conversation history array.
    // We are simulating a single stateless turn for this PoC.
    const chat = ai.chats.create({
        model: model,
        config: {
            systemInstruction: "You are FlowMind, an AI personal assistant wired directly into the user's Notion workspace. You can read their tasks and add new ones. Always be concise and helpful.",
            tools: [notionToolDeclaration],
            temperature: 0.2,
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
