# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Clean Architecture implementation called "IPoster" - a fictional application that allows users to publish posts. The project demonstrates Clean Architecture principles with clear separation between Core (domain/business logic), Infrastructure (external concerns), and Application (HTTP/REST API) layers.

## Common Commands

### Development
- **Build**: `pnpm run build` - Runs custom build script that compiles TypeScript, copies package files, and installs production dependencies
- **Start**: `pnpm run start` - Starts the compiled application
- **Start Local**: `pnpm run start:local` - Copies local environment file and starts with dotenv config
- **Development Server**: `pnpm run dev` - Start development server with nodemon for hot reload
- **Development Debug**: `pnpm run dev:debug` - Start development server with debugging enabled
- **Lint**: `pnpm run lint` - ESLint check on src and test directories
- **Lint Fix**: `pnpm run lint:fix` - Auto-fix linting issues

### Testing
- **Run Unit Tests**: `pnpm run test` - Jest unit tests only (test/unit directory)
- **Unit Test Coverage**: `pnpm run test:cov` - Unit tests with coverage reports
- **Run E2E Tests**: `pnpm run test:e2e` - End-to-end tests only (test/e2e directory)
- **Run All Tests**: `pnpm run test:all` - Both unit and E2E tests
- **Test Environment**: `docker-compose -f docker-compose.test.yaml up -d` - Start test dependencies (PostgreSQL, Minio)
- **Run Single Test**: `pnpm run test -- --testNamePattern="TestName"` - Run specific test by name
- **Run Test File**: `pnpm run test path/to/test.spec.ts` - Run specific test file

### Database
- **Generate Prisma Client**: `pnpm run db:generate` - Generate Prisma client from schema
- **Run Migrations**: `pnpm run db:migrate` - Run database migrations in dev
- **Push Schema**: `pnpm run db:push` - Push schema changes to database
- **Database Studio**: `pnpm run db:studio` - Open Prisma Studio GUI

### Library Management
- **Check Updates**: `pnpm run lib:check` - Show available library updates
- **Upgrade Libraries**: `pnpm run lib:upgrade` - Update all libraries

### Docker Services
- **Start Local Services**: `docker-compose -f docker-compose.local.yaml up -d` - PostgreSQL and Minio for development
- **Stop Local Services**: `docker-compose -f docker-compose.local.yaml down`
- **Start Test Services**: `docker-compose -f docker-compose.test.yaml up -d` - Test environment dependencies
- **Stop Test Services**: `docker-compose -f docker-compose.test.yaml down`

### Makefile Commands
Available via `make <command>`:
- **make help** - Show all available make commands
- **make install** - Install dependencies with pnpm
- **make build** - Build the project
- **make start** - Start the compiled application
- **make start-local** - Start with local environment
- **make dev** - Start development server
- **make lint** - Run linting
- **make lint-fix** - Run ESLint with auto-fix
- **make test** - Run unit tests only
- **make test-cov** - Run unit tests with coverage
- **make test-e2e** - Run E2E tests only
- **make test-all** - Run all tests (unit + E2E)
- **make migration-create** - Create new database migration (interactive)
- **make migration-revert** - Revert last migration
- **make lib-check** - Show available library updates
- **make lib-upgrade** - Update all libraries
- **make docker-local-up** - Start local Docker services (PostgreSQL, Minio)
- **make docker-local-down** - Stop local Docker services
- **make docker-test-up** - Start test Docker services
- **make docker-test-down** - Stop test Docker services
- **make clean** - Clean build artifacts and node_modules

## Architecture Overview

### Layer Structure
The application follows a 4-layer Clean Architecture:

1. **Core** (`src/core/`) - Domain logic and business rules
   - `common/` - Shared utilities, base classes, exceptions
   - `domain/` - Domain entities, business interfaces, and data contracts for User, Post, Media, Chat
     - `*/interface/` - Business operation contracts (e.g., CreateMediaInterface)
     - `*/port/dto/` - Data transfer objects (e.g., CreateMediaDto)
     - `*/port/persistence/` - Repository and storage interface contracts (e.g., MediaRepositoryPort)
   - `service/*/service/` - Application services implementing domain interfaces

