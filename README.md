<div align="center">

<img src="docs/images/forloop-opencode-header.png" alt="ForLoop Plugin for opencode" width="800">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/forloop-cc/forloop-opencode-plugin-planner?style=flat-square)](https://github.com/forloop-cc/forloop-opencode-plugin-planner/stargazers)

**Manage sprints, stories, and AI agents directly from your opencode IDE**

[Quick Install](#quick-install) · [Tools](#tools) · [Skills](#skills) · [Agents](#agents) · [How It Works](#how-it-works) · [FAQ](#faq)

</div>

---

## What is This?

The **ForLoop Plugin** extends [opencode](https://opencode.ai) with ForLoop project management. Use `forloop.*` commands inside opencode chat to manage sprints, stories, AI agents, files, and teams — without leaving your IDE.

---

## How It Works

<img src="docs/images/forloop-opencode-flow.png" alt="ForLoop Plugin workflow" width="800">

1. **You describe** what you need in opencode chat
2. **The plugin** detects the right skill and agent
3. **AI agents** query your ForLoop account and execute tasks
4. **Results** appear inline — sprints updated, stories created, files uploaded

---

## Quick Install

```bash
curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/install.sh | bash
```

**What this does:** clones the plugin, installs dependencies, and configures opencode to find it. Works on macOS, Linux, and Windows (Git Bash).

**Install options:**
```bash
curl -fsSL .../install.sh | bash           # Interactive (asks local vs global)
curl -fsSL .../install.sh | bash -s -- -g  # Global install (~/.config/opencode/)
curl -fsSL .../install.sh | bash -s -- -l  # Local install (.opencode/ in current dir)
```

**To update later:**
```bash
curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/update.sh | bash
```

### Prerequisites

- **opencode** CLI (install via `curl -fsSL https://opencode.ai/install.sh | bash`)
- **ForLoop** account at [forloop.cc](https://forloop.cc)
- **API token** with required scopes (see below)

### Create an API Token

1. Go to [forloop.cc/profile?tab=api-tokens](https://forloop.cc/profile?tab=api-tokens)
2. Click **Create New Token**
3. Select scopes: `sprint:read`, `sprint:write`, `story:read`, `story:write`, `agent:query`, `profile:read`
4. Copy the token (starts with `floop_`)

### Set Your Token

```bash
# Inside opencode:
forloop.token.set --token floop_your_token_here

# Verify:
forloop.token.get
```

---

## Quick Start

```bash
# List your sprints
forloop.sprint.list

# Create a story
forloop.story.create --title "Add user authentication" --sprintId 14 --priority high

# Get AI assistance
forloop.agent.breakdown --storyId 78

# View sprint progress
forloop.sprint.get --sprintId 14 --includeStories true
```

---

## Tools

### Sprint Management

| Tool | Description |
|------|-------------|
| `forloop.sprint.list` | List all sprints |
| `forloop.sprint.get` | Get sprint details (`--includeStories`) |
| `forloop.sprint.create` | Create a new sprint |
| `forloop.sprint.update` | Update sprint info |
| `forloop.sprint.delete` | Delete sprint (`--confirm true`) |

### Story Management

| Tool | Description |
|------|-------------|
| `forloop.story.create` | Create a story |
| `forloop.story.get` | Get story details |
| `forloop.story.update` | Update story |
| `forloop.story.delete` | Delete story |
| `forloop.story.template` | Create from template |

### AI Agents

| Tool | Description |
|------|-------------|
| `forloop.agent.query` | Query AI agent |
| `forloop.agent.breakdown` | Break down a story |
| `forloop.agent.estimate` | Estimate story points |
| `forloop.agent.suggest` | Get AI suggestions |
| `forloop.agent.history` | View conversation history |
| `forloop.agent.clear` | Clear history |

### Files & Documents

| Tool | Description |
|------|-------------|
| `forloop.file.upload` | Upload file to S3 |
| `forloop.file.list` | List sprint files |
| `forloop.file.download` | Get download URL |
| `forloop.file.delete` | Delete file |
| `forloop.doc.folder` | Create document folder |

### Users & Organizations

| Tool | Description |
|------|-------------|
| `forloop.token.set` | Set API token |
| `forloop.token.get` | Check token status |
| `forloop.user.profile` | View your profile |
| `forloop.user.quotas` | Check usage quotas |
| `forloop.organization.list` | List organizations |
| `forloop.organization.create` | Create organization |
| `forloop.organization.quotas` | Organization quotas |

---

## Skills

Skills are guided workflows that auto-load when relevant. Just describe what you need — the right skill activates automatically.

| Skill | Activates when you say... |
|-------|--------------------------|
| **sprint-planning** | "Plan sprint", "setup sprint" |
| **story-creation** | "Create story", "user story" |
| **story-points** | "Estimate", "story points" |
| **forloop-context** | "What's in this sprint?" |
| **task-tracking** | "Track tasks", "task status" |
| **knowledge-management** | "Document this", "save context" |
| **file-management** | "Upload file", "create folder" |
| **user-management** | "My profile", "organizations" |
| **tech-stack-default** | New project setup |
| **verification-before-completion** | Before wrapping up work |

---

## Agents

Switch between agents with **TAB** or **@mention**:

| Agent | Use for... |
|-------|-----------|
| **ForLoop Planner** (`TAB`) | Sprint planning, story creation, task breakdown |
| **Story Evaluator** (`@story-evaluator`) | Point estimation, complexity analysis |

---

## FAQ

**Does this work on Windows?** Yes — use Git Bash or WSL.

**What's opencode?** A free, open-source AI coding assistant. Install at [opencode.ai](https://opencode.ai).

**Do I need to know TypeScript?** No. Just use `forloop.*` commands in opencode chat.

**Where is my token stored?** `~/.config/forloop/tokens.json` with restricted permissions.

**How do I rotate tokens?** Create a new token on ForLoop, then run `forloop.token.set --token floop_new_token`.

**Can I auto-detect my sprint?** Yes — name your git branch `sprint-XXX` or set `FORLOOP_SPRINT_ID=14`.

**How do I uninstall?** Delete the plugin directory: `rm -rf ~/.config/opencode/plugins/forloop-planner` (global) or `rm -rf .opencode/plugins/forloop-planner` (local).

---

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Security

See [SECURITY.md](SECURITY.md). Never commit API tokens. Use minimum required scopes.

---

## License

MIT — see [LICENSE](LICENSE).
