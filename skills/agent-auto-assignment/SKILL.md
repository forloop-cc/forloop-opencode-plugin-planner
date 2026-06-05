---
name: agent-auto-assignment
description: >
  Automatically assigns the right AI agent based on story type.
  Use when creating stories that need agent assignment, setting up sprint agents,
  or classifying work by intent (planning vs development vs deployment).
  DO NOT use when: manually assigning agents to existing stories (use
  story-update), or writing application code.
license: MIT
metadata:
  version: "2.0.0"
  category: planning
  sources:
    - ForLoop AI Agent documentation
triggers: ["assign agent", "agent selection", "auto assign"]
integrations: [story-creation, task-tracking]
---

# Agent Auto-Assignment

## Goal

Enable the planner agent to automatically assign stories to the correct AI agent based on the story type and purpose.

## Agent Definitions

The four canonical agent keys used in ForLoop story assignment:

| Key | Purpose | Default Enabled |
|-----|---------|-----------------|
| `forLoopDeveloper` | Backend/frontend implementation, bug fixes, refactoring, feature development | true |
| `forLoopTester` | Testing, QA, E2E tests, unit test writing, local validation | true |
| `forLoopDevops` | AWS infrastructure, CI/CD, deployment, Terraform, environment config | true |
| `forLoopCreator` | Document/media generation, file creation (DOCX, PDF, XLSX, PPTX, music, images) | true |

**Note:** The `planner` agent (Aivy) handles planning tasks — stories assigned to `planner` are for tracking planning work, not implementation. Implementation always goes to one of the four canonical agents above.

## Auto-Assignment Classification Rules

### Assign to `forLoopDeveloper`

- Backend implementation (server, API, database)
- Frontend implementation (UI, components, styling)
- Bug fixes and code refactoring
- Feature implementation
- Code writing and modification

**Keywords**: implement, develop, code, backend, frontend, fix, bug, refactor, feature, build, create api, write endpoint

### Assign to `forLoopTester`

- Unit test writing and maintenance
- Integration/E2E test creation
- Test infrastructure and test runners
- QA and validation stories
- Local validation (lint, typecheck, test execution)

**Keywords**: test, testing, qa, validate, validation, lint, typecheck, spec, coverage, assertion

### Assign to `forLoopDevops`

- AWS resource creation and configuration
- Lambda function deployment
- CI/CD pipeline setup and GitHub Actions
- Secrets and environment configuration
- Infrastructure as Code (Terraform, CloudFormation)
- S3, CloudFront, DynamoDB provisioning

**Keywords**: deploy, aws, lambda, infrastructure, ci/cd, pipeline, secrets, environment, release, serverless, cloudformation, terraform, s3, cloudfront, dynamodb, iam

### Assign to `forLoopCreator`

- Document generation (DOCX, PDF, reports, proposals)
- Presentation creation (PPTX, slides, decks)
- Spreadsheet creation (XLSX, CSV, financial models)
- Media generation (music, images, video, GIFs, stickers)
- File reformatting and templating

**Keywords**: generate, create document, report, pdf, docx, xlsx, pptx, presentation, slides, music, image, video, gif, sticker, template, format

## Workflow

### Step 1: Fetch Sprint, Enabled Agents, and Developer Status

At the start of planning session:
1. Get the active sprint ID (from context, flag, or git branch)
2. Fetch sprint details: `forloopSprintGet(sprintId=<id>)` — check `sprintAiAgents` array for enabled agents
3. Check developer task status: `forloopDeveloperStatus(sprintId=<id>)` — if an ECS developer task is running, that agent is already occupied
4. Store enabled and available agent keys in context

### Step 2: Classify Story Intent

When creating a story, analyze the story title and description using keywords:

```
IF contains(forLoopTester keywords)
  → assign to forLoopTester
ELSE IF contains(forLoopDevops keywords)
  → assign to forLoopDevops
ELSE IF contains(forLoopCreator keywords)
  → assign to forLoopCreator
ELSE IF contains(forLoopDeveloper keywords) OR is implementation/bug
  → assign to forLoopDeveloper
ELSE
  → default to forLoopDeveloper for task stories, forLoopCreator for note stories
```

Priority: `forLoopTester` > `forLoopDevops` > `forLoopDeveloper` > `forLoopCreator`

### Step 3: Enable Agent if Needed

If the target agent is not enabled for the sprint:
1. Call `forloopSprintAiAgentsUpdate(sprintId=<id>, enabledAgentKeys=[...])` with the agent key added
2. Wait for confirmation that agent is enabled

