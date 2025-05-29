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

- `DB_USER` - Database username
- `DB_PASSWORD` - Database password  
- `DB_CONNECT_STRING` - Oracle connection string (e.g., localhost:1521/XEPDB1)
- `DB_PRIVILEGE` - Database privilege (optional, e.g., SYSDBA)

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

## Security

- TODO

## License

MIT
