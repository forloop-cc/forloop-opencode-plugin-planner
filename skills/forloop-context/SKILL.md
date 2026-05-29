---
name: forloop-context
description: >
  Use at session start to load context from .forloop/ folder.
  ALWAYS executed first on every new agent session. Loads knowledge, plans,
  and tasks for continuity. Resolves sprint ID from manifest, env var, or git branch.
  DO NOT use when: mid-session (context already loaded), or when no
  .forloop/ folder exists and user doesn't want one created.
license: MIT
metadata:
  version: "1.0.0"
  category: planning
  sources:
    - ForLoop context management documentation
storage: ~/.forloop/
triggers: ["session start", "load context", "check sprint", "context loading"]
integrations: []
---

# ForLoop Context Management

## Overview

Handles session startup flow by automatically checking and loading context from the `~/.forloop/` folder. Ensures continuity across sessions by loading knowledge, plans, and tasks.

## When to Use

**ALWAYS executed at session start** - This is the first skill that runs on every new agent session.

### Triggers

- New agent session start
- User switches project directory
- Explicit context reload request

## Process Flow

```Markdown
digraph session_startup {
    rankdir=TB;
    "Session Start" [shape=doublecircle];
    "Check .forloop/" [shape=box];
    "Check manifest.json" [shape=box];
    ".forloop exists?" [shape=diamond];
    "Has manifest?" [shape=diamond];
    "Load from manifest" [shape=box];
    "Scan folders" [shape=box];
    "Build summary" [shape=box];
    "Present to user" [shape=box];
    "Create structure" [shape=box];
    
    "Session Start" -> "Check .forloop/";
    "Check .forloop/" -> "Check manifest.json";
    "Check manifest.json" -> ".forloop exists?";
    ".forloop exists?" -> "Has manifest?" [label="yes"];
    ".forloop exists?" -> "Create structure" [label="no"];
    "Has manifest?" -> "Load from manifest" [label="yes"];
    "Has manifest?" -> "Scan folders" [label="no/invalid"];
    "Load from manifest" -> "Build summary";
    "Scan folders" -> "Build summary";
    "Create structure" -> "Present to user";
    "Build summary" -> "Present to user";
}
```

## Workflow Steps

### Step 1: Resolve Context Directory

The manifest is always at `~/.forloop/manifest.json`.
Sprint files are at `~/.forloop/sprint-{sprintId}/`.

1. Check `~/.forloop/manifest.json` for `activeSprintId`
2. If manifest has active sprint, use `~/.forloop/sprint-{activeSprintId}/`
3. If no sprint selected, work at `~/.forloop/` root only

If `~/.forloop/` doesn't exist, create it.

**Outcomes:**

- **Manifest exists with active sprint:** Load from `~/.forloop/sprint-{id}/`
- **Manifest exists, no sprint:** Create structure, inform user of fresh start
- **No manifest:** Create `~/.forloop/` and manifest, inform user of fresh start

### Step 2: Check Manifest

**Read manifest:**
Read `manifest.json` from the resolved context directory.

**Expected manifest structure (v2):**

```json
{
  "version": 2,
  "activeSprintId": 14,
  "activeOrganizationId": 42,
  "sprints": {
    "14": {
      "sprintDir": "sprint-14",
      "plan": {
        "file": "sprint-14/plan/plan-14-20260410-093015.md",
        "createdAt": "2026-04-10T09:30:15Z"
      },
      "tasks": {
        "file": "sprint-14/task/task-14-20260410-093530.md",
        "storyIds": ["123", "124", "125"]
      }
    }
  }
}
```

**If manifest valid:**

- Use `activeSprintId` for context
- Load referenced plan and task files
- Skip folder scanning

**If manifest missing/invalid:**

- Fall back to folder scanning

### Step 3: Scan Folders (Fallback)

If manifest is missing/invalid, scan:

- `sprint-{id}/knowledge/` (latest 3) if sprint is known
- `sprint-{id}/plan/` (latest 1) if sprint is known
- `sprint-{id}/task/` (latest 1) if sprint is known

### Step 4: Load Recent Files

**Read content from:**

- Latest knowledge files (up to 3)
- Latest plan file
- Latest task file

**Extract:**

- Sprint IDs
- Story IDs
- Progress status
- Open questions
- Key knowledge points

