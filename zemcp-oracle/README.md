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
- `DISABLE_VALIDATION` - Set to `true` to disable SQL validation and dangerous operation checks (default: false)
- `DEBUG_SQL` - Set to `true` to enable detailed SQL request/response logging (default: false)

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

### DISABLE_VALIDATION
When set to `true`, bypasses all SQL validation including dangerous operation detection:

```bash
export DISABLE_VALIDATION=true
npx zemcp-oracle
```

⚠️ **Warning**: This allows potentially dangerous operations like `DROP DATABASE`, `SHUTDOWN`, etc.

### DEBUG_SQL
When set to `true`, logs all SQL requests and responses for debugging:

```bash
export DEBUG_SQL=true
npx zemcp-oracle
```

Useful for troubleshooting, performance analysis, and development.

## Security

- All queries use parameterized execution when possible
- Input validation using Zod schemas
- Dangerous operation detection (can be disabled with DISABLE_VALIDATION)
- Separate tools for read and write operations
- Environment-based configuration
- Support for Oracle privilege-based connections (SYSDBA, SYSOPER, etc.)

## License

MIT
