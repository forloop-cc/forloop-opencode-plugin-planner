---
name: tech-stack-default
description: >
  Default development and deployment tech stack for all ForLoop projects.
  Loaded automatically during planning sessions. Agent assumes this stack
  unless explicitly told otherwise by the user.
  DO NOT ask users to confirm tech stack during planning — assume these defaults.
license: MIT
metadata:
  version: "1.0.0"
  category: planning
  sources:
    - ForLoop project-base template
---

# ForLoop Default Tech Stack

## Overview

All ForLoop projects use this standardized tech stack. When planning stories, assume these technologies — do not ask users to confirm or choose alternatives unless they explicitly state a different requirement.

## Project Repository

When a sprint is created with a project name, a GitHub repository is **automatically created** by the ForLoop platform. The repo is seeded with the ForLoop project-base template (`.forloop/template/`), which includes the full frontend, backend, infrastructure, and CI/CD scaffolding.

### Repository Naming Convention

```
sprint-{sprint_id}-project-{project-name}
```

**Example:** Sprint #14 with project name "abc" creates repo:
```
sprint-14-project-abc
```

### What's Included (from project-base template)

| Directory | Contents |
|-----------|----------|
| `frontend/` | React + Vite SPA with TypeScript, TailwindCSS, React Router |
| `backend/` | Lambda Docker container (Express + MVC + TypeScript) with DynamoDB |
| `infra/` | Terraform modules for backend, frontend assets, and ECR repository |
| `scripts/` | Deployment helper scripts (bash) |
| `config/` | Project and tenant configuration files |
| `.github/workflows/` | CI/CD pipelines (lint, test, deploy, release) |
| `forloop.json` | ForLoop project metadata (projectName, sprintId, organizationId, flEnv) |
| `Makefile` | Developer convenience commands |
| `.env.example` | Environment variable template |

### What This Means for Planning

- **Do NOT plan repo creation** — it happens automatically when the sprint is created
- **Do NOT ask users "where is the repo?"** — it's at `github.com/.../sprint-{id}-project-{name}`
- **Do NOT plan GitHub Actions setup** — CI/CD workflows are pre-baked
- **Do NOT plan project scaffolding** — frontend, backend, and infra are ready to use
- **Stories should focus on building features** on top of the existing scaffolding, not setting up the project

### Pre-Configured Features

The template repo comes with:
- ✅ Frontend with `/`, `/health`, `/users` routes
- ✅ Backend with Express MVC architecture, health check and users CRUD endpoint
- ✅ DynamoDB single-table design ready
- ✅ API Gateway HTTP API with catch-all routing
- ✅ Docker container image for Lambda deployment
- ✅ ECR repository managed via Terraform
- ✅ Terraform infrastructure modules
- ✅ GitHub Actions CI/CD (lint, test, Docker build, deploy, release)
- ✅ OIDC authentication to AWS
- ✅ CloudFront + S3 frontend hosting
- ✅ Makefile for common commands (`make dev`, `make build`, `make test`, `make deploy`)

## Story Templates

When creating stories in ForLoop, always use templates. Templates ensure consistent structure, proper metadata, and correct canvas rendering. Stories have a `templateId` field linking to the Template table.

### Available Templates

#### `basic-task` (Template Slug: `basic-task`)

**Story Type:** `task`

**When to use:** ALL implementation tasks created from plan breakdown. This includes features, bug fixes, refactoring, deployment, CI/CD, testing, and any work that requires code changes.

**Fields defined by this template:**

| Field ID | Label | Type | Component | Required | Notes |
|----------|-------|------|-----------|----------|-------|
| `taskTitle` | Task Title | short-text | input | Yes | Story title |
| `description` | Description | long-text | textarea | Yes | Story description with acceptance criteria |
| `assignee` | Assignee | user-select | dropdown | No | Assigned user |
| `status` | Status | select | dropdown | No | `todo`, `in_progress`, `done`, `blocked` |
| `priority` | Priority | select | dropdown | No | `low`, `medium`, `high`, `critical` |
| `points` | Points | range | slider | No | Integer 0-10 |
| `dueDate` | Due Date | date | datepicker | No | Optional deadline |
| `tags` | Tags | multi-select | tag-input | No | Labels for categorization |

