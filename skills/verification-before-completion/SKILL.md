---
name: verification-before-completion
description: >
  Use when about to claim work is complete, before uploading files or creating stories.
  Evidence before claims, always. NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.
  Applies to ALL planning operations: file uploads, story creation, S3 sync, sprint updates.
  DO NOT use when: mid-operation (not yet claiming completion).
license: MIT
metadata:
  version: "1.0.0"
  category: quality
  sources:
    - ForLoop verification standards
integrations: [file-management, plan-documentation, task-tracking, knowledge-management]
---

# Verification Before Completion

## Overview

**Evidence before claims, always.**

Claiming work is complete without verification is dishonesty, not efficiency. This skill ensures all planning artifacts are verified with fresh command output before claiming completion.

**Core principle:** NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE.

**Violating the letter of this rule is violating the spirit of this rule.**

---

## The Iron Law

```
BEFORE claiming any status or expressing satisfaction:

1. IDENTIFY: What command proves this claim?
2. RUN: Execute the FULL command (fresh, complete)
3. READ: Full output, check exit code, count failures
4. VERIFY: Does output confirm the claim?
   - If NO: State actual status with evidence
   - If YES: State claim WITH evidence
5. ONLY THEN: Make the claim

Skip any step = lying, not verifying
```

---

## When to Use

**ALWAYS before:**
- ✅ Any variation of success/completion claims
- ✅ Any expression of satisfaction ("Great!", "Perfect!", "Done!")
- ✅ Any positive statement about work state
- ✅ Committing, PR creation, task completion
- ✅ Moving to next task
- ✅ Delegating to agents

**Applies to:**
- Exact phrases
- Paraphrases and synonyms
- Implications of success
- ANY communication suggesting completion/correctness

---

## Common Failures

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Plan uploaded | `forloopFileList` output shows file | Previous run, "should upload" |
| Stories created | `forloopSprintGet --includeStories true` shows IDs | Tool returned success |
| Knowledge captured | `forloopFileList` shows knowledge file | File created locally |
| S3 synced | Fresh `forloopFileList` output | "Upload looked successful" |
| Sprint updated | `forloopSprintGet` shows changes | Tool returned no error |

---

## Verification Commands

### Plan Documentation
```
# After uploading plan
forloopFileList(sprintId={id})

# Verify: plan-{sprintId}-{datetime}.md appears in list
# Read: Full output, confirm filename matches
```

### Task Tracking
```
# After creating stories
forloopSprintGet(sprintId={id}, includeStories=true)

# Verify: Story IDs from creation appear in sprint
# Read: Check story count matches expected
```

### Knowledge Management
```
# After uploading knowledge
forloopFileList(sprintId={id})

# Verify: knowledge-{topic}-{datetime}.md appears in list
# Read: Confirm file size > 0
```

### File Management
```
# After any upload
forloopFileList(sprintId={id})

# Verify: Uploaded file appears in list
# Read: Check file size matches expected
```

---

## Red Flags - STOP

**If you catch yourself:**
- Using "should", "probably", "seems to"
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!", etc.)
- About to claim success without running verification
- Trusting tool success reports without checking
- Relying on partial verification
- Thinking "just this once"
- Tired and wanting work over
- **ANY wording implying success without having run verification**

**ALL of these mean: STOP. Run the verification command first.**

---

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | RUN the verification |
| "I'm confident" | Confidence ≠ evidence |
| "Just this once" | No exceptions |
| "Upload looked successful" | Lister passing ≠ file uploaded |
| "Tool returned success" | Verify independently |
| "I'm tired" | Exhaustion ≠ excuse |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |
| "Skip verification, we're in a hurry" | Rushing guarantees rework |
| "The user already confirmed" | User confirmation ≠ technical verification |

---

## Key Patterns

### File Uploads
```
✅ [Run forloopFileList] [See: plan-14-20260410-093015.md in list] "Plan uploaded (verified)"
❌ "Should be uploaded now" / "Upload command succeeded"
```

### Story Creation
```
✅ [Run forloopSprintGet --includeStories true] [See: 5 stories, IDs match] "Stories created (verified)"
❌ "forloopStoryTemplate returned IDs" / "Stories should exist"
```

### S3 Sync
```
✅ [Run forloopFileList] [See: all files present with correct sizes] "S3 synced (verified)"
❌ "Uploads completed" / "Files look synced"
```

---

## Why This Matters

From verification failures:
- User said "I don't believe you" - trust broken
- Files not actually uploaded - data loss
- Stories missing from sprint - incomplete work
- Time wasted on false completion → redirect → rework
- Violates: "Honesty is a core value"

---

## Integrated Workflows

### Plan Documentation Integration
```markdown
### Step 6: Upload to S3

**Tool:** `forloopFileUpload`

**After upload, BEFORE claiming complete:**
1. Run: `forloopFileList --sprintId {id}`
2. Read: Full output
3. Verify: plan file appears in list
4. ONLY THEN: Claim "Plan uploaded successfully"
```

