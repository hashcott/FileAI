import { FileProcessor, ProcessedDocument } from "@fileai/shared";
import { XMLParser } from "fast-xml-parser";

export class XMLProcessor implements FileProcessor {
  supportedTypes = ["application/xml", "text/xml"];

  async process(file: Buffer, filename: string): Promise<ProcessedDocument> {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
      });

      const xmlText = file.toString("utf-8");
      const jsonObj = parser.parse(xmlText);

      // Convert JSON to readable text
      const text = this.jsonToText(jsonObj);

      return {
        text,
        metadata: {
          originalXml: xmlText.substring(0, 1000), // Store first 1000 chars
        },
      };
    } catch (error) {
      console.error("XML processing error:", error);
      throw new Error(`Failed to process XML: ${error}`);
    }
  }

  private jsonToText(obj: any, indent = 0): string {
    let text = "";
    const spaces = "  ".repeat(indent);

    if (typeof obj === "string" || typeof obj === "number") {
      return obj.toString();
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.jsonToText(item, indent)).join("\n");
    }

    if (typeof obj === "object") {
      for (const [key, value] of Object.entries(obj)) {
        if (key.startsWith("@_")) continue; // Skip attributes

        if (typeof value === "object") {
          text += `${spaces}${key}:\n${this.jsonToText(value, indent + 1)}\n`;
        } else {
          text += `${spaces}${key}: ${value}\n`;
        }
      }
    }

    return text;
  }
}

