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
  version: "1.0.0"
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

| Key | Name | Purpose | Default Enabled |
|-----|------|---------|-----------------|
| `planner` | `Aivy` | Planning, breakdown, story creation | true |
| `developer` | `Backy` | Implementation execution (server-side) | true |
| `deployer` | `Easter` | Deployment + infrastructure execution | true |

## Auto-Assignment Classification Rules

### Assign to `planner` (Aivy)

- Discovery and requirements gathering
- Story breakdown into subtasks
- Acceptance criteria writing
- Story point estimation
- Story writing and refinement
- Planning documentation
- Template creation
- Sprint planning and organization

**Keywords**: discover, requirements, breakdown, acceptance, criteria, estimate, planning, refine, document, organize, template

### Assign to `developer` (Backy)

- Backend implementation (server, API, database)
- Frontend implementation (UI, components, styling)
- Test writing (unit, integration, e2e)
- Bug fixes
- Code refactoring
- Feature implementation

**Keywords**: implement, develop, code, backend, frontend, test, fix, bug, refactor, feature, build, create, write

### Assign to `deployer` (Easter)

- AWS resource creation and configuration
- Lambda function deployment
- CI/CD pipeline setup
- Secrets and environment configuration
- Infrastructure as Code (Terraform, CloudFormation)
- Release and deployment management
- Serverless framework configuration

**Keywords**: deploy, aws, lambda, infrastructure, ci/cd, pipeline, secrets, environment, release, serverless, cloudformation, terraform

## Workflow

### Step 1: Fetch Sprint and Enabled Agents

At the start of planning session:
1. Get the active sprint ID (from context, flag, or git branch)
2. Fetch sprint details including `sprintAiAgents` array
3. Store enabled agent keys in context for quick lookup

### Step 2: Classify Story Intent

When creating a story, analyze the story title and description to determine intent:

```
IF contains(planner keywords) AND NOT contains(developer/deployer keywords)
  → assign to planner
ELSE IF contains(developer keywords) OR is implementation/bug/test
  → assign to developer
ELSE IF contains(deployer keywords) OR is infrastructure/deployment
  → assign to deployer
ELSE
  → default to planner
```

### Step 3: Enable Agent if Needed

If the target agent is not enabled for the sprint:
1. Call `forloopSprintAiAgentsUpdate` with the agent key
2. Wait for confirmation that agent is enabled

### Step 4: Create Story with Assignment

Create the story with:
```json
{
  "title": "...",
  "description": "...",
  "sprintId": <sprintId>,
  "assigneeType": "agent",
  "assigneeAgentKey": "<agentKey>"
}
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
forloopSprintAiAgentsUpdate(sprintId=<id>, enabledAgentKeys='["forLoopDeveloper","forLoopTester","forLoopDevops","forLoopCreator"]')
```

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

## Compliance

**Classification rules are mandatory.** Never assign agents without analyzing story intent first.

## Anti-Patterns

| # | ❌ Don't | ✅ Do Instead |
|---|---------|--------------|
| 1 | Assign without checking enabled agents | Fetch `sprintAiAgents` before assignment |
| 2 | Hardcode agent keys without classification | Use keyword-based classification |
| 3 | Assign to disabled agents without enabling first | Call `forloopSprintAiAgentsUpdate` first |
| 4 | Use `user` assigneeType for agent tasks | Use `agent` assigneeType with `assigneeAgentKey` |
| 5 | Leave ambiguous stories unassigned | Default to `planner` for unclassified stories |

## Quality Gates

- [ ] Story intent classified before assignment
- [ ] Target agent is enabled for the sprint
- [ ] `assigneeType` set to `"agent"`
- [ ] `assigneeAgentKey` matches canonical key (planner/developer/deployer)
- [ ] Fallback to planner for ambiguous stories

## Acceptance Criteria

- [ ] Planner agent can list all available AI agents
- [ ] Planner agent can enable agents for the active sprint
- [ ] Stories are classified correctly based on keywords and intent
- [ ] Stories are created with the correct `assigneeType` and `assigneeAgentKey`
- [ ] If target agent is not enabled, it is enabled before story creation
- [ ] Fallback to planner for unclassified stories