**Usage:**
```
forloopStoryTemplate(
  templateSlug=basic-task,
  taskTitle="Implement user registration API",
  description="As a user, I want to register via email...",
  sprintId=14,
  priority=high,
  points=5,
  assigneeAgentKey=developer
)
```

#### `basic-note` (Template Slug: `basic-note`)

**Story Type:** `story`

**When to use:** Documentation items, research notes, planning artifacts, and non-implementation stories. NOT for task breakdown from plans.

**Fields defined by this template:**

| Field ID | Label | Type | Component | Required | Notes |
|----------|-------|------|-----------|----------|-------|
| `taskTitle` | Note Title | short-text | input | Yes | Story title |
| `description` | Description | long-text | textarea | Yes | Note content |

**Usage:**
```
forloopStoryTemplate(
  templateSlug=basic-note,
  taskTitle="Document API design decisions",
  description="Record the decisions made about...",
  sprintId=14,
  priority=medium,
  points=2
)
```

### Template Selection Rules

| Scenario | Template Slug |
|----------|---------------|
| Breaking down a plan into tasks | `basic-task` |
| Feature implementation | `basic-task` |
| Bug fix | `basic-task` |
| Refactoring | `basic-task` |
| Deployment/infrastructure | `basic-task` |
| CI/CD pipeline work | `basic-task` |
| Testing tasks | `basic-task` |
| Planning/breakdown tasks | `basic-task` |
| Standalone research note | `basic-note` |
| Documentation (not from plan) | `basic-note` |

### Task Creation Rule

**ALL task stories created from plan breakdown MUST use `--templateSlug basic-task`.** This is not optional. The `basic-task` template provides the full field set needed for implementation work: status tracking, priority, points, assignee, due date, and tags.

### Story Fields (API Schema)

When creating stories via the API (`POST /api/opencode/stories`), these fields are available:

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `title` | string | Yes | - | Story title |
| `description` | string | No | null | Story description |
| `sprintId` | number | Yes | - | Target sprint ID |
| `type` | enum | No | `story` | `story`, `task`, `bug`, `doc_folder` |
| `priority` | enum | No | `medium` | `low`, `medium`, `high`, `critical` |
| `points` | number | No | null | Integer 0-10 |
| `status` | enum | No | `todo` | `todo`, `in_progress`, `done`, `blocked` |
| `templateId` | number | No | null | FK to Template table |
| `assigneeType` | enum | No | `user` | `user` or `agent` |
| `assigneeAgentKey` | string | No | null | Required when `assigneeType=agent` |
| `metadata` | object | No | null | Template field values as JSON |

## Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React + TypeScript | 18.x |
| Build Tool | Vite | 5.x |
| Routing | React Router DOM | 6.x |
| Styling | TailwindCSS + PostCSS | 3.x |
| Testing | Vitest | 1.x |
| API Client | Custom `fetch()` wrapper (`api-client.ts`) | - |
| Path Alias | `@` → `./src` | - |

### Frontend Architecture

- **Folder structure**: `src/components/`, `src/pages/`, `src/hooks/`, `src/lib/`, `src/types/`, `src/styles/`
- **API communication**: `useApi<T>(path)` generic hook + domain-specific hooks (e.g., `useUsers()`)
- **Config**: `lib/config.ts` resolves Vite env vars, computes API base URL
- **Layout**: Wrapper component with header/footer
- **Build**: `tsc + vite build` → outputs to `dist/`
- **Assets**: Hashed filenames for cache-busting

### Frontend Gotchas

- Vite env vars use `VITE_*` prefix (e.g., `VITE_API_BASE_URL`)
- `@` path alias maps to `./src`
- TailwindCSS configured via `postcss.config.js`
- Dev server proxies API to backend for local development

## Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | AWS Lambda (Docker container) | Node.js 20.x |
| Framework | Express.js | 4.x |
| Serverless Adapter | @codegenie/serverless-express | 4.x |
| Database | DynamoDB | - |
| ORM | dynamodb-onetable | 2.x |
| Container | AWS ECR (per project) | - |
| Testing | Jest + ts-jest + supertest | 29.x |
| Types | @types/aws-lambda, @types/express | - |

### Backend Architecture

