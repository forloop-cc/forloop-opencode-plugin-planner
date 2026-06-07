# Contributing to ForLoop Plugin

First off, thank you for considering contributing to the ForLoop Plugin! It's people like you that make the ForLoop Plugin such a great tool for the community.

## Code of Conduct

This project and everyone participating in it is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## I have a question!

Before creating an issue, check if:
- The [README](README.md) answers your question
- The [docs/](docs/) folder has relevant documentation
- A similar issue already exists in the [issue tracker](https://github.com/forloop-cc/forloop-opencode-plugin/issues)

If not, feel free to open an issue with the "question" label.

## I want to report a bug!

Bugs are tracked as [GitHub issues](https://github.com/forloop-cc/forloop-opencode-plugin/issues). Create an issue and provide the following information:

- **Summary**: A clear, descriptive title
- **Environment**: opencode version, Node.js version, OS
- **Steps to Reproduce**: Detailed steps to reproduce the issue
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Logs**: Any relevant error messages or logs
- **Additional context**: Screenshots, workarounds tried, etc.

## I want to suggest a feature!

Feature suggestions are welcome! Create an issue with:

- **Summary**: Clear, descriptive title
- **Problem statement**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches you've thought about
- **Use cases**: Who will benefit from this feature?
- **Additional context**: Examples, mockups, etc.

## I want to contribute code!

### Development Setup

1. **Fork the repository** and clone it locally:
```bash
git clone https://github.com/YOUR_USERNAME/forloop-opencode-plugin.git
cd forloop-opencode-plugin
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up local development**:
```bash
# Add the plugin to your local opencode.json pointing to this directory
jq '.plugin |= (. // []) + ["file://'"$(pwd)"'"] | .plugin |= unique' \
  opencode.json > opencode.json.tmp && mv opencode.json.tmp opencode.json
```

4. **Make your changes** following the coding conventions

5. **Run tests**:
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
```

6. **Run type checking**:
```bash
npm run typecheck
```

### Pull Request Process

1. **Create a branch** from `main`:
```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following our coding standards:
   - Write tests for new functionality
   - Update documentation for user-facing changes
   - Follow existing code style
   - Add inline comments only when necessary (code should be self-documenting)

3. **Commit your changes** with clear, descriptive messages:
```bash
git commit -m "feat: add new feature description"
```

We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

4. **Push to your fork**:
```bash
git push origin feature/your-feature-name
```

5. **Open a Pull Request** against the `main` branch

### PR Checklist

Before submitting your PR, ensure:
- [ ] Tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Code follows existing style
- [ ] Documentation is updated
- [ ] Commit messages are clear and follow conventions
- [ ] PR description explains the change and why

### Code Style

- **TypeScript**: Strict mode enabled, explicit types
- **Formatting**: Consistent indentation, meaningful variable names
- **Error handling**: Return user-friendly error messages from tools
- **Comments**: Only for complex logic, not for obvious code

### Testing Guidelines

- **Unit tests**: Test individual functions/components in isolation
- **Integration tests**: Test API interactions (requires API token)
- **Test naming**: Describe the expected behavior
- **Test structure**: Arrange, Act, Assert pattern

Example:
```typescript
describe('forloopSprintList', () => {
  it('should list sprints successfully', async () => {
    // Arrange
    mockClient.listSprints.mockResolvedValue([...])
    
    // Act
    const result = await tool.execute({}, {} as any)
    
    // Assert
    expect(result).toContain('Sprints')
  })
})
```

## Releasing (Maintainers Only)

1. Update `CHANGELOG.md` with new version and changes
2. Bump version in `package.json`:
```bash
npm version patch  # or minor, or major
```

3. Push tags:
```bash
git push --follow-tags
```

4. Publish to npm:
```bash
npm publish
```

## Questions?

Feel free to open an issue or reach out to the maintainers.

Thank you for contributing! 🚀
