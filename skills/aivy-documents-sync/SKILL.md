---
name: aivy-documents-sync
description: >
  Keep ~/.forloop documents synced with Sprint S3.
  Use when starting a session, after writing files under ~/.forloop/*,
  or when local and S3 documents need reconciliation.
  DO NOT use when: only reading documents (no changes made),
  or when no sprint is active.
license: MIT
metadata:
  version: "1.0.0"
  category: planning
  sources:
    - ForLoop S3 sync documentation
storage: ~/.forloop/sprint-{id}/
triggers: session start, after writing files under ~/.forloop/*
---

# ForLoop Aivy Documents Sync

## Goal

Maintain a working local document set under `~/.forloop/*` that stays in sync with the active sprint:

1. Ensure a `doc_folder` titled `forloop Aivy doc` exists in the working sprint
2. Sync Sprint files from S3 to local at session start
3. Sync local file changes to S3 immediately after any create/update/delete under `~/.forloop/*`

## Session Start (Required)

If a working sprint is available (via `~/.forloop/manifest.json`, `FORLOOP_SPRINT_ID`, or git branch `sprint-XXX`), run:

```
forloopSyncAivyFolder()
forloopSyncS3ToLocal()
```

## Local → S3 (Required After File Changes)

After creating or updating a file under:

- `.forloop/sprint-{id}/knowledge/*`
- `.forloop/sprint-{id}/plan/*`
- `.forloop/sprint-{id}/task/*`

Run:

```
forloopSyncLocalToS3(filePath={path}, sprintId={sprintId})
```

After deleting a file, run:

```
forloopSyncLocalToS3(filePath={path}, sprintId={sprintId}, action=delete)
```

## What Gets Synced

- Files under `project/knowledge`, `project/plans`, and `project/tasks` are synced to local `sprint-{id}/knowledge/`, `sprint-{id}/plan/`, and `sprint-{id}/task/`.
- When folder metadata is unavailable, the sync falls back to filename prefixes: `knowledge-*`, `plan-*`, `task-*`.

## Compliance

**Sync must run after every file change under ~/.forloop/**. Never skip the sync step.

## Anti-Patterns

| # | ❌ Don't | ✅ Do Instead |
|---|---------|--------------|
| 1 | Modify files without syncing to S3 | Run `forloopSyncLocalToS3` immediately after changes |
| 2 | Delete local files without syncing deletion | Use `action=delete` parameter |

- [ ] Deletions synced with `action=delete`
1. Run `forloopFileList(sprintId={sprintId})`
2. Confirm the expected file appears and `createdAt` is current
