import { FileProcessor, ProcessedDocument } from "@fileai/shared";

export class TextProcessor implements FileProcessor {
  supportedTypes = ["text/plain"];

  async process(file: Buffer, filename: string): Promise<ProcessedDocument> {
    try {
      const text = file.toString("utf-8");

      return {
        text,
        metadata: {
          encoding: "utf-8",
        },
      };
    } catch (error) {
      console.error("Text processing error:", error);
      throw new Error(`Failed to process text file: ${error}`);
    }
  }
}

