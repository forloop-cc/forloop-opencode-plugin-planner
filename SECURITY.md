# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

We take the security of the ForLoop Plugin seriously. If you believe you've found a security vulnerability, please follow these steps:

### How to Report

1. **DO NOT** create a public GitHub issue for security vulnerabilities
2. Email your findings to: [security@forloop.cc](mailto:security@forloop.cc)
3. Include the following information:
   - Description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact
   - Suggested fix (if any)
   - Your contact information

### What to Expect

- **Initial response**: Within 48 hours
- **Status update**: Within 5 business days
- **Resolution timeline**: Depends on severity and complexity

### Security Best Practices

When using the ForLoop Plugin:

1. **Token Security**
   - Never commit API tokens to version control
   - Use environment variables or secure token storage
   - Rotate tokens regularly
   - Use minimum required scopes

2. **Plugin Updates**
   - Keep the plugin updated to the latest version
   - Review changelog for security fixes
   - Enable automatic updates when possible

3. **Access Control**
   - Use organization-level tokens for team projects
   - Limit token permissions to required scopes only
   - Revoke unused or old tokens

### Known Security Measures

The plugin implements the following security features:

- Token storage with restricted file permissions (0o600)
- API token validation before requests
- Support for scoped API tokens
- Secure token exchange for Lambda execution
- No sensitive data in logs

### Security Audit Log

Check the [security advisories](https://github.com/forloop-cc/forloop-opencode-plugin/security/advisories) page for past security issues and resolutions.

## Responsible Disclosure

We appreciate responsible disclosure and will credit reporters (with permission) in our security advisories.

Thank you for helping keep the ForLoop Plugin secure!
