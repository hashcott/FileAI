import { FileProcessor, ProcessedDocument } from "@fileai/shared";
import pdf from "pdf-parse";

export class PDFProcessor implements FileProcessor {
  supportedTypes = ["application/pdf"];

  async process(file: Buffer, filename: string): Promise<ProcessedDocument> {
    try {
      // First try with pdf-parse
      const data = await pdf(file);

      return {
        text: data.text,
        pageCount: data.numpages,
        metadata: {
          info: data.info,
          version: data.version,
        },
      };
    } catch (error) {
      console.error("PDF parsing error:", error);

      // TODO: Fallback to OCR with Ollama or Deepseek
      // For now, throw the error
      throw new Error(`Failed to process PDF: ${error}`);
    }
  }

  // TODO: Implement OCR fallback
  private async processWithOCR(file: Buffer): Promise<ProcessedDocument> {
    // This would call Ollama OCR or Deepseek OCR API
    // For now, return empty
    throw new Error("OCR not implemented yet");
  }
}