2. **Infrastructure** (`src/infrastructure/`) - External concerns and adapters
   - `adapter/` - External system adapters
     - `persistence/` - Database (Prisma) and storage (Minio) adapters
     - `streaming/` - Server-Sent Events (SSE) adapters
     - `workflow/` - LangGraph workflow adapters
     - `validator/` - Data validation adapters (e.g., CreateMediaValidator)
   - `config/` - Configuration classes for API server, database, file storage, LLM
   - `transaction/` - Transactional use case wrappers

3. **Application** (`src/application/`) - HTTP API layer
   - `api/http-rest/` - REST controllers, authentication, documentation models
   - `di/` - Dependency injection modules

### Key Architectural Patterns

- **Ports & Adapters**: Interfaces define contracts, adapters implement external systems
- **Dependency Injection**: NestJS DI container with custom tokens in domain `DITokens`
- **Repository Pattern**: Domain repositories with Prisma adapters
- **Interface Pattern**: Each business operation is defined by an interface, implemented by services
- **Validation Pattern**: Infrastructure validators handle data validation and transformation

### Cross-Domain Communication

The project uses direct dependency injection for cross-domain communication:

- **Direct Repository Access**: Services directly inject repositories from other domains when needed
- **Example**: `CreatePostService` injects `MediaRepositoryPort` and `UserRepositoryPort` to validate media and user access
- **Transactional Consistency**: Cross-domain operations are handled within the same transaction using Prisma transaction wrapper

```typescript
// Example: CreatePostService accessing multiple domains
export class CreatePostService implements CreatePostInterface {
  constructor(
    private readonly postRepository: PostRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly mediaRepository: MediaRepositoryPort,
  ) {}
  
  // Direct cross-domain validation and data access
  const postOwner = await this.userRepository.findUser({id: payload.executorId});
  const postMedia = await this.mediaRepository.findMedia({id: payload.imageId});
}
```

### Path Aliases
- `@core/*` → `src/core/*`
- `@infrastructure/*` → `src/infrastructure/*` 
- `@application/*` → `src/application/*`
- `@test/*` → `test/*`

### Domain Models
- **User**: Guest or Author accounts with authentication
- **Post**: Draft/published posts with optional media attachments
- **Media**: File uploads managed by Authors
- **Chat**: AI-powered chat streams with LangGraph workflow integration

### Domain Directory Structure

Each domain module (e.g., `@src/core/domain/media`) follows a consistent structure:

#### **`di/`** - Dependency Injection Tokens
- Contains DI token definitions for the domain
- Example: `MediaDITokens.ts` defines symbols for interfaces, handlers, and repositories
- Ensures type-safe dependency injection across layers

#### **`entity/`** - Domain Entities  
- Core domain objects with business logic and validation
- Example: `Media.ts` - Rich domain entity with behavior methods (edit, remove)
- `type/` subdirectory contains entity payload interfaces (CreateMediaEntityPayload, EditMediaEntityPayload)
- Entities extend base classes (Entity, RemovableEntity) and use class-validator decorators

#### **`interface/`** - Business Operation Contracts
- Business use case interface definitions
- Example: `CreateMediaInterface.ts` extends TransactionalInterface
- Defines application boundaries and business operation contracts
- Services implement these interfaces for dependency inversion

#### **`port/`** - Interface Definitions (Hexagonal Architecture)
- **`dto/`** - Data Transfer Objects
  - Input/output data contracts (CreateMediaDto, StreamChatDto)
  - Enables dependency inversion principle for data structures
- **`persistence/`** - Repository and storage interface contracts
  - `MediaRepositoryPort.ts` - Data access interface
  - `MediaFileStoragePort.ts` - File storage interface

