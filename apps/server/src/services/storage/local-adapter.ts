import { StorageAdapter } from "@fileai/shared";
import * as fs from "fs/promises";
import * as path from "path";

interface LocalConfig {
  localPath: string;
}

export class LocalAdapter implements StorageAdapter {
  private basePath: string;

  constructor(config: LocalConfig) {
    this.basePath = config.localPath;
    this.ensureBasePathExists();
  }

  private async ensureBasePathExists() {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error("Failed to create storage directory:", error);
    }
  }

  async upload(file: Buffer, filePath: string, contentType?: string): Promise<string> {
    const fullPath = path.join(this.basePath, filePath);
    const dir = path.dirname(fullPath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, file);

    return filePath;
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, filePath);
    return await fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.unlink(fullPath);
  }

  async getUrl(filePath: string): Promise<string> {
    // For local storage, return a relative path
    // In production, this should be a URL to a file serving endpoint
    return `/uploads/${filePath}`;
  }
}