- **Single Lambda function** handles ALL routes via Express.js — no per-route Lambdas
- **MVC pattern**: `routes/` → `controllers/` → `services/` → `models/`
- **Entry point**: `src/lambda.ts` — wraps Express app via serverless-express for Lambda
- **App setup**: `src/app.ts` — Express app with CORS, JSON parsing, route registration, error handling
- **API Gateway**: HTTP API (v2) with catch-all routes `ANY /{env}/{project}/{proxy+}`
- **Database**: Single-table DynamoDB design with `pk`/`sk` pattern
- **Models**: `dynamodb-onetable` with ULID auto-generation, `#` separator
- **Container**: Multi-stage Dockerfile (Node 20 Alpine build → Lambda runtime image)
- **Build**: `tsc` compiles TypeScript to `dist/` — Docker builds the container image

### Backend Folder Structure

```
backend/
├── Dockerfile              # Lambda container image (multi-stage)
├── .dockerignore
├── src/
│   ├── lambda.ts           # Lambda handler entry point
│   ├── app.ts              # Express app + serverless adapter
│   ├── routes/             # API route definitions
│   ├── controllers/        # Request handlers
│   ├── services/           # Business logic (DB, external APIs)
│   ├── models/             # Data models and DynamoDB schemas
│   ├── middleware/         # Auth, validation, error handling
│   ├── config/             # Environment configuration
│   └── types/              # TypeScript type definitions
└── package.json
```

### Backend Gotchas

- Runtime env vars: `TENANT_ID`, `PROJECT_ID`, `ENV`, `AWS_REGION`
- DynamoDB table name: `fl-{TENANT_ID}-{PROJECT_ID}-{ENV}`
- OneTable model uses `pk`/`sk` with `#` separator (e.g., `user#${id}`)
- Lambda name does NOT have `-api` suffix: `fl-{tenant}-{project}-{env}`
- Structured JSON logger in `lib/logger.ts`
- ECR repository: `fl-{account_id}-{tenant}-{project}` (managed by Terraform)
- Image tags: `{env}-{commit-sha}`
- Terraform `ignore_changes = [image_uri]` on Lambda — CI updates image outside Terraform

## Infrastructure

| Layer | Technology | Version |
|-------|-----------|---------|
| IaC | Terraform | >= 1.6 |
| Cloud | AWS Provider | >= 5.0 |
| State | S3 backend | - |

### Terraform Architecture

- **State**: S3 remote state, keyed by `project/{env}/{project}/terraform.tfstate`
- **Remote state data source**: Reads tenant baseline outputs (API Gateway ID, bucket names)
- **Conditional deployment**: `count = var.deploy_* ? 1 : 0` — checks if resources exist first
- **Naming convention**: `fl-{tenant}-{project}-{env}` for Lambda, DynamoDB, IAM
- **Tagging**: `ForLoopTenantId`, `ForLoopProjectId`, `ForLoopEnv`, `ForLoopMode`, `ManagedBy`

### Modules

| Module | Creates |
|--------|---------|
| `project-backend` | ECR repo, Lambda (Docker image), DynamoDB, CloudWatch log group, API Gateway v2 routes, Lambda permission, IAM role, ECR lifecycle policy |
| `project-frontend-assets` | Uploads frontend dist files to S3 with MIME types and AES256 encryption |

### IAM

- Lambda execution role with CloudWatch Logs and DynamoDB access policies
- Role naming: `fl-{tenant}-{project}-{env}-lambda-role`
- ECR permissions: `ecr:*` on `arn:aws:ecr:*:*:repository/fl-*` (create, push, pull, lifecycle)
- Tenant deploy role (StackSet): includes ECR repo management and image push/pull permissions

## Available AWS Services

ForLoop projects have access to a **curated set of AWS services**. The tenant deploy role is scoped to these services only — do NOT plan stories that require services outside this list.

### Available (Project-Level)

| Service | Capabilities | Resource Scope |
|---------|-------------|----------------|
| **S3** | Read/write/delete objects, list buckets | `fl-*` buckets |
| **CloudFront** | Create invalidations, read distribution config | Pre-provisioned distribution |
| **Lambda** | Create/update/delete functions, manage permissions, tags | `fl-*` functions only |
| **DynamoDB** | Create/update/delete tables, manage backups, TTL | `fl-*` tables only |
| **API Gateway v2** | Manage integrations and routes on existing HTTP APIs | Existing APIs only |
| **CloudWatch Logs** | Create/delete log groups, set retention, tags | All log groups |
| **SSM Parameter Store** | Create/read/delete parameters (SecureString, String) | `fl-*` parameters only |
| **IAM** | Create/manage Lambda execution roles | `fl-*-lambda-role` only |
| **ECR** | Create/delete repositories, push/pull images, lifecycle policies | `fl-*` repositories only |

