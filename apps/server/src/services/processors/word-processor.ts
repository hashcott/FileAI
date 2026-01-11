import { FileProcessor, ProcessedDocument } from "@fileai/shared";
import mammoth from "mammoth";

export class WordProcessor implements FileProcessor {
  supportedTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "application/msword", // .doc
  ];

  async process(file: Buffer, filename: string): Promise<ProcessedDocument> {
    try {
      const result = await mammoth.extractRawText({ buffer: file });

      return {
        text: result.value,
        metadata: {
          messages: result.messages,
        },
      };
    } catch (error) {
      console.error("Word processing error:", error);
      throw new Error(`Failed to process Word document: ${error}`);
    }
  }
}

