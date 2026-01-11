# FileAI

**AI-powered document management and intelligent search system**

[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/hashcott/fileai)](https://github.com/hashcott/fileai/releases)
[![Build Status](https://img.shields.io/github/actions/workflow/status/hashcott/fileai/ci.yml?branch=main)](https://github.com/hashcott/fileai/actions)

---

## Overview

FileAI is a powerful open-source document management system that uses RAG (Retrieval Augmented Generation) to provide intelligent search and Q&A capabilities across your documents. Upload PDFs, Word documents, and text files, then ask questions in natural language to get AI-powered answers with source citations.

![FileAI Screenshot](docs/assets/screenshot.png)

## Features

| Feature | Description |
|---------|-------------|
| **Multi-Format Support** | Process PDF, DOCX, DOC, XML, and TXT files with automatic text extraction |
| **Semantic Search** | Find documents by meaning using vector embeddings and Qdrant |
| **AI-Powered Q&A** | Get intelligent answers using RAG with Ollama or OpenAI |
| **Flexible Storage** | Store files locally, on S3, or self-hosted MinIO |
| **Secure by Default** | JWT authentication and role-based access control |
| **Modern UI** | Beautiful interface built with Next.js 14 and shadcn/ui |
| **Easy Setup** | One-time setup wizard for quick configuration |
| **Extensible** | Plugin architecture for custom file processors and storage |

## Use Cases

- **Enterprise Knowledge Base** - Centralize company documents and enable instant search
- **Research Assistant** - Upload papers and ask questions across your library
- **Legal Document Analysis** - Search through contracts and legal documents
- **Personal Document Manager** - Organize and search your personal files with AI

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 14, React 19, TailwindCSS, shadcn/ui |
| **Backend** | Node.js, Express, tRPC |
| **AI/ML** | LangChain.js, Ollama, OpenAI |
| **Database** | MongoDB (metadata), Qdrant (vectors) |
| **Storage** | S3 / MinIO / Local filesystem |
| **DevOps** | Docker, Docker Compose, Turborepo |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22.0.0
- [Docker](https://www.docker.com/) and Docker Compose
- [Ollama](https://ollama.ai/) (optional, for local AI)

### Installation

```bash
# Clone the repository
git clone https://github.com/hashcott/fileai.git
cd fileai

# Run setup script
npm run setup

# Start services (MongoDB, Qdrant, MinIO)
npm run services:start

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and complete the setup wizard.

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Project Structure

```
fileai/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   └── lib/               # Utilities and stores
│   └── server/                # Node.js backend
│       ├── routers/           # tRPC routers
│       ├── services/          # Business logic
│       └── db/                # Database models
├── packages/
│   ├── shared/                # Shared types and schemas
│   └── config/                # Shared configurations
├── docker-compose.yml         # Docker services
├── turbo.json                 # Turborepo config
└── package.json               # Root package
```

## Configuration

### Environment Variables

**Backend** (`apps/server/.env`):

```env
# Database
MONGODB_URI=mongodb://localhost:27017/fileai
JWT_SECRET=your-super-secret-key
QDRANT_URL=http://localhost:6333

# LLM Provider
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# Or use OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-...
# OPENAI_MODEL=gpt-4-turbo-preview
```

**Frontend** (`apps/web/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/trpc
```

### Storage Options

| Option | Description | Best For |
|--------|-------------|----------|
| `local` | Local filesystem | Development, small deployments |
| `s3` | Amazon S3 | Production, cloud deployments |
| `minio` | Self-hosted S3 | Self-hosted, data sovereignty |

### LLM Options

| Provider | Models | Notes |
|----------|--------|-------|
| Ollama | llama3, mistral, qwen, etc. | Free, runs locally |
| OpenAI | gpt-4o, gpt-4-turbo, gpt-3.5-turbo | Paid, cloud-based |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check

# Clean build artifacts
npm run clean
```

## Extending FileAI

### Adding a File Processor

```typescript
// apps/server/src/services/processors/my-processor.ts
import { FileProcessor, ProcessedDocument } from "@fileai/shared";

export class MyProcessor implements FileProcessor {
  supportedTypes = ["application/x-myformat"];
  
  async process(file: Buffer, filename: string): Promise<ProcessedDocument> {
    const text = extractTextFromFile(file);
    return {
      text,
      metadata: { filename, format: "myformat" },
    };
  }
}
```

### Adding a Storage Adapter

```typescript
// apps/server/src/services/storage/my-storage.ts
import { StorageAdapter } from "@fileai/shared";

export class MyStorageAdapter implements StorageAdapter {
  async upload(file: Buffer, path: string): Promise<string> {
    // Implementation
  }
  async download(path: string): Promise<Buffer> {
    // Implementation
  }
  async delete(path: string): Promise<void> {
    // Implementation
  }
}
```

## Contributing

We love contributions! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a Pull Request.

### Ways to Contribute

- **Report Bugs** - Open an issue with detailed reproduction steps
- **Suggest Features** - Share your ideas in Discussions
- **Improve Docs** - Help us make documentation better
- **Submit PRs** - Fix bugs or add new features

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Commit: `git commit -m 'feat: add amazing feature'`
6. Push: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Roadmap

- [x] Multi-format document support (PDF, DOCX, XML, TXT)
- [x] Vector search with Qdrant
- [x] Ollama and OpenAI integration
- [x] Role-based access control
- [ ] OCR support with Tesseract
- [ ] Multi-language support
- [ ] Document collaboration features
- [ ] API rate limiting
- [ ] Webhook notifications
- [ ] Mobile app

See the [open issues](https://github.com/hashcott/fileai/issues) for a full list of proposed features.

## Documentation

- [Setup Guide](./SETUP_GUIDE.md) - Detailed installation instructions
- [Project Summary](./PROJECT_SUMMARY.md) - Architecture overview
- [API Reference](./docs/api.md) - API documentation

## License

This project is licensed under the **Apache License 2.0** - see the [LICENSE](LICENSE) file for details.

### Attribution Requirements

If you use FileAI, you must:

1. **Keep the copyright notice** - Retain all copyright, patent, trademark, and attribution notices
2. **Include the NOTICE file** - Distribute a copy of the [NOTICE](NOTICE) file
3. **State changes** - If you modify the code, clearly indicate your modifications
4. **Credit FileAI** - Include attribution in your application (e.g., "Powered by FileAI")

```
Copyright 2026 FileAI Contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

## Acknowledgements

- [LangChain.js](https://github.com/langchain-ai/langchainjs) - AI/LLM framework
- [Qdrant](https://qdrant.tech/) - Vector database
- [Ollama](https://ollama.ai/) - Local LLM runner
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Next.js](https://nextjs.org/) - React framework
- [tRPC](https://trpc.io/) - Type-safe APIs

## Community

- [GitHub Discussions](https://github.com/hashcott/fileai/discussions) - Ask questions, share ideas
- [Discord Server](https://discord.gg/fileai) - Chat with the community

---

**Made with love by the FileAI community**

[Star us on GitHub](https://github.com/hashcott/fileai) if you find this project useful!
