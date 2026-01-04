import { OpenAIEmbeddings } from "@langchain/openai";
import { OllamaEmbeddings } from "@langchain/ollama";
import { SystemConfig } from "../db/models/SystemConfig";

let embeddingsInstance: OpenAIEmbeddings | OllamaEmbeddings | null = null;

async function getEmbeddingsModel(): Promise<OpenAIEmbeddings | OllamaEmbeddings> {
  if (embeddingsInstance) {
    return embeddingsInstance;
  }

  const config = await SystemConfig.findOne();

  if (!config || !config.embedding) {
    // Default to Ollama
    embeddingsInstance = new OllamaEmbeddings({
      baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
      model: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
    });
    return embeddingsInstance;
  }

  switch (config.embedding.provider) {
    case "openai":
      embeddingsInstance = new OpenAIEmbeddings({
        openAIApiKey: config.embedding.apiKey || process.env.OPENAI_API_KEY,
        modelName: config.embedding.model || "text-embedding-3-small",
      });
      break;

    case "ollama":
    default:
      embeddingsInstance = new OllamaEmbeddings({
        baseUrl: config.embedding.baseUrl || "http://localhost:11434",
        model: config.embedding.model || "nomic-embed-text",
      });
      break;
  }

  return embeddingsInstance;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const model = await getEmbeddingsModel();
  const embeddings = await model.embedQuery(text);
  return embeddings;
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const model = await getEmbeddingsModel();
  const embeddings = await model.embedDocuments(texts);
  return embeddings;
}

export function resetEmbeddings() {
  embeddingsInstance = null;
}

