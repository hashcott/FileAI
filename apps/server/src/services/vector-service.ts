import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getVectorStore } from "./vector";
import { CHUNK_SIZE, CHUNK_OVERLAP } from "@fileai/shared";
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
  filter?: Record<string, any>,
  organizationIds?: string[]
) {
  const vectorStore = await getVectorStore();

  // Build filter: include user's personal documents and organization documents
  const searchFilter: Record<string, any> = {
    ...filter,
  };

  // If organizationIds provided, search in user's personal docs OR organization docs
  // Otherwise, just search user's personal docs (backward compatibility)
  if (organizationIds && organizationIds.length > 0) {
    // For vector stores that support OR queries, we'd pass both userId and organizationIds
    // For now, we'll filter by userId in the metadata and then filter results by org membership
    searchFilter.userId = userId;
    // Store orgIds in filter for later filtering
    searchFilter._orgIds = organizationIds;
  } else {
    searchFilter.userId = userId;
  }

  // Get more results than requested to account for filtering
  const expandedTopK = organizationIds && organizationIds.length > 0 ? topK * 3 : topK;
  const results = await vectorStore.search(query, expandedTopK, searchFilter);

  // Filter results by organization membership if needed
  if (organizationIds && organizationIds.length > 0) {
    return results.filter((result: any) => {
      // Personal document (userId matches, no orgId)
      if (result.metadata.userId === userId && !result.metadata.organizationId) {
        return true;
      }
      // Organization document (orgId in user's organizations)
      if (result.metadata.organizationId && organizationIds.includes(result.metadata.organizationId)) {
        return true;
      }
      return false;
    }).slice(0, topK);
  }

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

