# ApprovalApp

## 📌 Overview

ApprovalApp is a production-ready approval portal to manage security events such as:

* Email quarantine approvals (Proofpoint)
* Endpoint / ITM / DLP approvals
* Administrative actions with full audit trail

It centralizes decision workflows, enforces role-based access, and provides a complete audit history.

---

## 🏗️ Architecture

Monorepo structure:

* **API (NestJS)**: authentication (SAML), business logic, integrations, audit
* **Web (Next.js)**: UI (setup, dashboard, approvals, audit)
* **Worker**: background jobs (queues via Redis)
* **Infra**: PostgreSQL, Redis, Nginx (TLS + reverse proxy)

```
User → Web → API → PostgreSQL
                    ↘ Proofpoint APIs
```

---

## 🔐 Authentication & Roles

* SAML (Microsoft Entra ID)
* Roles:

  * `ADMIN`
  * `APPROVER`

Authorization is enforced on API routes and UI navigation.

---

## ⚙️ First-Time Setup Flow

1. Access the app → redirected to `/setup`
2. Provide:

   * Proofpoint `client_id`
   * Proofpoint `client_secret`
3. System generates a **webhook shared secret** (displayed once)
4. Redirect to `/login`

> The setup is considered complete when Proofpoint config exists in DB.

---

## 🔑 Environment Variables (.env)

This section documents the current environment variables, what they do, whether they are required, and whether they are currently used by the codebase.

### Shared / Runtime

#### `NODE_ENV`

* **Used by:** API runtime
* **Purpose:** enables production behavior for Node/Nest/Next
* **Required:** yes
* **Example:** `production`

#### `APP_URL`

* **Current status:** not referenced directly in the backend search output
* **Purpose:** intended public base URL of the application
* **Required:** optional for current code, but useful for documentation and future integrations
* **Example:** `https://approvalapp.example.com`

#### `WEB_ORIGIN`

* **Current status:** not found in direct `process.env.*` usage scan
* **Purpose:** intended frontend origin for browser access / CORS alignment
* **Required:** optional in current implementation
* **Recommendation:** keep only if used by reverse proxy or future CORS policy

#### `API_PUBLIC_URL`

* **Current status:** not found in direct backend usage scan
* **Purpose:** intended public URL of the API for external references
* **Required:** optional in current implementation
* **Recommendation:** keep documented, but mark as optional

#### `INTERNAL_API_BASE_URL`

* **Current status:** not found in backend scan; likely intended for internal web → api access in Docker
* **Purpose:** internal API hostname inside Docker network
* **Required:** optional unless web explicitly consumes it
* **Example:** `http://api:3001`

#### `TZ`

* **Used by:** container/system runtime
* **Purpose:** timezone alignment for logs and application processes
* **Required:** recommended
* **Example:** `America/Sao_Paulo`

### Database / Queue

#### `POSTGRES_DB`

* **Used by:** Docker Compose / Postgres container
* **Purpose:** database name
* **Required:** yes

#### `POSTGRES_USER`

* **Used by:** Docker Compose / Postgres container
* **Purpose:** database user
* **Required:** yes

#### `POSTGRES_PASSWORD`

* **Used by:** Docker Compose / Postgres container and `DATABASE_URL`
* **Purpose:** database password
* **Required:** yes
* **How to generate:** use a strong random password

  ```bash
  openssl rand -base64 24
  ```

#### `DATABASE_URL`

* **Used by:** Prisma / API startup
* **Purpose:** connection string for PostgreSQL
* **Required:** yes
* **Example:** `postgresql://user:password@postgres:5432/dbname?schema=public`

#### `REDIS_URL`

* **Current status:** not referenced directly in the usage scan
* **Purpose:** intended Redis connection string
* **Required:** no for current code path
* **Recommendation:** current code uses `REDIS_HOST` and `REDIS_PORT`; document this variable as optional or remove it if unused

#### `REDIS_HOST`

