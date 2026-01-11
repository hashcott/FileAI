import { StorageAdapter } from "@fileai/shared";
import { S3Adapter } from "./s3-adapter";
import { LocalAdapter } from "./local-adapter";
import { SystemConfig } from "../../db/models/SystemConfig";

let storageInstance: StorageAdapter | null = null;

export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (storageInstance) {
    return storageInstance;
  }

  // Get config from database
  const config = await SystemConfig.findOne();

  if (!config || !config.storage) {
    // Default to local storage
    storageInstance = new LocalAdapter({
      localPath: process.env.LOCAL_STORAGE_PATH || "./uploads",
    });
    return storageInstance;
  }

  switch (config.storage.type) {
    case "s3":
    case "minio":
      storageInstance = new S3Adapter({
        bucket: config.storage.config.bucket!,
        region: config.storage.config.region || "us-east-1",
        accessKeyId: config.storage.config.accessKeyId!,
        secretAccessKey: config.storage.config.secretAccessKey!,
        endpoint: config.storage.config.endpoint,
      });
      break;

    case "local":
    default:
      storageInstance = new LocalAdapter({
        localPath: config.storage.config.localPath || "./uploads",
      });
      break;
  }

  return storageInstance;
}

// Reset storage instance (useful for config changes)
export function resetStorageAdapter() {
  storageInstance = null;
}

