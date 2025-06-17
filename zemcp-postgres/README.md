# ZeMCP PostgreSQL Server

Model Context Protocol server for PostgreSQL database interactions.

## Installation

```bash
# No installation required! Use npx:
npx @zemcp/postgres

# Or install globally:
npm install -g @zemcp/postgres
```

## Usage

```bash
# Using npx (recommended):
npx @zemcp/postgres

# Or if installed globally:
zemcp-postgres
```

## Configuration

Set the following environment variables:

### Required
- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 5432)
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
- `DB_POOL_CONNECTION_TIMEOUT` - Time in milliseconds to wait for new connection creation (default: 15000)
- `DB_STATEMENT_TIMEOUT` - Time in milliseconds before a statement times out (default: 30000)
- `DB_QUERY_TIMEOUT` - Time in milliseconds before a query times out (default: 30000)

## MCP Tools

### execute-postgres-query
Execute SELECT queries safely.

**Parameters:**
- `query` (string) - SQL SELECT query to execute

**Example:**
```sql
SELECT tablename FROM pg_tables;
```

### execute-postgres-script
Execute multiple SQL statements (INSERT, UPDATE, DELETE, DDL).

**Parameters:**
- `sqlScript` (string) - SQL script with multiple statements separated by ';'

**Example:**
```sql
CREATE TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(100));
INSERT INTO test_table (name) VALUES ('Alice');
```

## Environment Variable Usage

### ENABLE_VALIDATION
When set to `true`, enables SQL validation including dangerous operation detection:

```bash
export ENABLE_VALIDATION=true
npx @zemcp/postgres
```

⚠️ **Note**: Validation is DISABLED by default for performance. Enable it to prevent potentially dangerous operations like `DROP DATABASE`, `CREATE DATABASE`, file operations, etc.

### DEBUG_SQL
When set to `true`, logs all SQL requests and responses for debugging:

```bash
export DEBUG_SQL=true
npx @zemcp/postgres
```

Useful for troubleshooting, performance analysis, and development.

### LOG_FILE
When set to an absolute file path, logs all output to both console and the specified file:

```bash
export LOG_FILE=/var/log/postgres-mcp.log
npx @zemcp/postgres
```

The log file will contain timestamped JSON entries from Pino logger. Useful for production monitoring and audit trails.

### Connection Pool Configuration
Optimize database performance by configuring connection pool settings:

```bash
# Production environment with high concurrency
export DB_POOL_MAX=50
export DB_POOL_MIN=10
export DB_POOL_IDLE_TIMEOUT=60000
export DB_POOL_CONNECTION_TIMEOUT=30000
npx @zemcp/postgres
```

```bash
# Development environment with minimal resources
export DB_POOL_MAX=5
export DB_POOL_MIN=1
export DB_POOL_IDLE_TIMEOUT=10000
export DB_POOL_CONNECTION_TIMEOUT=15000
npx @zemcp/postgres
```

**Pool Configuration Guidelines:**
- **DB_POOL_MAX**: Set based on your PostgreSQL server's `max_connections` setting and expected concurrent load
- **DB_POOL_MIN**: Keep at least 1-2 connections open for immediate availability
- **DB_POOL_IDLE_TIMEOUT**: Lower values (10-30s) for development, higher (30-60s) for production
- **DB_POOL_CONNECTION_TIMEOUT**: Increase for slow network connections or overloaded servers
- **DB_STATEMENT_TIMEOUT**: Prevent long-running queries from blocking the pool
- **DB_QUERY_TIMEOUT**: Overall query timeout including network latency

**PostgreSQL-Specific Considerations:**
- PostgreSQL connections are relatively lightweight compared to Oracle
- Default `max_connections` is usually 100, plan your pool size accordingly
- Consider PostgreSQL's `shared_buffers` and `work_mem` settings for performance
- Use connection pooling tools like PgBouncer for high-traffic applications

## Security

- SQL query validation (can be enabled with ENABLE_VALIDATION)
- Dangerous operation detection (can be enabled with ENABLE_VALIDATION)
- Environment-based configuration
- Transaction support for script execution
- Protection against PostgreSQL-specific dangerous operations (file operations, external access)

## MCP Client Configuration

### VS Code MCP Extension

To use this server with VS Code's MCP support, create or update `.vscode/mcp.json`:

```json
{
  "inputs": [
    {
      "id": "postgres-password",
      "type": "promptString",
      "description": "PostgreSQL DB Password", 
      "password": true
    }
  ],
  "servers": {
    "zemcp-postgres": {
      "type": "stdio", 
      "command": "npx",
      "args": ["@zemcp/postgres"],
      "env": {
        "DB_HOST": "localhost",
        "DB_PORT": "5432",
        "DB_NAME": "postgres",
        "DB_USER": "postgres",
        "DB_PASSWORD": "${input:postgres-password}"
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
      "id": "postgres-password",
      "type": "promptString",
      "description": "PostgreSQL DB Password", 
      "password": true
    }
  ],
  "servers": {
    "zemcp-postgres": {
      "type": "stdio", 
      "command": "npx",
      "args": ["@zemcp/postgres"],
      "env": {
        "DB_HOST": "your-postgres-server.com",
        "DB_PORT": "5432",
        "DB_NAME": "your_database",
        "DB_USER": "your_username",
        "DB_PASSWORD": "${input:postgres-password}",
        "ENABLE_VALIDATION": "true",
        "LOG_FILE": "/var/log/postgres-mcp.log",
        "DB_POOL_MAX": "20",
        "DB_POOL_MIN": "5",
        "DB_STATEMENT_TIMEOUT": "60000"
      }
    }
  }
}
```

## PostgreSQL Features

### Dollar Quoting Support
The server supports PostgreSQL's dollar quoting syntax for complex strings:

```sql
CREATE FUNCTION example() RETURNS text AS $$
BEGIN
    RETURN 'Hello, PostgreSQL!';
END;
$$ LANGUAGE plpgsql;
```

### Transaction Management
Scripts are executed within transactions, ensuring data consistency:
- Automatic `BEGIN` at script start
- `COMMIT` on successful completion
- `ROLLBACK` on any error

### Advanced Query Types
Supports all PostgreSQL query types including:
- Common Table Expressions (CTEs)
- Window functions
- JSON/JSONB operations
- Array operations
- Full-text search
- Geometric data types

## License

MIT