### Step 4: Create Story with Assignment

Create the story via `forloopStoryTemplate`:
```
forloopStoryTemplate(
  templateSlug=basic-task,
  taskTitle="Implement user login API",
  sprintId=<id>,
  points=5,
  assigneeAgentKey=forLoopDeveloper
)
```

## Examples

### Example 1: Development Story
```
User: "Implement the user authentication API endpoint"
→ Classified as: forLoopDeveloper
→ assigneeAgentKey: "forLoopDeveloper"
```

### Example 2: Test Writing
```
User: "Write unit tests for the user validation logic"
→ Classified as: forLoopTester
→ assigneeAgentKey: "forLoopTester"
```

### Example 3: Deployment Story
```
User: "Deploy the Lambda function to staging environment"
→ Classified as: forLoopDevops
→ assigneeAgentKey: "forLoopDevops"
```

### Example 4: Bug Fix
```
User: "Fix the null pointer exception in the order processing service"
→ Classified as: forLoopDeveloper
→ assigneeAgentKey: "forLoopDeveloper"
```

### Example 5: Infrastructure
```
User: "Create S3 bucket for document storage with CloudFront distribution"
→ Classified as: forLoopDevops
→ assigneeAgentKey: "forLoopDevops"
```

### Example 6: Document Generation
```
User: "Generate a project requirements document"
→ Classified as: forLoopCreator
→ assigneeAgentKey: "forLoopCreator"
```

## Tool Usage

### List Available Agents
```
forloopAiAgentList()
```

### Enable Agents for Sprint
```
forloopSprintAiAgentsUpdate(sprintId=<id>, enabledAgentKeys=["forLoopDeveloper","forLoopTester","forLoopDevops","forLoopCreator"])
```

### Check Developer Availability
```
forloopDeveloperStatus(sprintId=<id>)
```
If ECS task is RUNNING, the developer agent pool is occupied.

### Create Story with Assignment
```
forloopStoryTemplate(
  templateSlug=basic-task,
  taskTitle="Implement user login API",
  sprintId=<id>,
  assigneeAgentKey=forLoopDeveloper
)
```

## Edge Cases

1. **Agent not in catalog**: If an agent key is not found in the catalog, fall back to `forLoopDeveloper`
2. **Multiple agent keywords**: If story matches multiple agents, use priority order: `forLoopTester` > `forLoopDevops` > `forLoopDeveloper` > `forLoopCreator`
3. **No keywords matched**: Default to `forLoopDeveloper` for task stories, `forLoopCreator` for note stories
4. **Sprint has no agents enabled**: Enable all four canonical agents before creating stories
5. **ECS developer task running**: If `forloopDeveloperStatus` shows RUNNING, avoid assigning more stories to developer agents — they're already occupied

## Compliance

**Classification rules are mandatory.** Never assign agents without analyzing story intent first.

## Anti-Patterns

| # | ❌ Don't | ✅ Do Instead |
|---|---------|--------------|
| 1 | Assign without checking enabled agents | Fetch `sprintAiAgents` before assignment |
| 2 | Hardcode agent keys without classification | Use keyword-based classification |
| 3 | Assign to disabled agents without enabling first | Call `forloopSprintAiAgentsUpdate` first |
| 4 | Use `user` assigneeType for agent tasks | Use `agent` assigneeType with `assigneeAgentKey` |
| 5 | Leave ambiguous stories unassigned | Default to `forLoopDeveloper` for unclassified tasks |
| 6 | Assign development tasks while ECS is running | Check `forloopDeveloperStatus` first |

## Quality Gates

- [ ] Story intent classified before assignment
- [ ] Target agent is enabled for the sprint
- [ ] Developer availability checked via `forloopDeveloperStatus`
- [ ] `assigneeType` set to `"agent"`
- [ ] `assigneeAgentKey` matches one of: `forLoopDeveloper`, `forLoopTester`, `forLoopDevops`, `forLoopCreator`
- [ ] Fallback to `forLoopDeveloper` for ambiguous stories

## Acceptance Criteria

- [ ] Planner agent can list all available AI agents
- [ ] Planner agent can enable agents for the active sprint
- [ ] Planner agent can check developer availability via `forloopDeveloperStatus`
- [ ] Stories are classified correctly based on keywords and intent
- [ ] Stories are created with the correct `assigneeAgentKey`
- [ ] If target agent is not enabled, it is enabled before story creation
