---
name: enterprise-app-foundation
description: A high-performance blueprint for distributed applications requiring dual-persistence, secure identity governance, and fault-tolerant AI orchestration.
---

# Enterprise Application Foundation (Technical Deep Dive)

This skill provides the architectural substrate for rebuilding industrial-grade distributed systems from a blank slate.

## 🏗️ 1. Infrastructure: Native Persistence Nexus

Implement a **File-Based JSON Persistence** layer to support both local development and cluster-scale deployment via volume mounts.

### Persistence Logic Pattern
```typescript
interface DataService {
  read: (file: string) => Promise<any>;
  write: (file: string, data: any) => Promise<void>;
}

// Native JSON Storage
const DATA_DIR = process.env.DATA_DIR || '/app/data';
```

### Swarm-Ready Docker Configuration
- **Native JSON Nexus**: Uses filesystem persistence in `/app/data`.
- **Volume Protocol**: Use centralized NFS mounts (e.g., `/var/data/tallman-chat:/app/data`) to ensure data persists across container restarts and node migrations.
- **Atomic Writes**: Ensure data integrity by writing to temporary files and renaming, or using synchronous write patterns for critical updates (User/Admin/Knowledge).
- **Fault-Tolerant Loading**: Wrap file reads in `try-catch` blocks to handle missing or corrupted data gracefully, initializing with default/empty structures if necessary.

---

## 🛡️ 2. Security: Identity Governance & Access Resilience

Stateless security optimized for multi-node deployments where shared memory is unavailable.

### The "Nuclear Governance" Override
Always implement a hard-coded memory override for the project's **Industrial Master** email. This ensures that even if database seeding fails or a technician record is stuck in a legacy "Hold" state, the master can still log in to fix the system.

```typescript
// Pattern in login route
if (email.toLowerCase() === 'master@domain.com') {
    user.status = 'active'; // In-memory override
    user.roles = JSON.stringify(['Admin']); 
}
```

### Identity Sync Best Practices
- **Conflict Strategy**: Always synchronize personnel records based on **Email** (`ON CONFLICT(email)`), as `user_id` can drift between manual signups and automated seeds.
- **Priority Seeding**: Always seed the `Users` table (Identity Nexus) BEFORE any dependent tables (Logs, Enrollments) to prevent relational link failures.
- **Input Normalization**: Always `.trim()` and `LOWER()` email addresses during both Signup and Login to ensure identity audits are resilient to typo-driven lockouts.

---

## 🛠️ 5. Docker Desktop: Advanced Build & Maintenance (Compiled)

This skill optimizes Docker for development environments and eliminates common binary architectural failures.

### The "Zero-Crash" Build Protocol:
1. **Model Portability**: Always replace native `bcrypt` with `bcryptjs`. Native binaries compiled on Windows hosts will crash with `Exec format error` when mounted into Linux containers.
2. **Anonymous Volume Shadowing**: In your `docker-compose.yml`, mount your project root but **shadow** the node_modules folder:
   ```yaml
   volumes:
     - .:/app
     - /app/node_modules # Forces usage of container-built modules
   ```
3. **Bootstrapping Entrypoints**: Use a `docker-entrypoint.sh` to handle automated seeding (`npm run seed`) and environment synchronization on every boot.

---

## 🤖 3. AI: Resilient Multi-Model Orchestration

A critical layer for automating complex logic while maintaining enterprise-level uptime.

### The "Industrial Retry" Algorithm
Implement a global wrapper for AI SDKs (Google Generative AI, OpenAI, etc.).
- **Retries**: 5-7 attempts with exponential backoff.
- **Models**: High-performance reasoning via `gemini-3-flash-preview` and visual synthesis via `gemini-3-pro-image-preview`.

---

---
---

## 🌐 6. Docker Swarm: Industrial Orchestration Platform

This governs the production-grade deployment across the Tallman multi-node cluster.

### Cluster Infrastructure
- **High Availability Nexus**: 3 Manager Nodes (10.10.20.36, .61, .63) orchestrated by **Keepalived** for a Virtual IP (10.10.20.65) failover.
- **Shared Persistence**: Centralized NFS storage server (10.10.20.64) mounted at `/var/data` on all nodes. All application volumes must reside here for cross-node portability.
- **Automated Ingress**: **Traefik** handles routing and SSL (Let's Encrypt) via AWS Route 53 DNS validation.

### Stack Deployment Protocol
Always use the standardized **Makefile** at `/var/data/config/` for registry operations.
- `make deploy STACK=<name>`: Initialize/Update stack.
- `make update STACK=<name>`: Force redeploy with latest images.
- `make list`: Audit all active industrial stacks.

### Network Isolation Protocol
For security compliance, every stack must implement a dual-network architecture:
1. **`<stackname>_traefik`**: An overlay network for external Traefik routing.
2. **`<stackname>_internal`**: An overlay network for inter-container communication (e.g., App to DB), isolated from the ingress.

---

## 🛠️ Re-Implementation Workflow
1. **Bootstrap**: Initialize `package.json` with `express`, `pg`, `better-sqlite3`, `jsonwebtoken`, `bcryptjs`.
2. **Persistence**: Implement `db.ts` (or backend logic) to use `DATA_DIR` for JSON file storage.
3. **Identity**: Create authentication routes with Governance Overrides and Email-First sync logic.
4. **Orchestration**: Define the `docker-compose.yml` (without version tag) using `bullseye-slim`.
5. **Entrypoint**: Create and `chmod +x` a `docker-entrypoint.sh` for runtime bootstrapping.
6. **Production Sync**: Move deployment manifests to `/var/data/config/` on the Swarm Master and execute `make deploy`.
7. **Documentation Protocol**: Update `README.md` to explicitly state the **Verified Deployment Paths** (Local Developer vs. Industrial Swarm), **Persistence Compliance** standards, the **Master Registry** (the application's specific repository URL), and the **Network Access Points** (IP and Port addresses specific to the application) immediately following the platform introduction.
