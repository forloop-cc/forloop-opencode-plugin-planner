---
name: forloop-skill
description: >
  Manage ForLoop sprints, stories, and AI agents directly from opencode.
  Covers token setup, sprint management, story CRUD, and AI agent queries.
  Use when: setting up ForLoop integration, creating/managing sprints and stories,
  or querying AI agents for analysis.
  DO NOT use when: planning sprints (use sprint-planning), creating tasks
  (use task-tracking), or managing files (use file-management).
license: MIT
metadata:
  version: "1.0.0"
  category: administration
  sources:
    - ForLoop API documentation (forloop.cc)
---

# ForLoop Integration Skill

This skill enables you to manage ForLoop sprints, stories, and AI agents directly from opencode.

## Available Tools

### Token Management
- `forloop.token.set` - Set or update your ForLoop API token
- `forloop.token.get` - Check if a token is configured

### Sprint Management
- `forloop.sprint.get` - Get sprint details including stories and files
- `forloop.sprint.list` - List all accessible sprints

### Story Management
- `forloop.story.create` - Create a new story in a sprint
- `forloop.story.update` - Update an existing story
- `forloop.story.delete` - Delete a story

### AI Agent Integration
- `forloop.agent.query` - Query ForLoop AI agents for analysis or suggestions

## Setup

### 1. Create API Token

1. Go to [forloop.cc/profile?tab=api-tokens](https://forloop.cc/profile?tab=api-tokens)
2. Click "Create New Token"
3. Select scopes (recommended: `sprint:read`, `sprint:write`, `story:read`, `story:write`, `agent:query`)
4. Copy the token (it starts with `floop_`)

### 2. Configure Token

Use the tool:
```
forloop.token.set --token floop_abc123...
```

Or store manually in `~/.config/forloop/tokens.json`:
```json
{
  "default": "floop_abc123...",
  "lastUpdated": "2026-03-23T00:00:00.000Z"
}
```

## Context Resolution

The plugin automatically detects sprint context from:
1. **Explicit ID**: `--sprintId 123` flag
2. **Environment variable**: `FORLOOP_SPRINT_ID`
3. **Git branch**: Branches named `sprint-123` are auto-detected

## Examples

### List sprints
```
forloop.sprint.list
```

### Get sprint details
```
forloop.sprint.get --sprintId 123
```

### Create a story
```
forloop.story.create --title "Implement login" --sprintId 123 --priority high --points 5
```

### Query AI agent
```
forloop.agent.query --query "What stories are blocked?" --agentKey aivy
```

## Environment Variables

- `FORLOOP_API_URL` - API endpoint (default: `https://api.forloop.cc`)
- `FORLOOP_ENV` - Environment selector (`production` or `development`)
- `FORLOOP_ALLOW_DEV` - Set to `true` to allow dev API usage
- `FORLOOP_SPRINT_ID` - Default sprint ID
- `FORLOOP_TOKEN_SET` - Set to "true" when token is configured

## Troubleshooting

### "No API token configured"
Run `forloop.token.set --token <your-token>`

### "No sprint ID provided"
Use `--sprintId`, set `FORLOOP_SPRINT_ID`, or use a `sprint-XXX` branch

### "Insufficient permissions"
Create a new token with the required scopes

## Compliance

**API token must be configured before using any ForLoop tools.** Never hardcode tokens in files.

## Anti-Patterns

| # | ❌ Don't | ✅ Do Instead |
|---|---------|--------------|
| 1 | Hardcode API tokens in config files | Use `forloop.token.set` tool or `~/.config/forloop/tokens.json` |
| 2 | Use token without verifying scopes | Create token with required scopes (`sprint:read`, `story:write`, etc.) |
| 3 | Provide sprint ID via multiple conflicting methods | Use one method: flag, env var, or git branch |
| 4 | Share tokens in chat or commit them | Tokens start with `floop_` — treat as secrets |

## Quality Gates

- [ ] Token configured via `forloop.token.set`
- [ ] Token has required scopes for intended operations
- [ ] Sprint context resolved (flag, env var, or git branch)
- [ ] API URL correct for environment (`FORLOOP_ENV`)
