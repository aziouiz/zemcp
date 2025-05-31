# ZeMCP MSSQL Server

Model Context Protocol server for Microsoft SQL Server database interactions.

## Installation

```bash
# No installation required! Use npx:
npx zemcp-mssql

# Or install globally:
npm install -g zemcp-mssql
```

## Usage

```bash
# Using npx (recommended):
npx zemcp-mssql

# Or if installed globally:
zemcp-mssql
```

## Configuration

Set the following environment variables:

### Required
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 1433)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

### Optional
- `ENABLE_VALIDATION` - Set to `true` to enable SQL validation and dangerous operation checks (default: false)
- `DEBUG_SQL` - Set to `true` to enable detailed SQL request/response logging (default: false)
- `LOG_FILE` - Absolute path to log file for dual logging to console and file (optional)

### Connection Pool Configuration
- `DB_POOL_MAX` - Maximum number of connections in pool (default: 10)
- `DB_POOL_MIN` - Minimum number of connections in pool (default: 2)
- `DB_POOL_IDLE_TIMEOUT` - Time in milliseconds before idle connections are closed (default: 30000)
- `DB_POOL_ACQUIRE_TIMEOUT` - Time in milliseconds to wait for connection from pool (default: 15000)
- `DB_POOL_CREATE_TIMEOUT` - Time in milliseconds to wait for new connection creation (default: 15000)
- `DB_POOL_DESTROY_TIMEOUT` - Time in milliseconds to wait for connection destruction (default: 5000)

## MCP Tools

### execute-mssql-query
Execute SELECT queries safely.

**Parameters:**
- `query` (string) - SQL SELECT query to execute

**Example:**
```sql
SELECT name FROM sys.tables;
```

### execute-mssql-script
Execute multiple SQL statements (INSERT, UPDATE, DELETE, DDL).

**Parameters:**
- `sqlScript` (string) - SQL script with multiple statements separated by ';'

**Example:**
```sql
CREATE TABLE test_table (id INT, name NVARCHAR(100));
INSERT INTO test_table (id, name) VALUES (1, 'Alice');
```

## Environment Variable Usage

### ENABLE_VALIDATION
When set to `true`, enables SQL validation including dangerous operation detection:

```bash
export ENABLE_VALIDATION=true
npx zemcp-mssql
```

⚠️ **Note**: Validation is DISABLED by default for performance. Enable it to prevent potentially dangerous operations like `DROP DATABASE`, `SHUTDOWN`, etc.

### DEBUG_SQL
When set to `true`, logs all SQL requests and responses for debugging:

```bash
export DEBUG_SQL=true
npx zemcp-mssql
```

Useful for troubleshooting, performance analysis, and development.

### LOG_FILE
When set to an absolute file path, logs all output to both console and the specified file:

```bash
export LOG_FILE=/var/log/mssql-mcp.log
npx zemcp-mssql
```

The log file will contain timestamped JSON entries from Pino logger. Useful for production monitoring and audit trails.

### Connection Pool Configuration
Optimize database performance by configuring connection pool settings:

```bash
# Production environment with high concurrency
export DB_POOL_MAX=50
export DB_POOL_MIN=10
export DB_POOL_IDLE_TIMEOUT=60000
npx zemcp-mssql
```

```bash
# Development environment with minimal resources
export DB_POOL_MAX=5
export DB_POOL_MIN=1
export DB_POOL_IDLE_TIMEOUT=10000
npx zemcp-mssql
```

**Pool Configuration Guidelines:**
- **DB_POOL_MAX**: Set based on your database server's connection limits and expected concurrent load
- **DB_POOL_MIN**: Keep at least 1-2 connections open for immediate availability
- **DB_POOL_IDLE_TIMEOUT**: Lower values (10-30s) for development, higher (30-60s) for production
- **DB_POOL_ACQUIRE_TIMEOUT**: Increase if experiencing timeout errors under load
- **DB_POOL_CREATE_TIMEOUT**: Increase for slow network connections
- **DB_POOL_DESTROY_TIMEOUT**: Usually keep default unless experiencing connection cleanup issues

## Security

- SQL query validation (can be enabled with ENABLE_VALIDATION)
- Dangerous operation detection (can be enabled with ENABLE_VALIDATION)
- Environment-based configuration

## MCP Client Configuration

### VS Code MCP Extension

To use this server with VS Code's MCP support, create or update `.vscode/mcp.json`:

```json
{
  "inputs": [
    {
      "id": "mssql-password",
      "type": "promptString",
      "description": "MSSQL DB Password", 
      "password": true
    }
  ],
  "servers": {
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

### Advanced Configuration

For production deployments with custom settings:

```json
{
  "inputs": [
    {
      "id": "mssql-password",
      "type": "promptString",
      "description": "MSSQL DB Password", 
      "password": true
    }
  ],
  "servers": {
    "zemcp-mssql": {
      "type": "stdio", 
      "command": "npx",
      "args": ["zemcp-mssql"],
      "env": {
        "DB_HOST": "your-server.database.windows.net",
        "DB_PORT": "1433",
        "DB_NAME": "your_database",
        "DB_USER": "your_username",
        "DB_PASSWORD": "${input:mssql-password}",
        "ENABLE_VALIDATION": "true",
        "LOG_FILE": "/var/log/mssql-mcp.log",
        "DB_POOL_MAX": "20",
        "DB_POOL_MIN": "5"
      }
    }
  }
}

## License

MIT
