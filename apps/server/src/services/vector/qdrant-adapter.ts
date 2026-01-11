import { QdrantClient } from "@qdrant/js-client-rest";
import { VectorStoreAdapter, VectorDocument, SearchResult } from "@fileai/shared";
import { getEmbedding } from "../embedding-service";

interface QdrantConfig {
  url: string;
  apiKey?: string;
  collectionName: string;
}

export class QdrantAdapter implements VectorStoreAdapter {
  private client: QdrantClient;
  private collectionName: string;
  private initialized = false;

  constructor(config: QdrantConfig) {
    this.client = new QdrantClient({
      url: config.url,
      apiKey: config.apiKey,
    });
    this.collectionName = config.collectionName;
  }

  private async ensureCollection(vectorSize?: number) {
    if (this.initialized) return;

    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        (c) => c.name === this.collectionName
      );

      if (!exists) {
        // Use provided vector size or default to 768 (Ollama nomic-embed-text)
        const size = vectorSize || 768;
        
        // Create collection
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: size,
            distance: "Cosine",
          },
        });
        console.log(`Created Qdrant collection: ${this.collectionName} with vector size ${size}`);
      }

      this.initialized = true;
    } catch (error) {
      console.error("Failed to ensure Qdrant collection:", error);
      throw error;
    }
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    if (documents.length === 0) return;

    // Generate embedding for first document to determine vector size
    const firstEmbedding = await getEmbedding(documents[0].content);
    await this.ensureCollection(firstEmbedding.length);

    const points = [];

    // Generate embeddings for all documents
    for (const doc of documents) {
      const embedding = await getEmbedding(doc.content);

      points.push({
        id: doc.id,
        vector: embedding,
        payload: {
          content: doc.content,
          ...doc.metadata,
        },
      });
    }

    await this.client.upsert(this.collectionName, {
      wait: true,
      points,
    });
  }

  async search(
    query: string,
    topK: number,
    filter?: Record<string, any>
  ): Promise<SearchResult[]> {
    // Generate embedding to ensure collection exists with correct dimension
    const queryEmbedding = await getEmbedding(query);
    await this.ensureCollection(queryEmbedding.length);

    // Build filter if provided
    const qdrantFilter = filter
      ? {
          must: Object.entries(filter).map(([key, value]) => ({
            key,
            match: { value },
          })),
        }
      : undefined;

    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: topK,
      filter: qdrantFilter,
      with_payload: true,
    });

    return results.map((result) => ({
      id: result.id.toString(),
      content: result.payload?.content as string,
      score: result.score,
      metadata: result.payload || {},
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await this.ensureCollection();

    await this.client.delete(this.collectionName, {
      wait: true,
      points: ids,
    });
  }
}