#### **`value-object/`** - Domain Value Objects
- Immutable objects representing domain concepts
- Example: `FileMetadata.ts` - Encapsulates file properties (path, size, mimetype)
- `type/` subdirectory contains value object payload types
- Follow DDD value object patterns with validation

## Development Environment

### Prerequisites
- Node.js ≥14
- Docker and Docker Compose for local services

### Local Setup
1. Start external services: `docker-compose -f docker-compose.local.yaml up -d`
2. Install dependencies: `pnpm install`
3. Build application: `pnpm run build`
4. Start with local config: `pnpm run start:local`
5. API docs available at: http://localhost:3005/documentation

### Testing Setup
- E2E tests use separate Docker environment: `docker-compose.test.yaml`
- Unit tests use Jest with custom configuration in `jest.json`
- Coverage reports generated in `.coverage/` directory

### File Organization
- **Database Schema**: `prisma/schema.prisma` - Prisma schema definition
- **Test Assets**: `test/e2e/asset/content/`
- **Environment Files**: `env/` directory with separate configs for local/test
- **Docker Configs**: Root level docker-compose files for different environments
- **LLM Workflows**: `src/infrastructure/adapter/workflow/langgraph/` - AI chat workflows

## Coding Standards

The project enforces strict TypeScript coding standards via ESLint configuration (`.eslintrc`):

### Type Safety Requirements
- **Explicit Type Declarations**: All member variables, properties, and variable declarations MUST have explicit type annotations (`@typescript-eslint/typedef`)
- **No Non-Null Assertions**: The `!` operator is forbidden in production code (`@typescript-eslint/no-non-null-assertion: "error"`)
  - Exception: Test files allow non-null assertions for test clarity
- **No `any` Types**: Explicit `any` types are prohibited (`@typescript-eslint/no-explicit-any: "error"`)
  - Exception: Test files allow `any` for testing flexibility

### Code Style Standards
- **Quotes**: Single quotes required (`quotes: ["error", "single"]`)
- **Indentation**: 2 spaces with special handling for member expressions (`indent: ["error", 2]`)
- **Semicolons**: Required at statement ends (`@typescript-eslint/semi: ["error", "always"]`)

### Type Declaration Examples
```typescript
// ✅ Correct - Explicit types required
private readonly userRepository: UserRepositoryPort;
public readonly id: string;
const result: CreateUserResult = await this.userService.create(payload);

// ❌ Incorrect - Missing type annotations
private readonly userRepository;
public readonly id;
const result = await this.userService.create(payload);

// ❌ Forbidden - Non-null assertion in production code
const user = await this.userRepository.findById(id)!;

// ✅ Correct - Proper null checking
const user: User | null = await this.userRepository.findById(id);
if (!user) {
  throw new UserNotFoundException();
}
```

### ESLint Overrides
- **Test Files** (`test/**/*`): Relaxed rules allowing non-null assertions and `any` types for testing convenience
- **Production Code**: Strict enforcement of all type safety rules

## Key Implementation Notes

- Uses Prisma ORM with PostgreSQL for persistence
- Minio for file storage
- Passport.js for JWT and local authentication
- NestJS as the HTTP framework
- Custom build script compiles to `dist/` with production dependencies
- Module aliases configured in both TypeScript and Jest configurations
- Transactional use cases use Prisma transactions with custom wrapper
- LangChain integration for potential AI features
- Jest testing with sonar reporter and junit output
- ESLint with TypeScript parser for code quality

## Build Process Details

The custom build script (`scripts/build.sh`) performs:
1. **Clear**: Removes existing dist/ directory
2. **Compile**: TypeScript compilation with skipLibCheck
3. **Copy**: Copies package.json and pnpm-lock.yaml to dist/
4. **Install**: Production dependencies installed in dist/ directory

This creates a self-contained dist/ folder ready for deployment.
- memory 尽量不要使用 unknown 进行类型标注