* **Used by:** approvals service and worker
* **Purpose:** Redis host for BullMQ/worker processing
* **Required:** yes for approval queue flows
* **Example:** `redis`

#### `REDIS_PORT`

* **Used by:** approvals service and worker
* **Purpose:** Redis port for BullMQ/worker processing
* **Required:** yes for approval queue flows
* **Example:** `6379`

### Session / Encryption

#### `SESSION_SECRET`

* **Used by:** API session middleware
* **Purpose:** signs and protects session cookies
* **Required:** yes
* **How to generate:**

  ```bash
  openssl rand -hex 32
  ```

  or

  ```bash
  python3 - <<'PY'
  import secrets
  print(secrets.token_hex(32))
  PY
  ```

#### `APP_MASTER_KEYS_FILE`

* **Used by:** `SecretCryptoService`
* **Purpose:** path to JSON file containing encryption master keys
* **Required:** yes in production when using file-based secrets
* **Example:** `/run/secrets/app_master_keys.json`

#### `APP_MASTER_KEYS_JSON`

* **Used by:** `SecretCryptoService`
* **Purpose:** alternative inline JSON source for master keys
* **Required:** optional
* **Recommendation:** prefer `APP_MASTER_KEYS_FILE` in production

#### `APP_MASTER_KEY_CURRENT_VERSION`

* **Used by:** `SecretCryptoService`
* **Purpose:** selects the active master key version used for new encryptions
* **Required:** yes
* **Example:** `v1`

### SAML / Microsoft Entra ID

#### `SAML_ENTRY_POINT`

* **Used by:** SAML strategy
* **Purpose:** IdP login endpoint
* **Required:** yes

#### `SAML_ISSUER`

* **Used by:** SAML strategy and metadata endpoint
* **Purpose:** service provider issuer / metadata identity
* **Required:** yes

#### `SAML_CALLBACK_URL`

* **Used by:** SAML strategy and metadata endpoint
* **Purpose:** Assertion Consumer Service (ACS) URL
* **Required:** yes

#### `SAML_LOGOUT_URL`

* **Current status:** not referenced in the usage scan
* **Purpose:** intended SAML single logout URL
* **Required:** no in current implementation
* **Recommendation:** optional / currently unused

#### `SAML_IDP_CERT_FILE`

* **Used by:** SAML strategy
* **Purpose:** path to IdP signing certificate
* **Required:** yes

#### `SAML_ADMIN_GROUP_IDS`

* **Used by:** user role resolution
* **Purpose:** Entra group IDs mapped to `ADMIN`
* **Required:** yes if admin role mapping is required
* **Format:** comma-separated list

#### `SAML_APPROVER_GROUP_IDS`

* **Used by:** user role resolution
* **Purpose:** Entra group IDs mapped to `APPROVER`
* **Required:** yes if approver role mapping is required
* **Format:** comma-separated list

#### `SAML_REQUIRE_SIGNED_ASSERTION`

* **Current status:** not found in direct usage scan
* **Purpose:** intended toggle for signed assertion enforcement
* **Required:** no in current implementation
* **Recommendation:** document as unused until wired into SAML strategy

### Approval / Group Grant Flow

#### `GROUP_MEMBERSHIP_MODE`

* **Used by:** approvals service
* **Purpose:** selects provider for temporary group grants
* **Allowed values:** `ENTRA` or `AD_BRIDGE`
* **Required:** only for endpoint/DLP grant workflow

#### `ENTRA_TEMP_APPROVED_GROUP_ID`

* **Used by:** approvals service and worker
* **Purpose:** target Entra group for temporary approved access
* **Required:** yes for Endpoint/DLP approval grants

#### `TEMP_APPROVED_DURATION_MINUTES`

* **Used by:** approvals service
* **Purpose:** duration of temporary group grant before expiration
* **Required:** recommended if using group grant workflow
* **Example:** `60`

#### `ENTRA_TENANT_ID`

* **Used by:** worker
* **Purpose:** Entra tenant for worker-driven membership operations
* **Required:** only for Entra grant workflow

