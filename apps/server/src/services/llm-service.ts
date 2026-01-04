import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { SystemConfig } from "../db/models/SystemConfig";

let llmInstance: ChatOpenAI | ChatOllama | null = null;

export async function getLLM(): Promise<ChatOpenAI | ChatOllama> {
  if (llmInstance) {
    return llmInstance;
  }

  const config = await SystemConfig.findOne();

  if (!config || !config.llm) {
    // Default to Ollama
    llmInstance = new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_MODEL || "llama3",
      temperature: 0.7,
    });
    return llmInstance;
  }

  switch (config.llm.provider) {
    case "openai":
      llmInstance = new ChatOpenAI({
        openAIApiKey: config.llm.apiKey || process.env.OPENAI_API_KEY,
        modelName: config.llm.model || "gpt-4-turbo-preview",
        temperature: config.llm.temperature || 0.7,
      });
      break;

    case "ollama":
    default:
      llmInstance = new ChatOllama({
        baseUrl: config.llm.baseUrl || "http://localhost:11434",
        model: config.llm.model || "llama3",
        temperature: config.llm.temperature || 0.7,
      });
      break;
  }

  return llmInstance;
}

export function resetLLM() {
  llmInstance = null;
}

