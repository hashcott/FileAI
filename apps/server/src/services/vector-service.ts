import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getVectorStore } from "./vector";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "@search-pdf/shared";
import { randomUUID } from "crypto";

const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

export async function storeInVectorDB(
  documentId: string,
  text: string,
  metadata: Record<string, any>
) {
  // Split text into chunks
  const chunks = await textSplitter.splitText(text);

  // Prepare documents for vector store with UUID for each chunk
  const documents = chunks.map((chunk, index) => ({
    id: randomUUID(), // Use UUID instead of string concatenation
    content: chunk,
    metadata: {
      ...metadata,
      chunkIndex: index,
      totalChunks: chunks.length,
    },
  }));

  // Store in vector database
  const vectorStore = await getVectorStore();
  await vectorStore.upsert(documents);

  console.log(`Stored ${documents.length} chunks for document ${documentId}`);
}

export async function searchVectorStore(
  query: string,
  userId: string,
  topK: number = 5,
  filter?: Record<string, any>
) {
  const vectorStore = await getVectorStore();

  // Add userId to filter
  const searchFilter = {
    ...filter,
    userId,
  };

  const results = await vectorStore.search(query, topK, searchFilter);

  return results;
}

export async function deleteFromVectorDB(documentId: string) {
  const vectorStore = await getVectorStore();

  // Search for all chunks belonging to this document using metadata filter
  // Note: We search with an empty query but filter by documentId
  // This requires the vector store to support metadata filtering
  try {
    const results = await vectorStore.search("", 1000, { documentId });

    const chunkIds = results.map((r) => r.id);

    if (chunkIds.length > 0) {
      await vectorStore.delete(chunkIds);
      console.log(`Deleted ${chunkIds.length} chunks for document ${documentId}`);
    }
  } catch (error) {
    console.error(`Error deleting vectors for document ${documentId}:`, error);
    // Don't throw - document can still be deleted even if vector cleanup fails
  }
}

