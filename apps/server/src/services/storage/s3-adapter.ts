import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { StorageAdapter } from "@fileai/shared";
import { Readable } from "stream";

interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
}

export class S3Adapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;

    this.client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: !!config.endpoint, // Required for MinIO
    });
  }

  async upload(file: Buffer, path: string, contentType?: string): Promise<string> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: path,
        Body: file,
        ContentType: contentType,
      },
    });

    await upload.done();

    return path;
  }

  async download(path: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    const response = await this.client.send(command);

    if (!response.Body) {
      throw new Error("File not found");
    }

    // Convert stream to buffer
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  async delete(path: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: path,
    });

    await this.client.send(command);
  }

  async getUrl(path: string): Promise<string> {
    // For S3, return the public URL
    // For MinIO or custom endpoint, construct the URL
    if (this.client.config.endpoint) {
      const endpoint = await this.client.config.endpoint();
      return `${endpoint.protocol}//${endpoint.hostname}:${endpoint.port}/${this.bucket}/${path}`;
    }

    return `https://${this.bucket}.s3.amazonaws.com/${path}`;
  }
}

