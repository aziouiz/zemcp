# ZeMCP - Database Model Context Protocol Servers

A collection of Model Context Protocol (MCP) servers for database interactions, providing secure and standardized access to Microsoft SQL Server and Oracle Database systems.

## 📦 Packages

This monorepo contains three npm packages:

- **[zemcp-mssql](./zemcp-mssql)** - MCP server for Microsoft SQL Server
- **[zemcp-oracle](./zemcp-oracle)** - MCP server for Oracle Database
- **[zemcp-postgres](./zemcp-postgres)** - MCP server for PostgreSQL

## 🚀 Quick Start

### Installation

```bash
# No installation required! Use npx to run directly:
npx @zemcp/mssql
npx @zemcp/oracle
npx @zemcp/postgres

# Or install globally if preferred:
npm install -g @zemcp/mssql
npm install -g @zemcp/oracle
npm install -g @zemcp/postgres
```

### Usage

Both servers are configured via environment variables. See individual package documentation for detailed configuration:

- **[zemcp-mssql Configuration](./zemcp-mssql#configuration)** - Microsoft SQL Server setup
- **[zemcp-oracle Configuration](./zemcp-oracle#configuration)** - Oracle Database setup
- **[zemcp-postgres Configuration](./zemcp-postgres#configuration)** - PostgreSQL setup

**Basic Examples:**

```bash
# Microsoft SQL Server
export DB_HOST=localhost DB_PORT=1433 DB_NAME=mydb DB_USER=sa DB_PASSWORD=mypass
npx @zemcp/mssql

# Oracle Database  
export DB_USER=sys DB_PASSWORD=mypass DB_CONNECT_STRING=localhost:1521/XEPDB1
npx @zemcp/oracle

# PostgreSQL
export DB_HOST=localhost DB_PORT=5432 DB_NAME=mydb DB_USER=postgres DB_PASSWORD=mypass
npx @zemcp/postgres
```

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
├── zemcp-postgres/       # PostgreSQL MCP Server
│   ├── index.js          # Main server code
│   ├── package.json      # Package configuration
│   └── tsconfig.json     # TypeScript config
├── .github/workflows/    # GitHub Actions
├── docker-compose.yml    # Development databases
└── mcp.sample.json       # MCP configuration example
```

## 📋 Available Tools

All servers provide the following MCP tools:

- **execute-query** - Execute SELECT queries safely
- **execute-script** - Execute multiple SQL statements (INSERT, UPDATE, DELETE, DDL)

### Security Features

- Input validation (when enabled)
- Parameterized queries to prevent SQL injection
- Environment-based configuration
- Read-only and write operations clearly separated
- Optional dangerous operation detection (disabled by default for performance)

## 🔧 MCP Client Integration

These servers are designed to work with MCP-compatible clients like VS Code's MCP extension.

**Configuration**: Each server provides specific MCP configuration examples in their respective documentation:
- **[zemcp-mssql MCP Configuration](./zemcp-mssql#mcp-client-configuration)** - VS Code setup for SQL Server
- **[zemcp-oracle MCP Configuration](./zemcp-oracle#mcp-client-configuration)** - VS Code setup for Oracle Database
- **[zemcp-postgres MCP Configuration](./zemcp-postgres#mcp-client-configuration)** - VS Code setup for PostgreSQL

**Quick Setup**: Use `npx @zemcp/mssql`, `npx @zemcp/oracle`, or `npx @zemcp/postgres` as the command in your MCP client configuration.

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
- PostgreSQL 17.5 on port 5432
- A proxy that proxies the zemcp-mssql stdio server as OpenApi compatible to be used in the Open WebUI console

if you are using the Open WebUI console you will need to set your open api key in a .env file (copy .env.example). otherwise if you have a good GPU use Ollama!


## Open WebUi Console
Once you start your containers with docker-compose up -d you can then navigate to the console on http://localhost:3000 and configure in Settings > Tools > url = http://localhost:8000 leave default openapi.json path.
Then you are good to go, choose your favorite model and query with stuff like:
```
   Show Your Magic And Do Performance Check On All My DBs
```

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