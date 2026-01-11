# Contributing to FileAI

First off, thank you for considering contributing to FileAI! It's people like you that make FileAI such a great tool.

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

**Bug Report Template:**

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. Ubuntu 22.04]
 - Node.js version: [e.g. 22.0.0]
 - Browser: [e.g. Chrome 120]
 - FileAI version: [e.g. 1.0.0]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. Create an issue and provide the following information:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List any alternative solutions you've considered**

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code lints
6. Issue that pull request!

## Development Setup

### Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Docker and Docker Compose
- Git

### Getting Started

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/fileai.git
cd fileai

# Install dependencies
npm install

# Start development services
npm run services:start

# Run the development server
npm run dev
```

### Project Structure

```
fileai/
├── apps/
│   ├── web/          # Next.js frontend
│   └── server/       # Node.js backend
├── packages/
│   ├── shared/       # Shared types and schemas
│   └── config/       # Shared configurations
└── docs/             # Documentation
```

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types when possible
- Use interfaces for object shapes
- Use enums for fixed sets of values

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Maximum line length: 100 characters

### Naming Conventions

- **Files**: kebab-case (`user-service.ts`)
- **Classes**: PascalCase (`UserService`)
- **Functions/Variables**: camelCase (`getUserById`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_FILE_SIZE`)
- **Types/Interfaces**: PascalCase (`UserProfile`)

### Git Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests
- `chore`: Changes to build process or auxiliary tools

**Examples:**

```
feat(search): add semantic search functionality

Implement vector-based semantic search using Qdrant.
This allows users to search by meaning rather than keywords.

Closes #123
```

```
fix(upload): handle large file uploads correctly

- Increase timeout for large files
- Add progress indicator
- Fix memory leak in chunking

Fixes #456
```

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or changes

**Examples:**
- `feature/add-ocr-support`
- `fix/upload-timeout-issue`
- `docs/update-api-reference`

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place tests next to the code they test (`*.test.ts`)
- Use descriptive test names
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies

```typescript
describe('UserService', () => {
  describe('getUserById', () => {
    it('should return user when valid id is provided', async () => {
      // Arrange
      const userId = '123';
      const expectedUser = { id: '123', name: 'John' };
      
      // Act
      const result = await userService.getUserById(userId);
      
      // Assert
      expect(result).toEqual(expectedUser);
    });
  });
});
```

## Documentation

- Update README.md if you change functionality
- Add JSDoc comments to public APIs
- Update CHANGELOG.md for notable changes
- Include code examples where helpful

## Review Process

1. All submissions require review
2. We use GitHub pull requests for this purpose
3. Reviewers may ask for changes before merging
4. Once approved, maintainers will merge your PR

## Community

- [GitHub Discussions](https://github.com/hashcott/fileai/discussions) - Ask questions
- [Discord](https://discord.gg/fileai) - Real-time chat

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Our website (coming soon)

Thank you for contributing to FileAI!
