# Setup Guide - FileAI

## Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (recommended)
- (Optional) Ollama for local LLM

### 1. Clone and Install

```bash
git clone <your-repo>
cd fileai
npm run setup
```

This script will:
- Install all dependencies
- Create `.env` files from examples
- Check for Docker

### 2. Start Supporting Services

**Option A: Using Docker (Recommended)**

```bash
npm run services:start
```

This starts:
- MongoDB on `localhost:27017`
- Qdrant on `localhost:6333`
- MinIO on `localhost:9000` (Console: `localhost:9001`)

**Option B: Manual Installation**

Install and configure each service manually:
- [MongoDB](https://www.mongodb.com/try/download/community)
- [Qdrant](https://qdrant.tech/documentation/quick-start/)
- [MinIO](https://min.io/download) or use AWS S3

### 3. (Optional) Setup Ollama for Local LLM

```bash
# Install Ollama from https://ollama.ai

# Pull models
ollama pull llama3
ollama pull nomic-embed-text
```

For OpenAI instead, you'll configure the API key in the setup wizard.

### 4. Start Development Server

```bash
npm run dev
```

This starts:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### 5. Complete Setup Wizard

1. Open http://localhost:3000/setup
2. Configure:
   - Database connection
   - Storage (local/S3/MinIO)
   - Vector database (Qdrant)
   - LLM provider (Ollama/OpenAI)
   - Embedding provider

3. Click "Finish Setup"

### 6. Create Your Account

After setup, you'll be redirected to create the first user account.

## Production Deployment

### Using Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MongoDB: localhost:27017
- Qdrant: http://localhost:6333
- MinIO: http://localhost:9000

### Environment Variables

#### Backend (`apps/server/.env`)

```env
# Database
MONGODB_URI=mongodb://localhost:27017/fileai

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-key-change-this

# Server
PORT=3001
NODE_ENV=production

# Vector DB
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# Storage
STORAGE_TYPE=local # or s3, minio
LOCAL_STORAGE_PATH=./uploads

# S3/MinIO (if using)
S3_BUCKET=fileai
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT= # For MinIO: http://localhost:9000

# LLM - Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# LLM - OpenAI (optional)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Default providers
LLM_PROVIDER=ollama
EMBEDDING_PROVIDER=ollama
```

#### Frontend (`apps/web/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/trpc
```

## Architecture

### File Processing Flow

1. User uploads file (PDF, DOCX, XML, TXT)
2. File is stored in configured storage (S3/MinIO/Local)
3. Text is extracted using appropriate processor
4. Text is chunked and embedded
5. Embeddings are stored in Qdrant
6. Metadata is stored in MongoDB

### Search/RAG Flow

1. User submits query
2. Query is embedded using configured model
3. Similar chunks are retrieved from Qdrant
4. Context is built from relevant chunks
5. LLM generates answer with sources
6. Answer and sources are returned to user

## Extending the System

### Adding New File Processors

1. Create new processor in `apps/server/src/services/processors/`
2. Implement `FileProcessor` interface
3. Register in `processors/index.ts`

Example:

```typescript
export class NewFormatProcessor implements FileProcessor {
  supportedTypes = ["application/new-format"];
  
  async process(file: Buffer, filename: string): Promise<ProcessedDocument> {
    // Your processing logic
    return {
      text: extractedText,
      metadata: { ... },
    };
  }
}
```

### Adding New Storage Adapters

1. Create new adapter in `apps/server/src/services/storage/`
2. Implement `StorageAdapter` interface
3. Register in `storage/index.ts`

### Adding New Vector Stores

1. Create new adapter in `apps/server/src/services/vector/`
2. Implement `VectorStoreAdapter` interface
3. Register in `vector/index.ts`

## Troubleshooting

### MongoDB Connection Issues

```bash
# Check if MongoDB is running
docker-compose ps mongodb

# View MongoDB logs
docker-compose logs mongodb
```

### Qdrant Issues

```bash
# Check Qdrant status
curl http://localhost:6333/health

# View Qdrant logs
docker-compose logs qdrant
```

### Ollama Issues

```bash
# Check if Ollama is running
curl http://localhost:11434/api/version

# List available models
ollama list

# Pull missing models
ollama pull llama3
ollama pull nomic-embed-text
```

### File Upload Failures

1. Check file size (max 50MB)
2. Check supported formats (PDF, DOCX, XML, TXT)
3. View backend logs for processing errors
4. Ensure storage is configured correctly

## Useful Commands

```bash
# Development
npm run dev              # Start dev servers
npm run build           # Build all packages
npm run lint            # Run linters
npm run type-check      # Check TypeScript

# Docker Services
npm run services:start  # Start MongoDB, Qdrant, MinIO
npm run services:stop   # Stop services
npm run docker:up       # Start all services (including app)
npm run docker:down     # Stop all services
npm run docker:logs     # View logs

# Cleanup
npm run clean          # Clean build artifacts
docker-compose down -v # Remove all containers and volumes
```

## Support

For issues and questions:
- Check the troubleshooting section above
- Review logs: `npm run docker:logs`
- Open an issue on GitHub

## Security Notes

1. **Change the JWT_SECRET** in production!
2. Use strong passwords for services
3. Enable authentication on Qdrant in production
4. Use HTTPS in production
5. Regularly update dependencies
6. Don't commit `.env` files to git

## Performance Tips

1. Use OpenAI embeddings for better quality (but costs money)
2. Adjust `CHUNK_SIZE` and `CHUNK_OVERLAP` for your documents
3. Increase `topK` for more context (but slower)
4. Use local Ollama for free inference
5. Consider using GPU for faster Ollama performance

## License

MIT

