# ForLoop Plugin Configuration

## Environment Configuration

The plugin supports multiple environments, but defaults to **production** so public releases never accidentally connect to dev.

### Default Environments

| Environment | API URL | Use Case |
|-------------|---------|----------|
| **development** | `https://api.dev.forloop.cc` | Internal testing only (explicit opt-in) |
| **production** | `https://api.forloop.cc` | Production use, npm releases |

### Configuration Priority (highest to lowest)

1. **Environment Variable** - `FORLOOP_API_URL`
2. **Environment Selector** - `FORLOOP_ENV=production|development`
3. **Project Config** - `opencode.json` → `forloop.apiUrl`
4. **Global Config** - `~/.config/opencode/config.json` → `forloop.apiUrl`
5. **Default** - `https://api.forloop.cc`

### Dev Safety Gate

To use the dev API (`api.dev.forloop.cc`), you must explicitly enable it:

- `FORLOOP_ALLOW_DEV=true` (recommended)
- or `opencode.json` / global config `forloop.allowDev: true`

If a dev URL is configured without the allow flag, the plugin will fall back to production.

---

## Configuration Methods

### Method 1: Environment Variable (Recommended for Development)

```bash
# Internal dev testing (explicit opt-in)
export FORLOOP_ALLOW_DEV=true
export FORLOOP_API_URL=https://api.dev.forloop.cc

# Or add to .env file (do not commit)
cat >> .env << 'EOF'
FORLOOP_ALLOW_DEV=true
FORLOOP_API_URL=https://api.dev.forloop.cc
EOF

# Or use opencode with env
FORLOOP_ALLOW_DEV=true FORLOOP_API_URL=https://api.dev.forloop.cc opencode
```

### Method 2: opencode.json (Project-specific)

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["forloop@git+https://github.com/forloop-cc/forloop-opencode-plugin.git"],
  "forloop": {
    "apiUrl": "https://api.dev.forloop.cc",
    "allowDev": true,
    "tokenStorage": "global",
    "debug": true
  }
}
```

### Method 3: Global Config (All Projects)

Edit `~/.config/opencode/config.json`:

```json
{
  "forloop": {
    "apiUrl": "https://api.dev.forloop.cc",
    "allowDev": true
  }
}
```

### Method 4: Environment Selector (Recommended)

```bash
# Production (default)
FORLOOP_ENV=production opencode

# Development (internal only; requires allow)
FORLOOP_ENV=development FORLOOP_ALLOW_DEV=true opencode
```

---

## Usage Examples

### Development Workflow

```bash
# 1. Clone the plugin for local development
git clone https://github.com/forloop-cc/forloop-opencode-plugin.git
cd forloop-opencode-plugin

# 2. Set development environment
export FORLOOP_API_URL=https://api.dev.forloop.cc
export NODE_ENV=development

# 3. Use the plugin (it will connect to dev API)
opencode
```

### Testing Against Dev Environment

```bash
# Quick test without permanent config
FORLOOP_API_URL=https://api.dev.forloop.cc opencode run "forloop.sprint.list"
```

### Production Deployment

When publishing to npm, the default is production:

```json
{
  "plugin": ["forloop@git+https://github.com/forloop-cc/forloop-opencode-plugin.git"]
}
```

Users will connect to `https://api.forloop.cc` by default.

---

## Debug Mode

Enable debug logging to see what's happening:

```bash
# Via environment variable
export FORLOOP_DEBUG=true

# Or in opencode.json
{
  "forloop": {
    "debug": true
  }
}
```

This will log:
```
[ForLoop Config] {
  apiUrl: 'https://api.forloop.cc',
  environment: 'production',
  debug: true
}
```

---

## Environment Detection

The plugin automatically detects the environment:

```typescript
// Internal config detection
if (apiUrl.includes('dev.forloop.cc')) {
  environment = 'development';
} else if (apiUrl.includes('api.forloop.cc')) {
  environment = 'production';
} else {
  environment = 'custom';
}
```

You'll see this in console output:
```
[ForLoop] Plugin initialized - development (https://api.dev.forloop.cc)
```

---

## Quick Reference

### Switch to Dev Environment

```bash
export FORLOOP_ALLOW_DEV=true
export FORLOOP_API_URL=https://api.dev.forloop.cc
```

### Switch to Production

```bash
unset FORLOOP_API_URL  # Uses default production
```

### Check Current Config

The plugin logs the environment on startup:
```
[ForLoop] Plugin initialized - development (https://api.dev.forloop.cc)
```

---

## Best Practices

### For Development
- Use `FORLOOP_API_URL` environment variable
- Enable debug mode for troubleshooting
- Use dev API (`api.dev.forloop.cc`)
- Store config in project `.env` (not committed to git)

### For Production
- Use default configuration (no env vars needed)
- Default API is `api.forloop.cc`
- Keep debug mode off
- Document any custom configs for your team

### For npm Distribution
- Default to production in package
- Allow override via env variables
- Document all configuration options
- Provide development setup instructions

---

## Troubleshooting

### Wrong environment showing

Check configuration priority:
```bash
echo "FORLOOP_API_URL: $FORLOOP_API_URL"
echo "NODE_ENV: $NODE_ENV"
cat opencode.json | grep -A5 "forloop"
```

### Can't connect to API

Verify the endpoint:
```bash
curl -s https://api.dev.forloop.cc/health
curl -s https://api.forloop.cc/health
```

### Config not loading

Restart opencode after changing config:
```bash
# opencode caches plugins, restart to reload
exit
opencode
```

---

## Advanced: Custom API Endpoint

You can point to any API endpoint:

```json
{
  "forloop": {
    "apiUrl": "https://your-custom-api.example.com"
  }
}
```

This will be detected as `environment: 'custom'`.

---

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `FORLOOP_API_URL` | Override API endpoint | `https://api.dev.forloop.cc` |
| `NODE_ENV` | Auto-detect environment | `development` or `production` |
| `FORLOOP_DEBUG` | Enable debug logging | `true` |
| `DEV` | Shortcut for dev mode | `true` |

---

**Updated:** 2026-03-23
**Version:** 2.0.0
