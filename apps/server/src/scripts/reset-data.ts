import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { QdrantClient } from '@qdrant/js-client-rest';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import fs from 'fs/promises';
import path from 'path';
import { SystemConfig } from '../db/models/SystemConfig';
import { connectDatabase } from '../db/connection';

dotenv.config();

async function resetData() {
  console.log('Starting data reset...');

  try {
    // 1. Connect to MongoDB to get config
    // We use a separate connection handling here because connectDatabase might rely on env vars we want to override or check
    await connectDatabase();
    
    // Check if we can access the config
    let config = null;
    try {
      config = await SystemConfig.findOne();
    } catch (err) {
      console.warn('Could not fetch SystemConfig, proceeding with environment variables/defaults.', err);
    }

    // 2. Reset Vector Database (Qdrant)
    console.log('Resetting Vector Database...');
    let qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    let qdrantApiKey = process.env.QDRANT_API_KEY;
    let collectionName = 'documents';

    if (config?.vectorDB?.type === 'qdrant') {
      qdrantUrl = config.vectorDB.config.url || qdrantUrl;
      qdrantApiKey = config.vectorDB.config.apiKey || qdrantApiKey;
      collectionName = config.vectorDB.config.collectionName || 'documents';
    }

    try {
      const qdrantClient = new QdrantClient({
        url: qdrantUrl,
        apiKey: qdrantApiKey,
      });
      
      // We don't have a check for existence easily without throwing, so we just try to delete
      const result = await qdrantClient.deleteCollection(collectionName);
      if (result) {
        console.log(`Deleted Qdrant collection: ${collectionName}`);
      } else {
         console.log(`Qdrant collection ${collectionName} not found or already deleted.`);
      }
    } catch (error: any) {
      // Qdrant client might throw if collection doesn't exist or connection fails
      if (error?.status === 404 || error?.message?.includes('Not Found')) {
          console.log(`Qdrant collection ${collectionName} did not exist.`);
      } else {
          console.warn('Failed to delete Qdrant collection (check connection):', error.message);
      }
    }

    // 3. Reset Storage (S3/MinIO/Local)
    console.log('Resetting Storage...');
    
    // Determine storage config
    const storageType = config?.storage?.type || process.env.STORAGE_TYPE || 'local';
    
    if (storageType === 'local') {
      const localPath = config?.storage?.config?.localPath || process.env.LOCAL_STORAGE_PATH || './uploads';
      const absolutePath = path.resolve(process.cwd(), localPath);
      
      try {
        // Check if directory exists
        await fs.access(absolutePath);
        // Remove directory and its contents
        await fs.rm(absolutePath, { recursive: true, force: true });
        // Recreate the directory
        await fs.mkdir(absolutePath, { recursive: true });
        console.log(`Cleared local storage at: ${absolutePath}`);
      } catch (error: any) {
         if (error.code !== 'ENOENT') {
             console.warn(`Failed to clear local storage at ${absolutePath}:`, error.message);
         } else {
             console.log(`Local storage directory ${absolutePath} does not exist, created it.`);
             await fs.mkdir(absolutePath, { recursive: true });
         }
      }
    } else if (storageType === 's3' || storageType === 'minio') {
      const s3Config = config?.storage?.config || {
        bucket: process.env.S3_BUCKET || 'fileai',
        region: process.env.S3_REGION || 'us-east-1',
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        endpoint: process.env.S3_ENDPOINT,
      };

      if (s3Config.accessKeyId && s3Config.secretAccessKey && s3Config.bucket) {
          try {
            const s3Client = new S3Client({
                region: s3Config.region,
                credentials: {
                    accessKeyId: s3Config.accessKeyId,
                    secretAccessKey: s3Config.secretAccessKey,
                },
                endpoint: s3Config.endpoint,
                forcePathStyle: !!s3Config.endpoint, // true for MinIO
            });

            // List all objects
            let continuationToken: string | undefined;
            let deletedCount = 0;
            do {
                const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
                    Bucket: s3Config.bucket,
                    ContinuationToken: continuationToken,
                });
                const listResult = await s3Client.send(listCommand);

                if (listResult.Contents && listResult.Contents.length > 0) {
                    const deleteCommand = new DeleteObjectsCommand({
                        Bucket: s3Config.bucket,
                        Delete: {
                            Objects: listResult.Contents.map((obj: any) => ({ Key: obj.Key })),
                        },
                    });
                    await s3Client.send(deleteCommand);
                    deletedCount += listResult.Contents.length;
                }

                continuationToken = listResult.NextContinuationToken;
            } while (continuationToken);
            
            console.log(`Cleared S3 bucket: ${s3Config.bucket} (${deletedCount} objects deleted)`);
          } catch (error: any) {
              console.warn('Failed to clear S3 bucket:', error.message);
          }
      } else {
          console.warn('S3 credentials missing, skipping storage reset.');
      }
    }

    // 4. Drop MongoDB Database
    console.log('Dropping MongoDB Database...');
    if (mongoose.connection.db) {
        await mongoose.connection.db.dropDatabase();
        console.log('MongoDB Database dropped.');
    } else {
        console.error('MongoDB connection not established properly.');
    }

    console.log('Data reset complete!');
  } catch (error) {
    console.error('Data reset failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

resetData();
