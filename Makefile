# Makefile for TypeScript Clean Architecture Project

.PHONY: help install build start start-local dev lint lint-fix test test-cov clean

# Default target
help:
	@echo "Available commands:"
	@echo "  install      - Install dependencies with pnpm"
	@echo "  build        - Build the project"
	@echo "  start        - Start the compiled application"
	@echo "  start-local  - Start with local environment configuration"
	@echo "  dev          - Start development server with nodemon"
	@echo "  lint         - Run ESLint checks"
	@echo "  lint-fix     - Run ESLint with auto-fix"
	@echo "  test         - Run tests"
	@echo "  test-cov     - Run tests with coverage"
	@echo "  clean        - Clean build artifacts"

# Dependencies
install:
	pnpm install

# Build
build:
	pnpm run build

# Start commands
start:
	pnpm run start

start-local:
	pnpm run start:local

dev:
	pnpm run dev

# Linting
lint:
	pnpm run lint

lint-fix:
	pnpm run lint:fix

# Testing
test:
	pnpm run test

test-cov:
	pnpm run test:cov

# Database migrations
migration-create:
	@read -p "Enter migration name: " name; \
	pnpm run migration:create -- $$name

migration-revert:
	pnpm run migration:revert

# Library management
lib-check:
	pnpm run lib:check

lib-upgrade:
	pnpm run lib:upgrade

# Docker services
docker-local-up:
	docker-compose -f docker-compose.local.yaml up -d

docker-local-down:
	docker-compose -f docker-compose.local.yaml down

docker-test-up:
	docker-compose -f docker-compose.test.yaml up -d

docker-test-down:
	docker-compose -f docker-compose.test.yaml down

# Clean
clean:
	rm -rf dist/
	rm -rf node_modules/
	rm -rf .coverage/