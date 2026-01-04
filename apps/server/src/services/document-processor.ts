import { Document } from "../db/models/Document";
import { getStorageAdapter } from "./storage";
import { getProcessorForFile } from "./processors";
import { storeInVectorDB } from "./vector-service";
import path from "path";

export async function processDocument(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  userId: string
) {
  // Generate a temporary ID for the file path
  const tempId = new Date().getTime().toString();
  const filePath = `${userId}/${tempId}/${filename}`;

  try {
    // 1. Store original file first
    const storage = await getStorageAdapter();
    await storage.upload(fileBuffer, filePath, mimeType);

    // 2. Create document record with the path
    const document = await Document.create({
      userId,
      filename,
      mimeType,
      size: fileBuffer.length,
      originalPath: filePath,
      processingStatus: "processing",
    });

    // 3. Process file to extract text
    const processor = getProcessorForFile(mimeType);
    if (!processor) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    const processed = await processor.process(fileBuffer, filename);

    // Update document with processed data
    document.textContent = processed.text;
    document.pageCount = processed.pageCount;
    document.metadata = processed.metadata;
    await document.save();

    // 4. Store in vector database
    await storeInVectorDB(document._id.toString(), processed.text, {
      userId,
      filename,
      documentId: document._id.toString(),
    });

    // 5. Mark as completed
    document.processingStatus = "completed";
    await document.save();

    return {
      id: document._id.toString(),
      filename: document.filename,
      processingStatus: document.processingStatus,
    };
  } catch (error) {
    console.error("Document processing error:", error);

    // Try to get the document if it was created
    // and mark as failed, otherwise just throw
    throw new Error(
      error instanceof Error ? error.message : String(error)
    );
  }
}

