# ZeMCP - Database Model Context Protocol Servers

A collection of Model Context Protocol (MCP) servers for database interactions, providing secure and standardized access to Microsoft SQL Server and Oracle Database systems.

## 📦 Packages

This monorepo contains two npm packages:

- **[zemcp-mssql](./zemcp-mssql)** - MCP server for Microsoft SQL Server
- **[zemcp-oracle](./zemcp-oracle)** - MCP server for Oracle Database

## 🚀 Quick Start

### Installation

```bash
# No installation required! Use npx to run directly:
npx zemcp-mssql
npx zemcp-oracle

# Or install globally if preferred:
npm install -g zemcp-mssql
npm install -g zemcp-oracle
```

### Usage

#### Microsoft SQL Server

```bash
zemcp-mssql
```

Environment variables:
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 1433)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

#### Oracle Database

```bash
zemcp-oracle
```

Environment variables:
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_CONNECT_STRING` - Oracle connection string (e.g., localhost:1521/XEPDB1)
- `DB_PRIVILEGE` - Database privilege (optional, e.g., SYSDBA)

## 🛠️ Development

### Prerequisites

- Node.js 18+
- TypeScript
- Access to SQL Server and/or Oracle Database

### Setup

```bash
# Clone the repository
git clone https://github.com/aziouiz/zemcp.git
cd zemcp

# Install dependencies
npm install

# Build all packages
npm run build
```

### Project Structure

```
zemcp/
├── zemcp-mssql/          # MSSQL MCP Server
│   ├── index.js          # Main server code
│   ├── package.json      # Package configuration
│   └── tsconfig.json     # TypeScript config
├── zemcp-oracle/         # Oracle MCP Server
│   ├── index.js          # Main server code
│   ├── package.json      # Package configuration
│   └── tsconfig.json     # TypeScript config
├── .github/workflows/    # GitHub Actions
├── docker-compose.yml    # Development databases
└── mcp.sample.json       # MCP configuration example
```

## 📋 Available Tools

Both servers provide the following MCP tools:

- **execute-query** - Execute SELECT queries safely
- **execute-script** - Execute multiple SQL statements (INSERT, UPDATE, DELETE, DDL)

### Security Features

- Input validation using Zod schemas
- Parameterized queries to prevent SQL injection
- Environment-based configuration
- Read-only and write operations clearly separated

## 🔧 Configuration

### VS Code MCP Configuration

Create or update your MCP configuration file (usually `.vscode/mcp.json`):

```json
{
  "inputs": [
    {
      "id": "oracle-password",
      "type": "promptString", 
      "description": "Oracle DB Password",
      "password": true
    },
    {
      "id": "mssql-password",
      "type": "promptString",
      "description": "MSSQL DB Password", 
      "password": true
    }
  ],
  "servers": {
    "zemcp-oracle": {
      "type": "stdio",
      "command": "npx",
      "args": ["zemcp-oracle"],
      "env": {
        "DB_USER": "sys",
        "DB_PASSWORD": "${input:oracle-password}",
        "DB_CONNECT_STRING": "localhost:1521/XEPDB1",
        "DB_PRIVILEGE": "SYSDBA"
      }
    },
    "zemcp-mssql": {
      "type": "stdio", 
      "command": "npx",
      "args": ["zemcp-mssql"],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "1433",
        "DB_NAME": "master",
        "DB_USER": "sa",
        "DB_PASSWORD": "${input:mssql-password}"
      }
    }
  }
}
```

## 🚢 Deployment

### Automatic NPM Publishing

This project uses GitHub Actions to automatically publish packages to npm when you create a new release tag.

#### Release Process

1. Make your changes and commit them
2. Run the release script:
   ```bash
   # Patch version (1.0.0 -> 1.0.1)
   ./release.sh patch
   
   # Minor version (1.0.0 -> 1.1.0)  
   ./release.sh minor
   
   # Major version (1.0.0 -> 2.0.0)
   ./release.sh major
   ```

3. The script will:
   - Update package versions
   - Create a git tag
   - Push to GitHub
   - Trigger automatic npm publishing

#### Setup Requirements

1. Create an npm account and generate an access token
2. Add the token as `NPM_TOKEN` in your GitHub repository secrets
3. Update the repository URL in package.json files

## 🐳 Development with Docker

Use the included docker-compose.yml for local development:

```bash
# Start databases
docker-compose up -d

# Stop databases  
docker-compose down
```

This provides:
- SQL Server 2022 on port 1433
- Oracle XE 21c on port 1521

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details

## 🐛 Issues

Please report issues on the [GitHub Issues](https://github.com/yourusername/zemcp/issues) page.