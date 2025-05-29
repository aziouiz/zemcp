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

- `DB_HOST` - Database host (default: localhost)
- `DB_PORT` - Database port (default: 1433)
- `DB_NAME` - Database name
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password

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

## Security

- All queries use parameterized execution when possible
- Input validation using Zod schemas
- Separate tools for read and write operations
- Environment-based configuration

## License

MIT
