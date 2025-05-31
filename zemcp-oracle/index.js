#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import oracledb from "oracledb";

const server = new McpServer({
    name: "zemcp-oracle",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const connectString = process.env.DB_CONNECT_STRING;
const disableValidation = process.env.DISABLE_VALIDATION === 'true';
const debugSql = process.env.DEBUG_SQL === 'true';

if (!connectString || !user || !password) {
    console.error("Missing required environment variables: DB_CONNECT_STRING, DB_USER, DB_PASSWORD");
    process.exit(1);
}

if (disableValidation) {
    console.warn("⚠️  WARNING: SQL validation is DISABLED. Dangerous operations are allowed!");
} else {
    console.log("✅ SQL validation is enabled for safety");
}

if (debugSql) {
    console.log("🐛 DEBUG_SQL is enabled - SQL requests and responses will be logged");
}

function parsePrivilege(privilegeString) {
    if (!privilegeString) return undefined;

    const upperPrivilege = privilegeString.toUpperCase();

    switch (upperPrivilege) {
        case "SYSDBA":
            return oracledb.SYSDBA;
        case "SYSOPER":
            return oracledb.SYSOPER;
        case "SYSASM":
            return oracledb.SYSASM;
        case "SYSBACKUP":
            return oracledb.SYSBACKUP;
        case "SYSDG":
            return oracledb.SYSDG;
        case "SYSKM":
            return oracledb.SYSKM;
        case "SYSRAC":
            return oracledb.SYSRAC;
        case "NONE":
        case "":
            return undefined;
        default:
            console.warn(`Unknown privilege: ${privilegeString}. Available privileges: SYSDBA, SYSOPER, SYSASM, SYSBACKUP, SYSDG, SYSKM, SYSRAC, or NONE`);
            return undefined;
    }
}

const privilege = parsePrivilege(process.env.DB_PRIVILEGE);

const DANGEROUS_PATTERNS = [
    /\bDROP\s+DATABASE\b/i,
    /\bSHUTDOWN\b/i,
    /\bSTARTUP\b/i,
    /\bALTER\s+SYSTEM\b/i,
    /\bUTL_FILE\b/i,
    /\bDBMS_JAVA\b/i,
    /\bDBMS_SCHEDULER\b/i
];

function checkForDangerousOperations(sql) {
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(sql)) {
            throw new Error(`Potentially dangerous operation detected: ${sql.substring(0, 50)}...`);
        }
    }
}

