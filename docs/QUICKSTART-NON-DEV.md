# Quick Start for Non-Developers

**No coding required!** This guide is for users who just want to use the plugin, not develop it.

## Prerequisites (5 minutes)

1. **Install opencode** (free, open-source)
   ```bash
   curl -fsSL https://opencode.ai/install.sh | bash
   ```

2. **Create ForLoop account**
   - Go to [forloop.cc](https://forloop.cc)
   - Sign up for free

3. **Create API token**
   - Go to [forloop.cc/profile?tab=api-tokens](https://forloop.cc/profile?tab=api-tokens)
   - Click "Create New Token"
   - Select scopes: `sprint:read`, `sprint:write`, `story:read`, `story:write`, `agent:query`, `profile:read`
   - Copy the token (starts with `floop_`)

## Install Plugin (2 options)

### Option 1: One-Line Install (Easiest)
```bash
curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin/main/install.sh | bash
```

### Option 2: npm Install
```bash
npm install @forloop/opencode-plugin
```

## Set Your Token

In opencode chat, run:
```
forloop.token.set --token floop_YOUR_TOKEN_HERE
```

## You're Ready! 🎉

Just use commands in opencode chat:

### List Sprints
```
forloop.sprint.list
```

### Create a Story
```
forloop.story.create --title "As a user, I want to login" --sprintId 14 --priority high
```

### Get AI Help
```
forloop.agent.breakdown --storyId 78
```

## Common Commands Cheat Sheet

| What You Want to Do | Command |
|---------------------|---------|
| See all sprints | `forloop.sprint.list` |
| See sprint details | `forloop.sprint.get --sprintId 14` |
| Create story | `forloop.story.create --title "..." --sprintId 14` |
| Update story | `forloop.story.update --storyId 78 --status done` |
| Get AI breakdown | `forloop.agent.breakdown --storyId 78` |
| Get AI estimate | `forloop.agent.estimate --storyId 78` |
| Check your token | `forloop.token.get` |

## That's It!

**You don't need to:**
- ❌ Know TypeScript
- ❌ Run npm commands
- ❌ Edit code
- ❌ Understand plugin architecture

**Just:**
- ✅ Install opencode
- ✅ Install plugin
- ✅ Set token
- ✅ Use commands in chat

## Need Help?

- **FAQ**: See [README.md](../README.md#faq)
- **Full Documentation**: [docs/](../docs/)
- **Issues**: [GitHub Issues](https://github.com/forloop-cc/forloop-opencode-plugin/issues)

---

**For Developers:** If you want to modify or extend the plugin, see [Developer vs User](DEVELOPER-VS-USER.md).