#### `ENTRA_CLIENT_ID`

* **Used by:** worker
* **Purpose:** Entra application client ID for group management
* **Required:** only for Entra grant workflow

#### `ENTRA_CLIENT_SECRET_FILE`

* **Used by:** worker
* **Purpose:** file path to Entra client secret
* **Required:** only for Entra grant workflow

#### `AD_BRIDGE_URL`

* **Used by:** worker
* **Purpose:** external AD bridge endpoint
* **Required:** only for AD bridge workflow

#### `AD_BRIDGE_API_KEY_FILE`

* **Used by:** worker
* **Purpose:** file path to AD bridge API key
* **Required:** only for AD bridge workflow

### Proofpoint

#### `PROOFPOINT_EMAIL_MODE`

* **Used by:** Proofpoint email adapter
* **Purpose:** selects adapter mode (e.g. mock vs live)
* **Required:** yes
* **Important:** `mock` should not be used in real production workflows

#### `PROOFPOINT_EMAIL_INTEGRATION_KEY`

* **Used by:** Proofpoint email adapter
* **Purpose:** identifies the integration secret/config for email quarantine access
* **Required:** yes if email integration is enabled

#### `PROOFPOINT_ENDPOINT_INTEGRATION_KEY`

* **Current status:** not found in direct usage scan
* **Purpose:** intended integration key for endpoint flows
* **Required:** optional / validate before keeping

#### `PROOFPOINT_ITM_INTEGRATION_KEY`

* **Current status:** not found in direct usage scan
* **Purpose:** intended integration key for ITM flows
* **Required:** optional / validate before keeping

#### `PROOFPOINT_DLP_INTEGRATION_KEY`

* **Current status:** not found in direct usage scan
* **Purpose:** intended integration key for DLP flows
* **Required:** optional / validate before keeping

#### `PROOFPOINT_TOKEN_SKEW_SECONDS`

* **Used by:** Proofpoint auth service
* **Purpose:** token refresh safety margin before expiration
* **Required:** optional
* **Default behavior:** falls back to `60`

### Webhooks

#### `WEBHOOK_SHARED_SECRET`

* **Used by:** webhooks service
* **Purpose:** shared secret validation for webhook calls
* **Required:** depends on chosen webhook validation strategy
* **Important note:** current application also stores a generated webhook secret in `ProofpointApiConfig`. This should be reconciled/documented clearly to avoid dual sources of truth.

### Proxy / Networking

#### `TRUST_PROXY`

* **Used by:** API bootstrap
* **Purpose:** trust reverse proxy headers (`X-Forwarded-*`) for correct IP/session behavior
* **Required:** recommended behind Nginx/Cloudflare/reverse proxies
* **Example:** `true`

---

## 🔒 Secrets & Certificates

Kept **outside Git**:

```
/secrets
/infra/nginx/certs
```

Examples:

* SAML IdP cert
* API keys
* TLS cert/key

`.gitignore` ensures these are not versioned.

---

## 📊 Audit System

All critical actions are persisted in `AuditLog`.

### Tracked Events

* Authentication: `LOGIN`, `LOGOUT`
* Config & tokens: `TOKEN_CREATE`, `TOKEN_ROTATE`, `TOKEN_DELETE`
* Webhook: reset operations
* Approvals: `APPROVE`, `DENY`, `BULK_APPROVE`
* Quarantine: `PROOFPOINT_EMAIL_APPROVE`, failures

### Stored Fields

* `actorUserId`, `actorEmail`
* `action`, `entityType`, `entityId`
* `ipAddress`, `userAgent`
* `metadataJson`
* `createdAt`

---

## 🧭 Audit UI (Trilha de Auditoria)

Features:

* Filter by user (email/action/entity)
* Filter by period: `24h`, `7d`, `30d`, `all`
* Filter by type: `auth`, `token`, `approval`, `quarantine`, `config`
* Result column: **Sucesso / Falha**
* Full metadata inspection (JSON)

---

## 🧪 Local Development (Mac / VSCode)

