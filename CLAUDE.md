# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript Clean Architecture implementation called "IPoster" - a fictional application that allows users to publish posts. The project demonstrates Clean Architecture principles with clear separation between Core (domain/business logic), Infrastructure (external concerns), and Application (HTTP/REST API) layers.

## Common Commands

### Development
- **Build**: `npm run build` - Runs custom build script that compiles TypeScript, copies package files, and installs production dependencies
- **Start**: `npm run start` - Starts the compiled application
- **Start Local**: `npm run start:local` - Copies local environment file and starts with dotenv config
- **Lint**: `npm run lint` - ESLint check on src and test directories
- **Lint Fix**: `npm run lint:fix` - Auto-fix linting issues

### Testing
- **Run Tests**: `npm run test` - Jest tests with custom configuration
- **Test Coverage**: `npm run test:cov` - Jest with coverage reports
- **Test Environment**: `docker-compose -f docker-compose.test.yaml up -d` - Start test dependencies (PostgreSQL, Minio)

### Database
- **Create Migration**: `npm run migration:create -- [MigrationName]`
- **Revert Migration**: `npm run migration:revert`

### Library Management
- **Check Updates**: `npm run lib:check` - Show available library updates
- **Upgrade Libraries**: `npm run lib:upgrade` - Update all libraries

## Architecture Overview

### Layer Structure
The application follows a 4-layer Clean Architecture:

1. **Core** (`src/core/`) - Domain logic and business rules
   - `common/` - Shared utilities, base classes, exceptions
   - `domain/` - Domain entities, use cases, and business logic for User, Post, Media
   - `service/` - Application services implementing domain use cases

2. **Infrastructure** (`src/infrastructure/`) - External concerns and adapters
   - `adapter/` - Database (TypeORM), file storage (Minio), message bus adapters
   - `config/` - Configuration classes for API server, database, file storage
   - `transaction/` - Transactional use case wrappers

3. **Application** (`src/application/`) - HTTP API layer
   - `api/http-rest/` - REST controllers, authentication, documentation models
   - `di/` - Dependency injection modules

### Key Architectural Patterns

- **CQRS**: Command Query Responsibility Segregation with separate handlers
- **Ports & Adapters**: Interfaces define contracts, adapters implement external systems
- **Dependency Injection**: NestJS DI container with custom tokens in `CoreDITokens`
- **Repository Pattern**: Domain repositories with TypeORM adapters
- **Use Case Pattern**: Each business operation is a separate use case class

### Message Bus System (CQRS Implementation)

The project implements CQRS through three message buses managed by NestJS:

#### **QueryBus** - Cross-Domain Data Queries
- **Purpose**: Handle read operations that cross domain boundaries
- **Usage**: `await this.queryBus.sendQuery(QueryObject.new(params))`
- **Example**: Post domain querying Media domain for image existence validation
- **Benefits**: 
  - Maintains domain boundaries and loose coupling
  - Enables specialized query optimization in target domain
  - Supports permission checks within query handlers
  - Avoids direct cross-domain repository dependencies

```typescript
// Example: CreatePostService querying Media domain
const mediaPreview = await this.queryBus.sendQuery(
  GetMediaPreviewQuery.new({id: payload.imageId, ownerId: payload.executorId})
);
```

#### **EventBus** - Asynchronous Domain Events  
- **Purpose**: Handle side effects and cross-domain notifications
- **Usage**: `await this.eventBus.sendEvent(EventObject.new(params))`
- **Example**: Media removal triggering post image cleanup
- **Benefits**:
  - Decoupled event-driven communication
  - Asynchronous processing of side effects
  - Support for multiple event handlers per event

```typescript
// Example: RemoveMediaService notifying other domains
await this.eventBus.sendEvent(MediaRemovedEvent.new(mediaId, ownerId, type));
```

#### **CommandBus** - Command Processing
- **Note**: In this project, Use Cases serve as Command handlers directly
- Commands are processed through direct Use Case invocation from Controllers
- This simplifies the architecture while maintaining CQRS principles

#### **Message Bus Architecture Layers**
1. **Core Layer**: Defines abstract `QueryBusPort`, `EventBusPort` interfaces
2. **Infrastructure Layer**: Implements adapters (`NestQueryBusAdapter`, `NestEventBusAdapter`)
3. **Handler Layer**: Two-tier system
   - `@infrastructure/handler`: NestJS CQRS integration wrappers
   - `@core/service/handler`: Business logic implementations

#### **Cross-Domain Query Rules**
- **Avoid Direct Repository Access**: Never inject repositories from other domains
- **Use QueryBus for Cross-Domain Reads**: Always use message bus for cross-domain data access
- **Include Permission Context**: Queries should include user/permission context (e.g., `ownerId`)
- **Return Minimal Data**: Query results should contain only necessary data for the requesting domain

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

#### **`handler/`** - Query Handlers (CQRS)
- Implements query-side of CQRS pattern
- Example: `DoesMediaExistQueryHandler.ts` - Handles existence checks
- Separate from use cases to maintain command/query separation

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
2. Install dependencies: `npm install`
3. Build application: `npm run build`
4. Start with local config: `npm run start:local`
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