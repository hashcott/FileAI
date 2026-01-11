import { VectorStoreAdapter } from "@fileai/shared";
import { QdrantAdapter } from "./qdrant-adapter";
import { SystemConfig } from "../../db/models/SystemConfig";

let vectorStoreInstance: VectorStoreAdapter | null = null;

export async function getVectorStore(): Promise<VectorStoreAdapter> {
  if (vectorStoreInstance) {
    return vectorStoreInstance;
  }

  // Get config from database
  const config = await SystemConfig.findOne();

  if (!config || !config.vectorDB) {
    // Default to Qdrant with env variables
    vectorStoreInstance = new QdrantAdapter({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: "documents",
    });
    return vectorStoreInstance;
  }

  switch (config.vectorDB.type) {
    case "qdrant":
      vectorStoreInstance = new QdrantAdapter({
        url: config.vectorDB.config.url,
        apiKey: config.vectorDB.config.apiKey,
        collectionName: config.vectorDB.config.collectionName || "documents",
      });
      break;

    // TODO: Add MeiliSearch and MongoDB vector adapters
    case "meilisearch":
    case "mongodb":
    default:
      throw new Error(`Vector store type ${config.vectorDB.type} not implemented yet`);
  }

  return vectorStoreInstance;
}

// Reset vector store instance (useful for config changes)
export function resetVectorStore() {
  vectorStoreInstance = null;
}