### Step 5: Build Context Summary

**Compile into summary:**

```markdown
## Session Context Summary

### Knowledge Base
- {N} knowledge files
- Latest: {filename}
- Topics: {topics}

### Plans
- {N} plan files
- Active: plan-{sprintId}-{datetime}.md
- Sprint: #{sprintId}

### Tasks
- {N} task files
- Active: task-{sprintId}-{datetime}.md
- Stories: {count} created
- Progress: {done}/{total}
```

### Step 6: Present to User

**Display formatted summary:**

```
📁 Found .forloop Context

═══════════════════════════════════════

📚 Knowledge Base (3 files)
├─ knowledge-auth-flow-20260410-093015.md
├─ knowledge-api-design-20260409-142230.md
└─ knowledge-user-model-20260408-110500.md

📋 Plans (2 files)
├─ plan-14-20260410-093015.md (active)
│  Sprint: #14 | Goal: Auth System
│  Dates: Apr 10 - Apr 24
└─ plan-13-20260405-084500.md

✅ Tasks (2 files)
├─ task-14-20260410-093530.md (active)
│  Stories: 5 | Points: 21
│  ✅ Done: 2 | 🔄 In Progress: 1 | ⏳ Pending: 2
└─ task-13-20260405-090000.md

═══════════════════════════════════════

📊 Current Sprint Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sprint: #14 "Authentication System"
Timeline: Apr 10 - Apr 24 (14 days)
Progress: 2/5 stories complete (40%)
Points: 10/21 completed

Stories:
  ✅ #123: User registration (5 pts)
  ✅ #124: Login endpoint (3 pts)
  🔄 #125: Password reset (5 pts)
  ⏳ #126: JWT generation (3 pts)
  ⏳ #127: Auth middleware (5 pts)

═══════════════════════════════════════

How would you like to proceed?

1. Continue with current sprint
2. Review/modify tasks
3. Create new sprint plan
4. Something else
```

### Step 7: Aivy Doc Sync (Required)

If a working sprint is available (via `~/.forloop/manifest.json`, `FORLOOP_SPRINT_ID`, or git branch `sprint-XXX`), always run:

```
forloopSyncAivyFolder
forloopSyncS3ToLocal
```

If the user is not connected to any sprint yet, skip sync and proceed with normal onboarding.

### Step 8: Fetch Enabled AI Agents (Required)

If a sprint is active, fetch the enabled AI agents for the sprint:

```
# Get sprint details (includes sprintAiAgents array)
forloopSprintGet(sprintId=<activeSprintId>)
```

**Store in context:**
- Enabled agent keys: `['forLoopDeveloper', 'forLoopTester', 'forLoopDevops', 'forLoopCreator']`
- Agent catalog: from `forloopAiAgentList`

This enables the planner agent to:
1. Know which agents are available for story assignment
2. Enable missing agents if needed via `forloopSprintAiAgentsUpdate`
3. Auto-assign stories correctly using the agent-auto-assignment skill

If the sprint has no agents enabled, enable all four canonical agents:

```
forloopSprintAiAgentsUpdate(sprintId=<id>, enabledAgentKeys=["forLoopDeveloper","forLoopTester","forLoopDevops","forLoopCreator"])
```

## Fresh Session (No .forloop)

**If no .forloop directory:**

```
📁 No Previous Context Found

This appears to be a fresh project. I'll create the
.forloop folder structure for future sessions.

Created:
  .forloop/manifest.json
  .forloop/sync/

Sprint directories will be created when a sprint is selected:
  .forloop/sprint-{id}/knowledge/
  .forloop/sprint-{id}/plan/
  .forloop/sprint-{id}/task/

How would you like to get started?

1. Create a new sprint plan
2. Connect to existing ForLoop sprint
3. Learn about your project
```

**Create structure:**

```bash
mkdir -p .forloop/sync
```

**Initialize empty manifest:**

```json
{
  "version": 2,
  "activeSprintId": null,
  "sprints": {}
}
```

## Context Extraction

### From Knowledge Files

```markdown
Extract:
- Domain concepts
- Technical decisions
- Architecture patterns
- Constraints
```

**Example:**

```
From: knowledge-auth-flow-20260410-093015.md
- Auth method: JWT tokens
- Token expiry: 1 hour
- Providers: Email/password only
```

