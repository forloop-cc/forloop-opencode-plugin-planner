<div align="center">

# ForLoop Plugin for opencode

[![Version](https://img.shields.io/npm/v/@forloop/opencode-plugin.svg)](https://www.npmjs.com/package/@forloop/opencode-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-110%20tests-brightgreen)](https://github.com/forloop-cc/forloop-opencode-plugin)
[![CI](https://github.com/forloop-cc/forloop-opencode-plugin/actions/workflows/test.yml/badge.svg)](https://github.com/forloop-cc/forloop-opencode-plugin/actions)
[![Stars](https://img.shields.io/github/stars/forloop-cc/forloop-opencode-plugin?style=flat-square)](https://github.com/forloop-cc/forloop-opencode-plugin/stargazers)

**Manage sprints, stories, and AI agents directly from your opencode IDE**

[Installation](#installation) • [Quick Start](#quick-start) • [Tools](#tools) • [Skills](#skills) • [Agents](#agents) • [Documentation](docs/) • [FAQ](#faq)

</div>

---

## 💡 What is This?

**ForLoop Plugin** extends [opencode](https://opencode.ai) (AI coding assistant) with ForLoop project management capabilities.

**How you use it:**
1. Install opencode (free, open-source)
2. Install this plugin
3. Use `forloop.*` commands inside opencode chat

**Not a CLI tool** - you don't run TypeScript files directly. Everything happens through opencode.

See [How Users Interact](docs/USER-INTERACTION-MODEL.md) for detailed architecture.

---

## Features

📋 **Sprint Management** - Create, update, and track sprints with stories  
📝 **Story Operations** - Full CRUD for stories with template support  
🤖 **AI Agent Integration** - Query AI agents for breakdowns, estimates, and suggestions  
🎯 **Schedule Meetings** - Create and manage scheduled meetings  
📁 **File Management** - Upload and organize files with S3 storage  
👥 **Organization Management** - Manage teams and quotas (Team/Enterprise)  
📚 **Workflow Skills** - Guided workflows for best practices  

---

## 🆚 Comparison

| Feature | ForLoop Plugin | Generic AI | Cursor/Copilot |
|---------|---------------|------------|----------------|
| Sprint Management | ✅ Built-in | ❌ Manual | ❌ Manual |
| Story Tracking | ✅ Integrated | ❌ External tools | ❌ External tools |
| AI Agent Integration | ✅ Native | ⚠️ Manual setup | ❌ Not available |
| Template Support | ✅ Pre-built templates | ⚠️ Manual | ❌ Limited |
| Workflow Skills | ✅ Guided workflows | ❌ None | ❌ None |
| File Management (S3) | ✅ Built-in | ❌ External | ❌ External |
| Organization Mgmt | ✅ Teams & quotas | ❌ Manual | ❌ Manual |
| Approval Gates | ✅ Required | ⚠️ Optional | ❌ Auto-execute |
| Token Efficiency | ✅ Minimal context | ❌ Full context | ❌ Full context |
| Team Standards | ✅ Shared context | ❌ Per-user | ❌ Per-user |

**Use ForLoop Plugin when:**
- ✅ You manage sprints and stories in ForLoop
- ✅ You want AI assistance integrated with your sprint workflow
- ✅ You need approval gates for quality control
- ✅ You care about token efficiency

**Use generic AI when:**
- You don't use ForLoop for project management
- You need quick prototypes without sprint tracking  

---

## Installation

### Requirements

- **opencode** installed (v0.1.0+)
- **ForLoop** account ([forloop.cc](https://forloop.cc))
- **API Token** with appropriate scopes

### Step 1: Create API Token

1. Go to [forloop.cc/profile?tab=api-tokens](https://forloop.cc/profile?tab=api-tokens)
2. Click **"Create New Token"**
3. Select required scopes:
   - ✅ `sprint:read`, `sprint:write`
   - ✅ `story:read`, `story:write`, `story:delete`
   - ✅ `agent:query`
   - ✅ `profile:read`
   - ✅ `organization:read`, `organization:write` (Team/Enterprise only)
   - ✅ `file:read`, `file:write` (optional)
4. Copy the generated token (starts with `floop_`)

### Step 2: Install Plugin

Add to your project's `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["forloop@git+https://github.com/forloop-cc/forloop-opencode-plugin.git"]
}
```

Or install locally:
```bash
git clone https://github.com/forloop-cc/forloop-opencode-plugin.git
npm install
npm run build
npm run install:local
```

### Step 3: Configure Token

```bash
# Inside opencode, run:
forloop.token.set --token floop_your_token_here
```

Or manually create token file:
```bash
cat > ~/.config/forloop/tokens.json << EOF
{
  "default": "floop_your_token_here",
  "lastUpdated": "2026-03-29T00:00:00.000Z"
}
EOF
```

---

## Quick Start

### 1. Check Your Setup

```bash
# Verify token is configured
forloop.token.get

# List available sprints
forloop.sprint.list
```

### 2. Create a Story

```bash
# Simple story
forloop.story.create \
  --title "As a user, I want to login" \
  --sprintId 14 \
  --priority high

# With template (recommended)
forloop.story.template \
  --templateSlug basic-task \
  --taskTitle "Implement login API" \
  --sprintId 14 \
  --assigneeAgentKey developer \
  --priority high \
  --points 5
```

### 3. Get AI Assistance

```bash
# Get story breakdown
forloop.agent.breakdown --storyId 78

# Estimate story points
forloop.agent.estimate --storyId 78

# Query AI agent
forloop.agent.query \
  --query "Analyze sprint 14 progress" \
  --agentKey developer
```

---

## Tools

### Token Management

| Tool | Description | Example |
|------|-------------|---------|
| `forloop.token.set` | Set API token | `--token floop_xxx` |
| `forloop.token.get` | Check token status | - |

### Sprint Management

| Tool | Description | Example |
|------|-------------|---------|
| `forloop.sprint.list` | List all sprints | `--organizationId 14` |
| `forloop.sprint.get` | Get sprint details | `--sprintId 14 --includeStories true` |
| `forloop.sprint.create` | Create new sprint | `--title "Sprint 15" --startDate 2026-04-01 --endDate 2026-04-14` |
| `forloop.sprint.update` | Update sprint | `--sprintId 14 --title "Updated Sprint"` |
| `forloop.sprint.delete` | Delete sprint | `--sprintId 14 --confirm true` |

### Story Management

| Tool | Description | Example |
|------|-------------|---------|
| `forloop.story.create` | Create story | `--title "Feature" --sprintId 14` |
| `forloop.story.get` | Get story details | `--storyId 78` |
| `forloop.story.update` | Update story | `--storyId 78 --status done` |
| `forloop.story.delete` | Delete story | `--storyId 78` |
| `forloop.story.template` | Create with template | `--templateSlug basic-task --taskTitle "Task"` |

### AI Agent Tools

| Tool | Description | Example |
|------|-------------|---------|
| `forloop.agent.query` | Query AI agent | `--query "Analyze sprint" --agentKey developer` |
| `forloop.agent.suggest` | Get suggestions | `--type sprint_planning --sprintId 14` |
| `forloop.agent.breakdown` | Break down story | `--storyId 78` |
| `forloop.agent.estimate` | Estimate story | `--storyId 78` |
| `forloop.agent.history` | View conversation history | `--sprintId 14` |
| `forloop.agent.clear` | Clear history | `--sprintId 14 --confirm true` |

### Schedule Management

| Tool | Description | Example |
|------|-------------|---------|
| `forloop.schedule.create` | Schedule meeting | `--sprintId 14 --title "Review" --startAt 2026-04-01T10:00:00Z` |
| `forloop.schedule.update` | Update schedule | `--storyId 78 --title "Updated Review"` |

### File Management

| Tool | Description | Example |
|------|-------------|---------|
| `forloop.file.upload` | Upload file | `--filePath ./doc.pdf --sprintId 14` |
| `forloop.file.list` | List files | `--sprintId 14` |
| `forloop.file.delete` | Delete file | `--fileId 123 --confirm true` |
| `forloop.file.download` | Get download URL | `--fileId 123` |
| `forloop.doc.folder` | Create folder | `--sprintId 14 --title "Documentation"` |

### User & Organization

| Tool | Description | Example |
|------|-------------|---------|
| `forloop.user.profile` | Get user profile | - |
| `forloop.user.quotas` | Check quotas | - |
| `forloop.organization.list` | List organizations | --ownedOnly true |
| `forloop.organization.get` | Get org details | `--organizationId 123` |
| `forloop.organization.create` | Create org | `--name "Team Alpha"` |
| `forloop.organization.update` | Update org | `--organizationId 123 --name "Team Beta"` |
| `forloop.organization.delete` | Delete org | `--organizationId 123 --confirm true` |
| `forloop.organization.quotas` | Get org quotas | `--organizationId 123` |

---

## Skills

Skills provide guided workflows for common tasks. They auto-load when appropriate.

### Available Skills

| Skill | Description | Triggers |
|-------|-------------|----------|
| **sprint-planning** | Sprint planning workflow | "Plan sprint", "sprint setup" |
| **story-creation** | Story best practices | "Create story", "user story" |
| **story-points** | Estimation framework | "Estimate", "story points", "complexity" |
| **template-based-tasks** | Template-based creation | "Create task", "basic task" |
| **user-management** | User & org management | "My profile", "quotas", "organization" |
| **file-management** | File operations | "Upload file", "download", "document folder" |

### Example Skill Usage

**Using sprint-planning skill:**
```
User: "Help me plan sprint 43"
Agent: [Auto-loads sprint-planning skill]
Agent: [Guides through: list sprints → create sprint → populate with stories → estimate]
```

**Using template-based-tasks skill:**
```
User: "Create a task for the developer agent"
Agent: [Auto-loads template-based-tasks skill]
Agent: [Uses basic-task template with proper fields]
```

---

## Agents

### Specialized Agents

Switch between agents with **TAB** or mention with **@**:

| Agent | Type | Description |
|-------|------|-------------|
| **ForLoop Planner** | Primary (TAB) | Sprint planning specialist |
| **Story Evaluator** | Subagent (@mention) | Story point estimation |

### Example Agent Workflows

**ForLoop Planner Agent:**
```
1. Press TAB to switch to ForLoop Planner
2. Ask: "Help me plan sprint 43"
3. Agent guides through complete sprint planning workflow
```

**Story Evaluator Agent:**
```
@story-evaluator estimate: As a user, I want to login
@story-evaluator analyze: Story #78 complexity
```

---

## Configuration

### opencode.json

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["forloop@git+https://github.com/forloop-cc/forloop-opencode-plugin.git"],
  "permission": {
    "skill": {
      "sprint-*": "allow",
      "story-*": "allow",
      "template-*": "allow",
      "user-*": "allow",
      "file-*": "allow"
    }
  }
}
```

### Environment Variables

```bash
# Set sprint ID from environment
export FORLOOP_SPRINT_ID=14

# Or use git branch name
git checkout -b sprint-14 # Auto-detects sprint ID
```

---

## Usage Examples

### Complete Sprint Planning

```bash
# 1. Check current sprints
forloop.sprint.list

# 2. Create stories with templates
forloop.story.template \
  --templateSlug basic-task \
  --taskTitle "Implement login API" \
  --sprintId 14 \
  --priority high \
  --points 5

# 3. Get AI breakdown
forloop.agent.breakdown --storyId 78

# 4. Estimate remaining stories
forloop.agent.estimate --storyId 79

# 5. Review sprint
forloop.sprint.get --sprintId 14 --includeStories true
```

### Daily Standup

```bash
# Get sprint progress
forloop.sprint.get --sprintId 14

# AI-generated summary
forloop.agent.query \
  --query "What is the progress on sprint 14? Any blockers?" \
  --agentKey project_manager
```

### Organization Management

```bash
# List your organizations
forloop.organization.list

# Create new team org
forloop.organization.create \
  --name "Engineering Team" \
  --description "Core development team"

# Check quotas
forloop.user.quotas
forloop.organization.quotas --organizationId 123
```

### File Management

```bash
# Create documentation folder
forloop.doc.folder \
  --sprintId 14 \
  --title "Sprint Documentation"

# Upload files
forloop.file.upload \
  --filePath ./requirements.pdf \
  --sprintId 14 \
  --description "Project requirements"

# List all files
forloop.file.list --sprintId 14
```

### Meeting Scheduling

```bash
# Schedule sprint review
forloop.schedule.create \
  --sprintId 14 \
  --title "Sprint 14 Review" \
  --startAt "2026-04-01T14:00:00Z" \
  --endAt "2026-04-01T15:00:00Z" \
  --videoUrl "https://zoom.us/j/123456789"

# Update meeting
forloop.schedule.update \
  --storyId 78 \
  --title "Sprint 14 Review (Updated)"
```

---

## Troubleshooting

### "No token configured"

```bash
# Check token file
cat ~/.config/forloop/tokens.json

# Re-set token
forloop.token.set --token floop_your_token_here
```

### "Unauthorized" errors

**Cause:** Token scopes missing or expired

**Solution:**
1. Go to forloop.cc/profile?tab=api-tokens
2. Create new token with required scopes
3. Update: `forloop.token.set --token floop_new_token`

### "Route not found"

**Cause:** Phase 3 routes not deployed

**Solution:** Wait for deployment to complete, then retry

### Token Migration

If upgrading from v2.x:
```bash
npm run migrate-tokens
```

This moves tokens from `~/.config/opencode/tokens.json` to `~/.config/forloop/tokens.json`

---

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/forloop-cc/forloop-opencode-plugin.git

# Install dependencies
npm install

# Build
npm run build

# Install locally
npm run install:local
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# Live API tests
cd test/29032026-api
export $(cat .env | xargs)
npx tsx test-final.ts

# All tests
npm test
```

### Test Coverage

- ✅ **54** unit tests (all tools)
- ✅ **5** live API tests
- ✅ **26** skill tests
- ✅ **25** agent tests
- **Total: 110 tests**

---

## Version History

### v3.0.0 (2026-03-29)

**New Features:**
- ✅ User profile & quotas
- ✅ Organization management (Team/Enterprise)
- ✅ File upload/management (S3)
- ✅ Schedule meetings
- ✅ Document folders
- ✅ Enhanced story creation with templates

**Bug Fixes:**
- ✅ Jose module compatibility (CommonJS)
- ✅ Token storage path fixed

**Breaking Changes:**
- ⚠️ Token storage moved to `~/.config/forloop/tokens.json`
- ⚠️ Run `npm run migrate-tokens` after upgrade

### v2.1.0 (2026-03-24)

- AI agent integration improvements
- Template support for stories
- Skills: sprint-planning, story-creation, story-points

### v2.0.0 (2026-03-23)

- AI agent query, breakdown, estimate
- Sprint CRUD operations
- Story CRUD operations

### v1.0.0 (2026-03-20)

- Initial release
- Token management
- Basic sprint operations

---

## 💡 Pro Tips

### Maximize Productivity

1. **Use Templates**
   ```bash
   # Faster than creating stories from scratch
   forloop.story.template --templateSlug basic-task --taskTitle "New Feature" --sprintId 14
   ```

2. **Auto-detect Sprint from Git Branch**
   ```bash
   # Name your branch sprint-XXX for auto-detection
   git checkout -b sprint-14
   # Now you can omit --sprintId flag
   forloop.story.create --title "New story"
   ```

3. **Set Environment Variable**
   ```bash
   # Add to your .bashrc or .zshrc
   export FORLOOP_SPRINT_ID=14
   ```

4. **Get AI Help for Complex Stories**
   ```bash
   # Break down large stories
   forloop.agent.breakdown --storyId 78
   
   # Estimate points
   forloop.agent.estimate --storyId 78
   ```

5. **Batch Update Stories**
   ```bash
   # Update multiple stories in sequence
   forloop.story.update --storyId 78 --status done
   forloop.story.update --storyId 79 --status in_progress
   ```

### Keep Context Updated

Run `/add-context --update` after:
- Adding new libraries to your project
- Changing API patterns or component structures
- Updating security requirements
- Migrating tech stack

Agents automatically use updated patterns.

---

## ❓ FAQ

### Understanding the Plugin

**Q: Do I run TypeScript files directly?**  
A: **No!** This is a plugin for opencode, not a standalone CLI. You use `forloop.*` commands inside opencode chat. See [How Users Interact](docs/USER-INTERACTION-MODEL.md).

**Q: What is opencode?**  
A: [opencode](https://opencode.ai) is a free, open-source AI coding assistant. This plugin extends it with ForLoop project management features.

**Q: Do I need to know TypeScript to use this?**  
A: **No!** End users only need to know the `forloop.*` commands. TypeScript is only for plugin developers.

### Getting Started

**Q: Does this work on Windows?**  
A: Yes! Use Git Bash (recommended) or WSL.

**Q: What models are supported?**  
A: Any model from any provider (Claude, GPT, Gemini, local models). The plugin is model-agnostic.

**Q: Do I need a ForLoop account?**  
A: Yes, you need a ForLoop account at [forloop.cc](https://forloop.cc) with API tokens configured.

**Q: Can I use this without adding context?**  
A: Yes, it works out of the box. But adding your project context (10-15 minutes with `/add-context`) makes agents much more effective.

### Token & Authentication

**Q: Where are tokens stored?**  
A: Tokens are stored in `~/.config/forloop/tokens.json` with restricted file permissions (0o600).

**Q: How do I rotate my token?**  
A: Simply run `forloop.token.set --token floop_new_token` with your new token.

**Q: What scopes do I need?**  
A: Minimum scopes: `sprint:read`, `sprint:write`, `story:read`, `story:write`, `agent:query`, `profile:read`. Add `organization:*` and `file:*` for advanced features.

### Sprint Management

**Q: How do I switch between sprints?**  
A: Use `--sprintId` flag, set `FORLOOP_SPRINT_ID` env variable, or use git branch naming (`sprint-XXX`).

**Q: Can I have multiple sprints active?**  
A: Yes, you can work across multiple sprints. Just specify the `--sprintId` for each operation.

**Q: What happens if I delete a sprint?**  
A: All stories in that sprint are also deleted. Use `--confirm true` to prevent accidental deletion.

### Skills & Agents

**Q: What are skills?**  
A: Skills are guided workflows that auto-load based on your requests. They provide best practices for sprint planning, story creation, estimation, etc.

**Q: How do I use skills?**  
A: Skills auto-load based on triggers. For example, saying "plan my sprint" triggers the `sprint-planning` skill.

**Q: Can I customize skills?**  
A: Yes! Skills are markdown files in the `skills/` directory. Edit them to match your workflow.

### Troubleshooting

**Q: "No API token configured"**  
A: Run `forloop.token.set --token floop_your_token`

**Q: "Unauthorized" errors**  
A: Your token may be expired or missing scopes. Create a new token at forloop.cc/profile?tab=api-tokens

**Q: "Route not found"**  
A: Some API routes may not be deployed yet. Check the changelog for deployment status.

**Q: Tests failing**  
A: Integration tests require a valid API token. Set `FORLOOP_TEST_TOKEN` environment variable.

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Reporting bugs
- Suggesting features
- Submitting pull requests
- Code style and testing

---

## 🔒 Security

See [SECURITY.md](SECURITY.md) for our security policy and how to report vulnerabilities.

**Security best practices:**
- Never commit API tokens to version control
- Use minimum required scopes for tokens
- Rotate tokens regularly
- Review token access periodically

---

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 📞 Support

**Documentation:** [docs/](docs/)  
**Issues:** [GitHub Issues](https://github.com/forloop-cc/forloop-opencode-plugin/issues)  
**Website:** [forloop.cc](https://forloop.cc)  
**API Docs:** [API Specification](docs/API_SPECIFICATION.md)

---

<div align="center">

**Made with ❤️ by the ForLoop Team**

[Report Bug](https://github.com/forloop-cc/forloop-opencode-plugin/issues) · [Request Feature](https://github.com/forloop-cc/forloop-opencode-plugin/issues)

</div>
