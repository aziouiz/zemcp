# Contributing to ZeMCP

Thank you for considering contributing to this project! Your help is highly appreciated. 
This document outlines how you can help and the guidelines to follow.

## 🚀 Quick Start

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch
4. **Make** your changes
5. **Test** your changes
6. **Submit** a pull request

## 🛠️ Development Setup

```bash
# Clone your fork
git clone https://github.com/aziouiz/zemcp.git
cd zemcp

# Install dependencies
npm install

# Build all packages
npm run build

# Start development databases (optional)
docker-compose up -d
```

## 📋 Project Structure

```
zemcp/
├── zemcp-mssql/          # MSSQL MCP Server
├── zemcp-oracle/         # Oracle MCP Server
├── .github/workflows/    # CI/CD pipelines
└── docker-compose.yml    # Development databases
```

## 🔧 Making Changes

### Code Style
- Use TypeScript where applicable
- Follow existing code patterns
- Add comments for complex logic
- Use descriptive variable names

### Testing
- Test your changes locally
- Ensure both packages build successfully
- Test with actual database connections when possible

### Commits
- Use clear, descriptive commit messages
- Follow conventional commits format when possible:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `chore:` for maintenance

## 🐛 Reporting Issues

When reporting issues, please include:
- Operating system and version
- Node.js version
- Database version (if applicable)
- Error messages and stack traces
- Steps to reproduce

## 💡 Feature Requests

We welcome feature requests! Please:
- Check if the feature already exists
- Clearly describe the use case
- Explain why it would be valuable
- Consider submitting a pull request

## 📦 Publishing

Maintainers handle publishing through automated GitHub Actions. Contributors don't need to worry about versioning or publishing.

## 🤝 Code of Conduct

- Be respectful and inclusive
- Help others learn and grow
- Focus on constructive feedback
- Have fun! 🎉

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.