### Available (Baseline — Pre-Provisioned by Control Plane)

These services are **already provisioned** when an organization is created. Projects consume them but do NOT create or manage them:

| Service | Role |
|---------|------|
| **Route53** | DNS hosted zones (e.g., `{tenant}.forloop.cc`, `api.{tenant}.forloop.cc`) |
| **ACM** | SSL/TLS certificates for CloudFront and API Gateway domains |
| **CloudFront** | Distributions per tenant (dev/prd) |
| **S3** | Frontend buckets (`fl-{account}-{tenant}-frontend-{env}`) |
| **API Gateway** | HTTP API with custom domain names |
| **IAM** | Deploy roles via StackSet |

### NOT Available

Do NOT plan stories requiring these services — they are **not** available to tenant projects:

| Service | Reason |
|---------|--------|
| VPC, EC2, ECS, EKS | Serverless-only platform |
| RDS, ElastiCache | Use DynamoDB |
| SNS, SQS, EventBridge, Step Functions | Use Lambda direct invocation |
| KMS | SSM uses AWS-managed encryption |
| SES, SNS | Not provisioned |
| S3 bucket creation | Buckets are pre-provisioned by baseline |
| API Gateway creation | HTTP API is pre-provisioned by baseline |
| Route53 record creation | DNS managed by Control Plane |
| ACM certificate creation | Certs managed by Control Plane |

### Planning Rule

**When planning backend or infrastructure stories, only use services from the "Available" list.** If a user requests functionality that requires an unavailable service, suggest an alternative using available services (e.g., DynamoDB Streams instead of SQS, SSM instead of KMS for secrets, Lambda direct invocation instead of Step Functions).

## Multi-Tenancy

| Mode | Frontend URL | API URL | S3 Path |
|------|-------------|---------|---------|
| **tenant** (dedicated) | `https://{project}.{tenant}.forloop.cc` | `https://api.{tenant}.forloop.cc/{env}/{project}/*` | `{env}/{project}/` |
| **shared** (system) | `https://{tenant}--{project}[-dev].system.forloop.cc` | `https://api.system.forloop.cc/{env}/{tenant}/{project}/*` | `{env}/{tenant}/{project}/` |

### Naming Conventions

| Resource | Pattern |
|----------|---------|
| Lambda | `fl-{tenant}-{project}-{env}` |
| DynamoDB table | `fl-{tenant}-{project}-{env}` |
| ECR repository | `fl-{account-id}-{tenant}-{project}` |
| S3 bucket (frontend) | `fl-{account-id}-{tenant}-frontend-{env}` |
| IAM role | `fl-{tenant}-{project}-{env}-lambda-role` |

## CI/CD

| Layer | Technology |
|-------|-----------|
| Platform | GitHub Actions |
| Auth | GitHub OIDC → AWS IAM role assumption (chained: control-plane → tenant role) |
| OIDC audience | `forloop-deploy` |
| Triggers | Commit message parsing: `[deploy frontend]`, `[deploy backend]`, `[deploy all]`, `[skip deploy]` |
| Environment | `main` branch → `prd`, all other branches → `dev` |

### Deploy Pipeline

1. Commit message parsed for `[deploy <resource>]` tag
2. Environment detected from branch name
3. OIDC token minted, deploy config fetched from ForLoop broker
4. Chained AWS role assumption (control-plane → tenant)
5. **Frontend**: Build with Vite env vars → sync to S3 (immutable assets + no-cache index.html) → CloudFront invalidation → health check
6. **Backend**: Terraform apply (creates ECR repo + Lambda shell) → Docker build → push to ECR → `aws lambda update-function-code --image-uri` → health check
7. PR deployment notifications sent to ForLoop server

### Frontend Deploy Cache Strategy

- **Assets** (`*.js`, `*.css`, images): `Cache-Control: max-age=31536000,immutable`
- **index.html**: `Cache-Control: no-cache,no-store,must-revalidate`