### From Plan Files

```markdown
Extract:
- Sprint ID and goal
- Timeline dates
- In-scope features
- Requirements
- Dependencies
```

**Example:**

```
From: plan-14-20260410-093015.md
- Sprint ID: 14
- Goal: "Implement auth system"
- Dates: Apr 10-24, 2026
```

### From Task Files

```markdown
Extract:
- Story IDs and titles
- Points
- Status
- Progress
```

**Example:**

```
From: task-14-20260410-093530.md
- Story #123: Registration (5 pts) - Done
- Story #124: Login (3 pts) - Done
- Story #125: Password reset (5 pts) - In Progress
```

## Error Handling

### Corrupted Directory

**Symptoms:**

- Cannot read files
- Malformed content

**Resolution:**

```
⚠️ Some .forloop files could not be read.

Options:
1. Recover what's readable
2. Start fresh (archive old files)
3. Manual review
```

### S3 Sync Mismatch

**Symptoms:**

- Local files differ from S3

**Resolution:**

```
⚠️ S3 sync mismatch detected.

Local: {count} files
S3: {count} files

Options:
1. Upload missing local files
2. Download missing S3 files
3. Manual reconciliation
```

### Missing Manifest Referenced File

**Symptoms:**

- Manifest points to non-existent file

**Resolution:**

```
⚠️ Manifest references missing file: {filename}

Options:
1. Repair manifest (scan for actual files)
2. Manually specify correct file
```

## Session Startup Checklist

- [ ] .forloop directory checked
- [ ] Manifest loaded (if exists)
- [ ] Folders scanned (if no manifest)
- [ ] Knowledge files loaded
- [ ] Plan files loaded
- [ ] Task files loaded
- [ ] Context summary built
- [ ] User presented with summary
- [ ] Structure created (if needed)
- [ ] Aivy doc sync completed (Step 7)
- [ ] Enabled AI agents fetched (Step 8)
- [ ] Conversation history loaded via `forloopAgentHistory`

## Integration with Other Skills

| Skill                  | Integration           |
| ---------------------- | --------------------- |
| `knowledge-management` | Loads knowledge files |
| `plan-documentation`   | Loads plan files      |
| `task-tracking`        | Loads task files      |
| `sprint-planning`      | Sets sprint context   |
| `aivy-documents-sync`  | Syncs S3 ↔ local (Step 7) |
| `agent-auto-assignment` | Fetches enabled agents (Step 8) |

## Best Practices

### Do

- ✅ Always run at session start
- ✅ Present clear, organized summary
- ✅ Highlight action items
- ✅ Offer relevant suggestions
- ✅ Create structure if missing

### Don't

- ❌ Skip context check
- ❌ Overwhelm with detail
- ❌ Assume user remembers
- ❌ Start work without direction

## Compliance

**This skill MUST run at session start before any other work.** Never skip context loading.

## Anti-Patterns

| # | ❌ Don't | ✅ Do Instead |
|---|---------|--------------|
| 1 | Skip context check at session start | Always check ~/.forloop/manifest.json first, then load sprint subdir |
| 2 | Load all file content into context | Use `head -50` for large files, summarize |
| 3 | Assume manifest is always valid | Validate manifest structure, fall back to folder scan |
| 4 | Start work without presenting context summary | Always present summary and ask for direction |
| 5 | Skip S3 sync after context load | Run `forloopSyncS3ToLocal` if sprint is active |
| 6 | Skip fetching enabled AI agents | Run `forloopSprintGet` to get `sprintAiAgents` |

## Quality Gates

- [ ] ~/.forloop/ directory and manifest.json checked (or created)
- [ ] manifest.json loaded and validated (v2 format with sprintDir)
- [ ] Knowledge, plan, and task files loaded
- [ ] Context summary built and presented to user
- [ ] Aivy doc sync completed (`forloopSyncAivyFolder` + `forloopSyncS3ToLocal`)
- [ ] Enabled AI agents fetched and stored in context
- [ ] Conversation history loaded via `forloopAgentHistory`

## Performance

### Optimization

```bash
# Only read last 7 days for large bases
find .forloop -mtime -7 -name "*.md"

# Limit file content
head -50 {file}
```

***

**Version:** 1.0.0\
**Created:** 2026-04-10
