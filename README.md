# Intelligent Command Center (OSS)

Open-source intelligent command center for cloud application management built on Platformatic Runtime.

## Overview

The Intelligent Command Center provides a comprehensive platform for managing and monitoring cloud applications with intelligent features including:

- **Application Management** - Deploy and manage applications across Kubernetes environments
- **Monitoring & Metrics** - Real-time performance monitoring and health checks
- **User Management** - Secure authentication and user management system
- **Service Discovery** - Automatic discovery and management of microservices
- **Pod Management** - Kubernetes pod monitoring and resource allocation

## Architecture

This is a microservices application built on [Platformatic Runtime](https://docs.platformatic.dev/) with:

- **main** - API gateway/composer that routes to all services
- **frontend** - React SPA for the user interface
- **control-plane** - Core application management and K8s integration
- **user-manager** - Authentication & user management (OAuth2, sessions)

## Requirements

- Node.js >= v20.18.0 
- Docker and Docker Compose
- Kubernetes cluster (for deployment)
- PostgreSQL database
- pnpm package manager

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Generate Session Key

```bash
# On macOS
pnpm run generate:session:key:mac

# On Linux
pnpm run generate:session:key:linux
```

### 3. Start Databases

```bash
docker-compose --env-file /dev/null up -d
```

### 4. Start the Application

```bash
# Development mode
pnpm dev

# Production mode
pnpm start
```

The application will be available at `http://localhost:3042`

## Features

### Core Features (Open Source)

- **Application Lifecycle Management**: Deploy, update, and manage applications
- **Real-time Monitoring**: Track application health and performance
- **User Authentication**: Secure OAuth2-based authentication
- **Service Management**: Discover and manage microservices
- **Pod Monitoring**: Track Kubernetes pods and resource usage
- **Deployment History**: Track application deployments and changes

### Development

```bash
# Run tests
pnpm test

# Lint code
pnpm lint

# Build application
pnpm build

# Clean dependencies
pnpm clean
```

## Docker

Build and run with Docker:

```bash
# Build image
docker build -t intelligent-command-center .

# Run container
docker run -p 3042:3042 intelligent-command-center
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for the full license text.

## Support

- 📖 [Documentation](https://github.com/platformatic/intelligent-command-center/wiki)
- 🐛 [Issue Tracker](https://github.com/platformatic/intelligent-command-center/issues)
- 💬 [Discussions](https://github.com/platformatic/intelligent-command-center/discussions)

---

Built with ❤️ by the [Platformatic](https://platformatic.dev) team.
