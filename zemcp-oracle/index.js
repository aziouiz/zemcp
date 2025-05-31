#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import oracledb from "oracledb";
import pino from "pino";

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
const enableValidation = process.env.ENABLE_VALIDATION === 'true';
const debugSql = process.env.DEBUG_SQL === 'true';
const logFile = process.env.LOG_FILE;

const streams = [{ stream: process.stdout }];
if (logFile) {
    streams.push({ stream: pino.destination(logFile) });
}
const logger = pino({ level: 'info' }, pino.multistream(streams));

if (!connectString || !user || !password) {
    logger.error("Missing required environment variables: DB_CONNECT_STRING, DB_USER, DB_PASSWORD");
    process.exit(1);
}

if (logFile) {
    logger.info(`📝 File logging enabled: ${logFile}`);
}

if (enableValidation) {
    logger.info("✅ SQL validation is enabled for safety");
} else {
    logger.warn("⚠️  WARNING: SQL validation is DISABLED by default. Set ENABLE_VALIDATION=true to enable safety checks!");
}

if (debugSql) {
    logger.info("🐛 DEBUG_SQL is enabled - SQL requests and responses will be logged");
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
            logger.warn(`Unknown privilege: ${privilegeString}. Available privileges: SYSDBA, SYSOPER, SYSASM, SYSBACKUP, SYSDG, SYSKM, SYSRAC, or NONE`);
            return undefined;
    }
}

const privilege = parsePrivilege(process.env.DB_PRIVILEGE);

let globalPool = null;

async function getConnection() {
    if (!globalPool) {
        logger.info("Creating connection pool...");
        globalPool = await oracledb.createPool({
            user,
            password,
            connectString,
            privilege,
            poolMin: parseInt(process.env.DB_POOL_MIN) || 2,
            poolMax: parseInt(process.env.DB_POOL_MAX) || 10,
            poolIncrement: parseInt(process.env.DB_POOL_INCREMENT) || 1,
            poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT) || 60,
            queueTimeout: parseInt(process.env.DB_POOL_QUEUE_TIMEOUT) || 60000
        });
        logger.info("Connection pool created successfully!");
    }
    return await globalPool.getConnection();
}

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
                logger.warn('Syntax validation warning: ' + explainError.message);
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
            logger.info("🐛 DEBUG: Received Oracle SQL query:");
            logger.info(queryWithoutSemiColumn);
        }

        let connection;

        try {
            connection = await getConnection();

            if (enableValidation) {
                await validateQuery(queryWithoutSemiColumn, connection);
            }

            const result = await connection.execute(queryWithoutSemiColumn, [], {
                autoCommit: true,
                outFormat: oracledb.OUT_FORMAT_OBJECT,
            });

            const resultString = JSON.stringify(result, null, 2);
            
            if (debugSql) {
                logger.info("🐛 DEBUG: Oracle query response:");
                logger.info(resultString);
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
            logger.error('Error executing query: ' + err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                } catch (err) {
                    logger.error('Error closing connection: ' + err);
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
            connection = await getConnection();

            let statements;
            if (enableValidation) {
                if (debugSql) {
                    logger.info("🐛 DEBUG: Validating Oracle script...");
                }
                statements = await validateScript(sqlScript, connection);
                if (debugSql) {
                    logger.info(`🐛 DEBUG: Script contains ${statements.length} statements`);
                }
            } else {
                statements = sqlScript.split(';').map(s => s.trim()).filter(s => s.length > 0);
                if (debugSql) {
                    logger.info(`🐛 DEBUG: Script contains ${statements.length} statements (validation disabled)`);
                }
            }

            const results = [];

            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i];
                
                if (debugSql) {
                    logger.info(`🐛 DEBUG: Executing Oracle statement ${i + 1}/${statements.length}:`);
                    logger.info(stmt);
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
                            logger.info(`🐛 DEBUG: Statement ${i + 1} response - returned ${result.rows.length} rows:`);
                            logger.info(JSON.stringify(result.rows, null, 2));
                        }
                    } else {
                        results.push({ rowsAffected: result.rowsAffected });
                        if (debugSql) {
                            logger.info(`🐛 DEBUG: Statement ${i + 1} response - affected ${result.rowsAffected} rows`);
                        }
                    }
                } catch (execError) {
                    logger.error(`Error executing statement ${i + 1}: ${execError.message}`);
                    logger.error(`Failed statement: ${stmt}`);
                    throw new Error(`Error in statement ${i + 1}: ${execError.message}\nFailed SQL: ${stmt}`);
                }
            }

            logger.info("Script execution completed successfully");
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(results, null, 2),
                    },
                ],
            };

        } catch (err) {
            logger.error('Error executing script: ' + err);
            throw err;
        } finally {
            if (connection) {
                try {
                    await connection.close();
                    logger.info("Database connection closed");
                } catch (err) {
                    logger.error('Error closing connection: ' + err);
                }
            }
        }
    },
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.error("Oracle Server running on stdio");
}

process.on('SIGINT', async () => {
    logger.info('Received SIGINT, closing connection pool...');
    if (globalPool) {
        await globalPool.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, closing connection pool...');
    if (globalPool) {
        await globalPool.close();
    }
    process.exit(0);
});

export { server };

main().catch((error) => {
    logger.error("Fatal error in main(): " + error);
    process.exit(1);
});