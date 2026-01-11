import { FileProcessor } from "@fileai/shared";
import { PDFProcessor } from "./pdf-processor";
import { WordProcessor } from "./word-processor";
import { XMLProcessor } from "./xml-processor";
import { TextProcessor } from "./text-processor";

const processors: FileProcessor[] = [
  new PDFProcessor(),
  new WordProcessor(),
  new XMLProcessor(),
  new TextProcessor(),
];

export function getProcessorForFile(mimeType: string): FileProcessor | null {
  for (const processor of processors) {
    if (processor.supportedTypes.includes(mimeType)) {
      return processor;
    }
  }
  return null;
}

export function getAllProcessors(): FileProcessor[] {
  return processors;
}

export function getSupportedMimeTypes(): string[] {
  return processors.flatMap((p) => p.supportedTypes);
}

