# ZeMCP Oracle Server

Model Context Protocol server for Oracle Database interactions.

## Installation

```bash
# No installation required! Use npx:
npx zemcp-oracle

# Or install globally:
npm install -g zemcp-oracle
```

## Usage

```bash
# Using npx (recommended):
npx zemcp-oracle

# Or if installed globally:
zemcp-oracle
```

## Configuration

Set the following environment variables:

### Required
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password  
- `DB_CONNECT_STRING` - Oracle connection string (e.g., localhost:1521/XEPDB1)

### Optional
- `DB_PRIVILEGE` - Database privilege (e.g., SYSDBA, SYSOPER, SYSASM)
- `ENABLE_VALIDATION` - Set to `true` to enable SQL validation and dangerous operation checks (default: false)
- `DEBUG_SQL` - Set to `true` to enable detailed SQL request/response logging (default: false)
- `LOG_FILE` - Absolute path to log file for dual logging to console and file (optional)

### Connection Pool Configuration
- `DB_POOL_MIN` - Minimum number of connections in pool (default: 2)
- `DB_POOL_MAX` - Maximum number of connections in pool (default: 10)
- `DB_POOL_INCREMENT` - Number of connections to create when pool needs to expand (default: 1)
- `DB_POOL_TIMEOUT` - Time in seconds before idle connections are closed (default: 60)
- `DB_POOL_QUEUE_TIMEOUT` - Time in milliseconds to wait for connection from pool (default: 60000)

## MCP Tools

### execute-oracle-query
Execute SELECT queries safely.

**Parameters:**
- `query` (string) - SQL SELECT query to execute

**Example:**
```sql
SELECT table_name FROM user_tables;
```

### execute-oracle-script
Execute multiple SQL statements or PL/SQL blocks.

**Parameters:**
- `sqlScript` (string) - SQL script with multiple statements separated by ';' or PL/SQL block

**Example:**
```sql
CREATE TABLE test_table (id NUMBER, name VARCHAR2(100));
INSERT INTO test_table (id, name) VALUES (1, 'Alice');
```

## Environment Variable Usage

### ENABLE_VALIDATION
When set to `true`, enables SQL validation including dangerous operation detection:

```bash
export ENABLE_VALIDATION=true
npx zemcp-oracle
```

⚠️ **Note**: Validation is DISABLED by default for performance. Enable it to prevent potentially dangerous operations like `DROP DATABASE`, `SHUTDOWN`, etc.

### DEBUG_SQL
When set to `true`, logs all SQL requests and responses for debugging:

```bash
export DEBUG_SQL=true
npx zemcp-oracle
```

Useful for troubleshooting, performance analysis, and development.

### LOG_FILE
When set to an absolute file path, logs all output to both console and the specified file:

```bash
export LOG_FILE=/var/log/oracle-mcp.log
npx zemcp-oracle
```

The log file will contain timestamped JSON entries from Pino logger. Useful for production monitoring and audit trails.

### Connection Pool Configuration
Optimize database performance by configuring Oracle connection pool settings:

```bash
# Production environment with high concurrency
export DB_POOL_MIN=5
export DB_POOL_MAX=50
export DB_POOL_INCREMENT=2
export DB_POOL_TIMEOUT=120
export DB_POOL_QUEUE_TIMEOUT=30000
npx zemcp-oracle
```

```bash
# Development environment with minimal resources
export DB_POOL_MIN=1
export DB_POOL_MAX=5
export DB_POOL_INCREMENT=1
export DB_POOL_TIMEOUT=30
export DB_POOL_QUEUE_TIMEOUT=15000
npx zemcp-oracle
```

**Oracle Pool Configuration Guidelines:**
- **DB_POOL_MIN**: Keep at least 1-2 connections open; Oracle recommends minimum connections for immediate availability
- **DB_POOL_MAX**: Set based on Oracle's `processes` parameter and expected concurrent load (typically 10-100)
- **DB_POOL_INCREMENT**: Use 1-2 for gradual scaling, higher values (2-5) for rapid load increases
- **DB_POOL_TIMEOUT**: Oracle-specific idle timeout in seconds (30-120s typical range)
- **DB_POOL_QUEUE_TIMEOUT**: Time to wait for connection in milliseconds; increase for high-load scenarios

**Oracle-Specific Considerations:**
- Oracle connections are heavier than other databases - tune pool sizes carefully
- Consider Oracle's `sessions` and `processes` init parameters when setting `DB_POOL_MAX`
- For SYSDBA/SYSOPER connections, use smaller pool sizes (2-5 max)
- Monitor Oracle's `v$session` view to track actual connection usage

## MCP Client Configuration

### VS Code MCP Extension

To use this server with VS Code's MCP support, create or update `.vscode/mcp.json`:

```json
{
  "inputs": [
    {
      "id": "oracle-password",
      "type": "promptString", 
      "description": "Oracle DB Password",
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
      "id": "oracle-password",
      "type": "promptString", 
      "description": "Oracle DB Password",
      "password": true
    }
  ],
  "servers": {
    "zemcp-oracle": {
      "type": "stdio",
      "command": "npx",
      "args": ["zemcp-oracle"],
      "env": {
        "DB_USER": "your_username",
        "DB_PASSWORD": "${input:oracle-password}",
        "DB_CONNECT_STRING": "your-server:1521/your_service",
        "ENABLE_VALIDATION": "true",
        "LOG_FILE": "/var/log/oracle-mcp.log",
        "DB_POOL_MIN": "5",
        "DB_POOL_MAX": "30",
        "DB_POOL_INCREMENT": "2"
      }
    }
  }
}
```

## Security

- SQL query validation (can be enabled with ENABLE_VALIDATION)
- Dangerous operation detection (can be enabled with ENABLE_VALIDATION)
- Environment-based configuration
- Support for Oracle privilege-based connections (SYSDBA, SYSOPER, etc.)

## License

MIT