### Task Tracking Integration
```markdown
### Step 9: Upload to S3

**After upload, BEFORE claiming complete:**
1. Run: `forloopSprintGet --sprintId {id} --includeStories true`
2. Read: Story count and IDs
3. Verify: All story IDs exist
4. ONLY THEN: Claim "Tasks created successfully"
```

### Knowledge Management Integration
```markdown
### Step 5: Upload to S3

**After upload, BEFORE claiming complete:**
1. Run: `forloopFileList --sprintId {id}`
2. Read: File list
3. Verify: Knowledge file appears
4. ONLY THEN: Claim "Knowledge captured successfully"
```

### File Management Integration
```markdown
### Verification Checklist

**Before claiming upload complete:**
- [ ] Ran `forloopFileList --sprintId {id}` FRESH
- [ ] Read full output (no truncation)
- [ ] Confirmed uploaded file in list
- [ ] Verified file size matches expected
- [ ] Checked exit code = 0
```

---

## Examples

### Example 1: Plan Upload Verification

**BEFORE (WRONG):**
```
You: Uploading plan...
[Runs forloopFileUpload]
✅ Plan uploaded successfully!
```

**AFTER (CORRECT):**
```
You: Uploading plan...
[Runs forloopFileUpload]

You: Verifying upload...
[Runs forloopFileList --sprintId 14]

You: ✅ Plan uploaded successfully
   - File: plan-14-20260411-093015.md
   - Size: 2.3 KB
   - Verified in forloopFileList output
```

---

### Example 2: Story Creation Verification

**BEFORE (WRONG):**
```
You: Creating stories...
[Runs forloopStoryTemplate × 5]
✅ Created 5 stories successfully!
```

**AFTER (CORRECT):**
```
You: Creating stories...
[Runs forloopStoryTemplate × 5]
[Captures story IDs: 201, 202, 203, 204, 205]

You: Verifying story creation...
[Runs forloopSprintGet --sprintId 14 --includeStories true]

You: ✅ Created 5 stories successfully (verified)
   - Story IDs: 201, 202, 203, 204, 205
   - All IDs confirmed in sprint story list
   - Total sprint stories: 5
```

---

### Example 3: Knowledge Capture Verification

**BEFORE (WRONG):**
```
You: Capturing knowledge about JWT auth...
[Creates file, uploads]
✅ Knowledge captured!
```

**AFTER (CORRECT):**
```
You: Capturing knowledge about JWT auth...
[Creates file: knowledge-auth-jwt-20260411-093015.md]
[Runs forloopFileUpload]

You: Verifying knowledge capture...
[Runs forloopFileList --sprintId 14]

You: ✅ Knowledge captured (verified)
   - File: knowledge-auth-jwt-20260411-093015.md
   - Size: 1.2 KB
   - Verified in sprint file list
```

---

## When Process Reveals Issues

If verification reveals the claim was false:

1. **State actual status clearly**
   ```
   ⚠️ Verification failed: file not found in list
   Actual status: Upload incomplete
   ```

2. **Investigate immediately**
```bash
# Check if file exists locally
ls -la .forloop/plan/

# Check upload error
forloopFileUpload(filePath=..., sprintId={id})
```

3. **Fix before proceeding**
   - Don't move to next task
   - Don't claim "mostly done"
   - Fix the issue, re-verify, THEN proceed

---

## Anti-Patterns

| # | ❌ Don't | ✅ Do Instead |
|---|---------|--------------|
| 1 | Claim success based on tool return code | Run independent verification command |
| 2 | Use "should", "probably", "seems to" | State actual status with evidence |
| 3 | Rely on partial verification | Run FULL verification, read ALL output |
| 4 | Trust cached output | Run FRESH command every time |
| 5 | Skip verification when in a hurry | Rushing guarantees rework |
| 6 | Assume user confirmation = technical verification | User confirmation ≠ independent evidence |

## Quality Gates

- [ ] Verification command ran FRESH (not cached)
- [ ] Full output read (no truncation)
- [ ] Exit code = 0
- [ ] Output confirms the specific claim
- [ ] No errors or warnings in output
- [ ] File/story/artifact actually exists
- [ ] Can point to specific line in output as evidence

## Integration with Other Skills

| Skill | Integration Point |
|-------|-------------------|
| `plan-documentation` | Verify plan uploaded before claiming complete |
| `task-tracking` | Verify stories exist before claiming complete |
| `knowledge-management` | Verify knowledge file uploaded before claiming complete |
| `file-management` | Run fresh file.list after each upload |
| `sprint-planning` | Verify all artifacts before claiming sprint planned |

---

## Verification Checklist

**Before marking ANY task complete:**

- [ ] Ran verification command FRESH (not cached output)
- [ ] Read FULL output (no truncation)
- [ ] Checked exit code = 0
- [ ] Output confirms the specific claim
- [ ] No errors or warnings in output
- [ ] File/story/artifact actually exists
- [ ] Can point to specific line in output as evidence

**Can't check all boxes? You skipped verification. Run the command.**

---

## The Bottom Line

**No shortcuts for verification.**

Run the command. Read the output. THEN claim the result.

This is non-negotiable.

---

**Version:** 1.0.0  
**Created:** 2026-04-11  
**Based on:** superpowers:verification-before-completion