```bash
cd ~/ApprovalApp
git pull origin main
# edit in VSCode
pnpm install
# (optional) run locally if you have envs
```

Commit & push:

```bash
git add .
git commit -m "feat: description"
git push origin main
```

---

## 🚀 Server Deployment (Linux)

Server is **deploy-only**.

```bash
cd /home/labsec/ApprovalApp
git pull origin main
docker compose build
docker compose up -d
```

### After Prisma changes

```bash
docker compose build api
docker compose up -d api
docker compose exec api sh -lc 'cd /app/apps/api && pnpm prisma db push'
docker compose up -d web nginx worker
```

---

## 🧱 Database Operations

### Apply schema

```bash
docker compose exec api sh -lc 'cd /app/apps/api && pnpm prisma db push'
```

### Full reset (for setup testing)

```bash
docker compose down -v
docker compose up -d postgres redis
docker compose exec api sh -lc 'cd /app/apps/api && pnpm prisma db push'
docker compose up -d api web nginx worker
```

---

## 🗄️ Database Model Reference

### `User`

Stores portal users authenticated via SAML.

* `email`, `displayName`, `externalId`
* `role` (`ADMIN` or `APPROVER`)
* `groupsJson` for raw SAML groups
* `lastLoginAt` for operational tracking

### `ApprovalItem`

Represents an approval request.

* `source`: email quarantine / endpoint / DLP
* `status`: pending, approved, denied, etc
* requester fields (`requesterEmail`, `requesterName`, `requesterExternalId`)
* policy and message context
* raw payload and preview metadata

### `ApprovalAction`

Immutable history of actions taken on an approval item.

* action type (`APPROVE`, `DENY`, etc)
* actor
* optional comment
* metadata

### `WebhookEvent`

Stores incoming webhook deliveries.

* source event id
* raw payload
* normalized payload
* signature validation status
* processing status/timestamps

### `GroupGrant`

Tracks temporary group membership grants.

* provider (`ENTRA` or `AD_BRIDGE`)
* target group/user
* expiration and lifecycle timestamps
* last error/status

### `IntegrationSecret`

Encrypted storage for integration tokens/configuration references.

* integration key
* encrypted token fields
* fingerprint and key version
* enabled/status flags

### `AuditLog`

Central audit trail of critical system actions.

* actor
* action
* entity type/id
* IP / user-agent
* metadata JSON
* timestamp

### `ProofpointApiConfig`

Encrypted Proofpoint application configuration.

* provider key
* encrypted client id/secret
* cached token / refresh token / expiration
* webhook secret
* optional future filters metadata

### `ApprovalActionLog`

Low-level operational logging for approval actions against external services.

* incident id
* response status
* success flag
* response payload
* actor

---

## 🌐 Application Routes

### Web routes

* `/` → root redirect logic
* `/setup` → first-time bootstrap flow
* `/login` → SAML login page
* `/dashboard/quarantine` → email quarantine approvals
* `/dashboard/approvals` → approvals list/history
* `/dashboard/endpoint-itm` → endpoint / ITM / DLP related flows
* `/dashboard/audit` → audit trail (admin only)
* `/dashboard/settings/proofpoint-tokens` → Proofpoint config and webhook management (admin only)
* `/not-found` → custom 404 page

### API route families

* `/api/auth/*` → SAML login, ACS, metadata, session user, logout
* `/api/setup/*` → initial bootstrap state and configuration
* `/api/admin/*` → audit, stats, admin features
* `/api/admin/integrations/*` → Proofpoint configuration and token operations
* `/api/approvals/*` → approval list / decision APIs
* `/api/quarantine/*` → quarantine item retrieval and approval actions
* `/api/webhooks/*` → inbound webhook ingestion

---

## 🧩 Service Breakdown

### API (`apps/api`)

Built with **NestJS + Prisma**.
Responsible for:

* authentication/session
* business rules
* approval processing
* audit logging
* integrations
* setup/bootstrap

### Web (`apps/web`)

Built with **Next.js**.
Responsible for:

