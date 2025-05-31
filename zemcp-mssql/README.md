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
- `DISABLE_VALIDATION` - Set to `true` to disable SQL validation and dangerous operation checks (default: false)
- `DEBUG_SQL` - Set to `true` to enable detailed SQL request/response logging (default: false)

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

### DISABLE_VALIDATION
When set to `true`, bypasses all SQL validation including dangerous operation detection:

```bash
export DISABLE_VALIDATION=true
npx zemcp-mssql
```

⚠️ **Warning**: This allows potentially dangerous operations like `DROP DATABASE`, `SHUTDOWN`, etc.

### DEBUG_SQL
When set to `true`, logs all SQL requests and responses for debugging:

```bash
export DEBUG_SQL=true
npx zemcp-mssql
```

Useful for troubleshooting, performance analysis, and development.

## Security

- All queries use parameterized execution when possible
- Input validation using Zod schemas
- Dangerous operation detection (can be disabled with DISABLE_VALIDATION)
- Separate tools for read and write operations
- Environment-based configuration

## License

MIT