async function validateSqlSyntax(sql, connection) {
    const trimmedSql = sql.trim().toLowerCase();

    if (trimmedSql.length === 0) {
        throw new Error('Empty SQL statement');
    }

    const singleQuotes = (sql.match(/'/g) || []).length;
    const doubleQuotes = (sql.match(/"/g) || []).length;

    if (singleQuotes % 2 !== 0) {
        throw new Error('Unbalanced single quotes in SQL statement');
    }

    if (doubleQuotes % 2 !== 0) {
        throw new Error('Unbalanced double quotes in SQL statement');
    }

    if (trimmedSql.startsWith("select")) {
        try {
            await connection.execute(`EXPLAIN PLAN FOR ${sql}`, [], {
                autoCommit: true,
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });
        } catch (explainError) {
            if (explainError.message.includes('ORA-00900') ||
                explainError.message.includes('ORA-00942') ||
                explainError.message.includes('ORA-00904')) {
                console.warn('Syntax validation warning:', explainError.message);
            }
        }
    }
}

async function validateQuery(sql, connection) {
    checkForDangerousOperations(sql);
    await validateSqlSyntax(sql, connection);
}

async function validateScript(sqlScript, connection) {
    const statements = [];
    let currentStatement = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;

    for (let i = 0; i < sqlScript.length; i++) {
        const char = sqlScript[i];
        const nextChar = sqlScript[i + 1];

        if (char === "'" && !inDoubleQuote) {
            if (nextChar === "'") {
                currentStatement += "''";
                i++;
            } else {
                inSingleQuote = !inSingleQuote;
                currentStatement += char;
            }
        } else if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            currentStatement += char;
        } else if (char === ';' && !inSingleQuote && !inDoubleQuote) {
            const trimmed = currentStatement.trim();
            if (trimmed.length > 0) {
                statements.push(trimmed);
            }
            currentStatement = '';
        } else {
            currentStatement += char;
        }
    }

    const lastStatement = currentStatement.trim();
    if (lastStatement.length > 0) {
        statements.push(lastStatement);
    }

    for (const stmt of statements) {
        try {
            await validateQuery(stmt, connection);
        } catch (error) {
            throw new Error(`Validation error in statement: ${stmt.substring(0, 50)}... - ${error.message}`);
        }
    }

    return statements;
}


server.tool(
    "execute-oracle-query",
    "Execute a query on the oracle DB",
    {
        query: z.string().describe("The query to run, ending with ';'. example 'SELECT table_name FROM user_tables;'"),
    },
    async ({ query }) => {
        if (!query) {
            throw new Error('Missing required parameters');
        }

        if (!query.trim().endsWith(';')) {
            throw new Error("Query must end with a semicolon (;)");
        }

        const queryWithoutSemiColumn = query.trim().slice(0, -1);

        if (debugSql) {
            console.log("🐛 DEBUG: Received Oracle SQL query:");
            console.log(queryWithoutSemiColumn);
        }

        let connection;

        try {
            connection = await oracledb.getConnection({
                user,
                password,
                connectString,
                privilege,
            });

            if (!disableValidation) {
                await validateQuery(queryWithoutSemiColumn, connection);
            }

            const result = await connection.execute(queryWithoutSemiColumn, [], {
                autoCommit: true,
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            const resultString = JSON.stringify(result, null, 2);
            
            if (debugSql) {
                console.log("🐛 DEBUG: Oracle query response:");
                console.log(resultString);
            }

            return {
                content: [
                    {
                        type: "text",
                        text: resultString,
                    },
                ],
            };

        } catch (err) {
            console.error('Error executing query:', err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    },
);

server.tool(
    "execute-oracle-script",
    "Execute a script on the oracle DB and returns a list of outputs each corresponding to an instruction",
    {
        sqlScript: z.string().describe("The script to run. commands separated by ';' and ending with ';' or PL/SQL block, example 'CREATE TABLE test_table (id NUMBER, name VARCHAR2(100));INSERT INTO test_table (id, name) VALUES (1, 'Alice');'"),
    },
    async ({ sqlScript }) => {
        if (!sqlScript) {
            throw new Error('Missing required parameters');
        }

        if (!sqlScript.trim().endsWith(';')) {
            throw new Error("Script must end with a semicolon (;)");
        }

        let connection;

        try {
            connection = await oracledb.getConnection({
                user,
                password,
                connectString,
                privilege,
            });

            let statements;
            if (!disableValidation) {
                if (debugSql) {
                    console.log("🐛 DEBUG: Validating Oracle script...");
                }
                statements = await validateScript(sqlScript, connection);
                if (debugSql) {
                    console.log(`🐛 DEBUG: Script contains ${statements.length} statements`);
                }
            } else {
                // When validation is disabled, just split by semicolons
                statements = sqlScript.split(';').map(s => s.trim()).filter(s => s.length > 0);
                if (debugSql) {
                    console.log(`🐛 DEBUG: Script contains ${statements.length} statements (validation disabled)`);
                }
            }

            const results = [];

            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i];
                
                if (debugSql) {
                    console.log(`🐛 DEBUG: Executing Oracle statement ${i + 1}/${statements.length}:`);
                    console.log(stmt);
                }

                const isSelect = stmt.trim().toLowerCase().startsWith("select");

                try {
                    const result = await connection.execute(
                        stmt,
                        [],
                        {
                            outFormat: oracledb.OUT_FORMAT_OBJECT,
                            autoCommit: true,
                        }
                    );

                    if (isSelect) {
                        results.push(result.rows);
                        if (debugSql) {
                            console.log(`🐛 DEBUG: Statement ${i + 1} response - returned ${result.rows.length} rows:`);
                            console.log(JSON.stringify(result.rows, null, 2));
                        }
                    } else {
                        results.push({ rowsAffected: result.rowsAffected });
                        if (debugSql) {
                            console.log(`🐛 DEBUG: Statement ${i + 1} response - affected ${result.rowsAffected} rows`);
                        }
                    }
                } catch (execError) {
                    console.error(`Error executing statement ${i + 1}:`, execError.message);
                    console.error(`Failed statement:`, stmt);
                    throw new Error(`Error in statement ${i + 1}: ${execError.message}\nFailed SQL: ${stmt}`);
                }
            }

            console.log("Script execution completed successfully");
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };

        } catch (err) {
            console.error('Error executing script:', err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                    console.log("Database connection closed");
                } catch (err) {
                    console.error('Error closing connection:', err);
                }
            }
        }
    },
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("oracle Server running on stdio");
}

export { server };

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});