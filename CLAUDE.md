# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ICC (Intelligent Command Center) is a cloud control plane application built on Platformatic Runtime that provides intelligent management and monitoring of applications in Kubernetes environments. It features autoscaling, metrics collection, compliance monitoring, caching management, and scheduled job execution.

## Architecture

This is a microservices application with 12 services orchestrated through Platformatic Runtime:

- **main** - API gateway/composer that routes to all services
- **frontend** - React SPA 
- **control-plane** - Core application management and K8s integration
- **user-manager** - Authentication & user management (OAuth2, sessions)
- **activities** - Audit trails & activity logging
- **metrics** - Prometheus metrics collection & analysis
- **scaler** - Autoscaling algorithms & scaling decisions
- **cron** - Scheduled job management with leader election
- **compliance** - Rule-based compliance checking system
- **cache-manager** - Cache dependency management for Next.js apps
- **risk-service** - OpenTelemetry traces & risk assessment
- **risk-cold-storage** - Long-term storage and archival of risk data
- **trafficante** - Traffic analysis and routing optimization

## Tech Stack

- **Backend**: Node.js ≥20.18.0, Fastify, Platformatic Runtime
- **Frontend**: React 19, Vite, TailwindCSS, Zustand, D3.js
- **Database**: PostgreSQL (6 databases), Valkey (Redis-compatible)
- **Package Manager**: pnpm (workspace configuration)
- **Testing**: Borp (backend), Vitest (frontend)

## Essential Commands

### Development Setup
```bash
# Install dependencies
pnpm install

# Generate session encryption key (required for auth)
pnpm run generate:session:key:mac    # On macOS
pnpm run generate:session:key:linux  # On Linux

# Start databases
docker-compose --env-file /dev/null up -d

# Start all services in development mode
pnpm dev
```

### Running & Building
```bash
pnpm start          # Start all services (production mode)
pnpm build          # Build all services
pnpm test           # Run all tests in parallel
pnpm lint           # Lint all services
```

### Individual Service Development
```bash
cd services/<service-name>
npm start           # Start individual service
npm test            # Test individual service
npm run lint        # Lint individual service
```

## Database Setup

The application uses PostgreSQL with 6 separate databases, each with their own migration system:
- `user_manager`, `activities`, `control_plane`, `cron`, `compliance`, `scaler`

Migrations are handled by individual services using `@platformatic/sql-mapper`.

## Authentication

Uses `@fastify/secure-session` with encrypted cookies and OAuth2 providers (GitHub, Google). The session encryption key must be generated before development.

## Testing

- Backend services use Borp testing framework
- Frontend uses Vitest
- Tests run in parallel across services with `pnpm test`
- Individual service tests: `cd services/<name> && npm test`

## Client Generation

Services expose OpenAPI specs. Generate clients with:
```bash
platformatic client http://0.0.0.0:3042/<service-name> --name <service-name>
```

## Key Development Patterns

- Each service follows Platformatic conventions with `routes/`, `plugins/`, `migrations/`
- Frontend uses CSS Modules with TailwindCSS
- State management via Zustand store (`useICCStore.js`)
- WebSocket connections for real-time updates
- TypeScript definitions in `types/` directories
- Error handling through service-specific error classes in `lib/errors.js`