### Backend Deploy

The backend deploys as a Docker container image to AWS Lambda via ECR:

1. **Terraform**: Creates ECR repository (`fl-{account}-{tenant}-{project}`) and Lambda function (empty `image_uri`)
2. **Docker build**: `docker build -t {ECR_URI} backend/`
3. **Push**: `docker push {ECR_URI}`
4. **Update Lambda**: `aws lambda update-function-code --function-name fl-{tenant}-{project}-{env} --image-uri {ECR_URI}`

ECR lifecycle policy retains the last 10 images per environment. Lambda has `ignore_changes = [image_uri]` so CI updates don't cause Terraform drift.

## Development Workflow

### Makefile Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies (frontend + backend) |
| `make build` | Build all (frontend + backend) |
| `make dev` | Start frontend dev server with API proxy |
| `make test` | Run all tests (frontend vitest + backend jest) |
| `make lint` | Run ESLint on frontend and backend |
| `make typecheck` | Run TypeScript type checks |
| `make deploy` | Deploy to tenant (frontend + backend) |
| `make clean` | Remove build artifacts |

### Environment Variables

**Build time (Vite):**
- `VITE_API_BASE_URL` — Backend API URL
- `VITE_*` — Any custom frontend config

**Runtime (Lambda):**
- `TENANT_ID` — Tenant identifier
- `PROJECT_ID` — Project identifier
- `ENV` — Environment (`dev` or `prd`)
- `AWS_REGION` — AWS region (default: `ap-southeast-1`)

### Local Development

```bash
# Frontend dev server (proxies API to backend)
cd frontend && npm run dev

# Backend local testing (requires AWS credentials)
cd backend && npm test
```

## Story Planning Guidelines

When creating stories for this stack, follow these patterns:

### Frontend Stories

- Component creation with TypeScript interfaces
- Custom hooks for API integration
- TailwindCSS styling (no CSS-in-JS)
- Vitest tests for hooks and config
- Route additions via React Router

### Backend Stories

- Express routes in `src/routes/` (route registration)
- Controllers in `src/controllers/` (request handling, validation)
- Services in `src/services/` (business logic, DB operations)
- Models in `src/models/` (DynamoDB schemas via `dynamodb-onetable`)
- Middleware in `src/middleware/` (auth, validation, error handling)
- Jest + supertest tests for controllers and services
- Structured logging for all operations
- Docker image deployment via ECR (CI/CD handles this automatically)

### Infrastructure Stories

- Terraform module additions/changes
- IAM policy updates
- DynamoDB table/index changes
- API Gateway route updates

### Deployment Stories

- CI/CD workflow changes (GitHub Actions)
- Deploy script modifications
- CloudFront configuration
- Environment variable additions
- ECR lifecycle policy changes

## Anti-Patterns

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Ask user "what framework should we use?" | Assume React + Vite + TypeScript |
| Propose server-side rendering (Next.js/Remix) | Assume client-side SPA with Vite |
| Suggest per-route Lambda functions | Assume single Lambda with Express routing |
| Propose REST API (OpenAPI/Swagger) | Assume HTTP API v2 with Express middleware |
| Suggest Prisma/Sequelize/TypeORM | Use `dynamodb-onetable` |
| Propose PostgreSQL/MySQL | Use DynamoDB single-table design |
| Suggest REST API Gateway (v1) | Use HTTP API Gateway (v2) |
| Propose webpack/parcel | Use Vite for frontend, TypeScript compiler for backend |
| Ask "where should we deploy?" | Assume AWS (Lambda, S3, CloudFront, DynamoDB, ECR) |
| Suggest zip-based Lambda deployment | Use Docker container images via ECR |
| Propose GitHub Actions without OIDC | Use OIDC → IAM role assumption |
| Suggest manual AWS console changes | Use Terraform for all infrastructure |
| Plan VPC, EC2, ECS, EKS, RDS, SNS, SQS, Step Functions | Use only available services (see Available AWS Services section) |
| Plan S3 bucket or API Gateway creation | Use pre-provisioned baseline resources |
| Plan Route53 or ACM changes | DNS and certs are managed by Control Plane |

## Compliance

**All planning must assume this tech stack.** Do not ask users to confirm or choose alternatives unless they explicitly state a different requirement. Stories should be written assuming these technologies are in use.
