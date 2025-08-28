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
- **Run Tests**: `pnpm run test` - Jest tests with custom configuration
- **Test Coverage**: `pnpm run test:cov` - Jest with coverage reports
- **Test Environment**: `docker-compose -f docker-compose.test.yaml up -d` - Start test dependencies (PostgreSQL, Minio)
- **Run Single Test**: `pnpm run test -- --testNamePattern="TestName"` - Run specific test by name
- **Run Test File**: `pnpm run test path/to/test.spec.ts` - Run specific test file

### Database
- **Create Migration**: `pnpm run migration:create -- [MigrationName]`
- **Revert Migration**: `pnpm run migration:revert`

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
- **make start-local** - Start with local environment
- **make dev** - Start development server
- **make lint** - Run linting
- **make test** - Run tests
- **make clean** - Clean build artifacts and node_modules

## Architecture Overview

### Layer Structure
The application follows a 4-layer Clean Architecture:

1. **Core** (`src/core/`) - Domain logic and business rules
   - `common/` - Shared utilities, base classes, exceptions
   - `domain/` - Domain entities, use cases, and business logic for User, Post, Media
   - `service/` - Application services implementing domain use cases

2. **Infrastructure** (`src/infrastructure/`) - External concerns and adapters
   - `adapter/` - Database (TypeORM), file storage (Minio) adapters
   - `config/` - Configuration classes for API server, database, file storage
   - `transaction/` - Transactional use case wrappers

3. **Application** (`src/application/`) - HTTP API layer
   - `api/http-rest/` - REST controllers, authentication, documentation models
   - `di/` - Dependency injection modules

### Key Architectural Patterns

- **Ports & Adapters**: Interfaces define contracts, adapters implement external systems
- **Dependency Injection**: NestJS DI container with custom tokens in `CoreDITokens`
- **Repository Pattern**: Domain repositories with TypeORM adapters
- **Use Case Pattern**: Each business operation is a separate use case class

### Cross-Domain Communication

The project uses direct dependency injection for cross-domain communication:

- **Direct Repository Access**: Services directly inject repositories from other domains when needed
- **Example**: `CreatePostService` injects `MediaRepositoryPort` and `UserRepositoryPort` to validate media and user access
- **Transactional Consistency**: Cross-domain operations are handled within the same transaction using `typeorm-transactional-cls-hooked`

```typescript
// Example: CreatePostService accessing multiple domains
export class CreatePostService implements CreatePostUseCase {
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

### Domain Directory Structure

Each domain module (e.g., `@src/core/domain/media`) follows a consistent structure:

#### **`di/`** - Dependency Injection Tokens
- Contains DI token definitions for the domain
- Example: `MediaDITokens.ts` defines symbols for use cases, handlers, and repositories
- Ensures type-safe dependency injection across layers

#### **`entity/`** - Domain Entities  
- Core domain objects with business logic and validation
- Example: `Media.ts` - Rich domain entity with behavior methods (edit, remove)
- `type/` subdirectory contains entity payload interfaces (CreateMediaEntityPayload, EditMediaEntityPayload)
- Entities extend base classes (Entity, RemovableEntity) and use class-validator decorators


#### **`port/`** - Interface Definitions (Hexagonal Architecture)
- **`persistence/`** - Repository and storage interface contracts
  - `MediaRepositoryPort.ts` - Data access interface
  - `MediaFileStoragePort.ts` - File storage interface  
- **`usecase/`** - Use case input/output contracts
  - Port interfaces define use case boundaries (CreateMediaPort, EditMediaPort)
  - Enables dependency inversion principle

#### **`usecase/`** - Use Case Interfaces
- Business operation contracts
- Example: `CreateMediaUseCase.ts` extends TransactionalUseCase
- `dto/` subdirectory contains data transfer objects (MediaUseCaseDto)
- Defines application boundaries and use case contracts

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
- **Migrations**: `src/infrastructure/adapter/persistence/typeorm/migration/`
- **Test Assets**: `test/e2e/asset/content/`
- **Environment Files**: `env/` directory with separate configs for local/test
- **Docker Configs**: Root level docker-compose files for different environments

## Key Implementation Notes

- Uses TypeORM with PostgreSQL for persistence
- Minio for file storage
- Passport.js for JWT and local authentication
- NestJS as the HTTP framework
- Custom build script compiles to `dist/` with production dependencies
- Module aliases configured in both TypeScript and Jest configurations
- Transactional use cases use `typeorm-transactional-cls-hooked`
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