* login/setup UI
* dashboard pages
* admin settings
* audit visualization

### Worker (`apps/worker`)

Background processing service.
Responsible for:

* asynchronous group membership operations
* Entra / AD Bridge related tasks
* Redis-backed job execution

### PostgreSQL

Primary relational datastore for users, approvals, audit, configuration.

### Redis

Used for queue/job processing via BullMQ.

### Nginx

Optional reverse proxy / TLS termination layer for containerized deployment.

---

## 🛠️ Troubleshooting

### 500 / DB errors

* Run: `pnpm prisma db push`
* Check API logs: `docker compose logs api`

### Nginx Bad Gateway

* Check certs in `infra/nginx/certs`
* Verify containers are up: `docker compose ps`
* Confirm upstream services are healthy (`api`, `web`)

### Login / SAML issues

* Validate SAML env vars
* Confirm IdP cert file exists
* Check API logs for SAML profile/group resolution
* Confirm users are present in configured Entra groups

### Setup page does not appear

* Verify `/api/setup/status`
* Check whether `ProofpointApiConfig` already exists in DB
* Reset DB or delete config for first-run testing

### Missing audit events

* Ensure endpoints call `AuditService.record`
* Check DB directly:

  ```sql
  SELECT COUNT(*) FROM "AuditLog";
  ```

### Proofpoint token issues

* Revalidate client ID/client secret in setup or admin settings
* Use token test/refresh actions in admin panel
* Inspect `ProofpointApiConfig` and API logs

### Worker / grant flow problems

* Confirm Redis is up
* Confirm Entra / AD Bridge env variables are configured
* Check worker logs: `docker compose logs worker`

---

## 🖥️ Operating System / Host Requirements

Recommended baseline for Linux server:

* Docker Engine
* Docker Compose plugin
* Git
* OpenSSL
* outbound internet access to Proofpoint and Microsoft Entra endpoints
* TLS certificates if exposing through Nginx

Recommended checks:

```bash
docker --version
docker compose version
git --version
openssl version
```

Directories typically required on the host:

* project checkout (e.g. `/home/labsec/ApprovalApp`)
* `secrets/` with real secret files
* `infra/nginx/certs/` with real certificates if using bundled Nginx

---

## 📁 Project Structure

```
/apps
  /api        # NestJS backend
  /web        # Next.js frontend
  /worker     # background jobs

/infra
  /nginx      # optional reverse proxy config

/secrets      # local-only secrets (not versioned)
/docs         # project documentation
```

---

## 📝 Recommended Documentation Set

For a complete public/private project handoff, maintain:

* `README.md` → overview + quick start
* `docs/installation.md` → full installation guide
* `docs/configuration.md` → `.env` explained line by line
* `docs/architecture.md` → technical architecture and service interactions
* `docs/database.md` → table-by-table DB explanation
* `docs/routes.md` → page routes and API routes reference
* `docs/troubleshooting.md` → known issues and remediation
* `docs/infrastructure-nginx-cloudflare.md` → optional reverse proxy / Cloudflare deployment guide

---

## 🔐 Security Notes

Never commit:

* `.env`
* `/secrets`
* `/infra/nginx/certs`

Ensure least-privilege for API tokens and SAML configuration.

---

## 🗺️ Roadmap

* CI/CD (GitHub Actions)
* Secrets manager (Vault / Docker secrets)
* Multi-environment (staging/prod)
* Advanced audit analytics & exports

---

## 🏷️ Release

**v1.0.0**

* Setup flow
* Audit system
* Proofpoint integration
* Git-based deployment

---

## 👨‍💻 Maintainer Guidelines

* Develop locally (Mac)
* Commit & push to GitHub
* Server only runs `git pull` + `docker compose`
* Never hotfix directly on server

---

## ✅ Status

* Setup flow implemented
* Audit fully functional
* Filters (period/type) implemented
* Webhook + token management working
* Deployment workflow standardized

---

**ApprovalApp is ready for controlled production deployment.**
