#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import pkg from "pg";
import pino from "pino";

const { Pool } = pkg;

const server = new McpServer({
    name: "zemcp-postgres",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

const host = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const port = parseInt(process.env.DB_PORT) || 5432;
const database = process.env.DB_NAME;
const enableValidation = process.env.ENABLE_VALIDATION === 'true';
const debugSql = process.env.DEBUG_SQL === 'true';
const logFile = process.env.LOG_FILE;

const streams = [{ stream: process.stdout }];
if (logFile) {
    streams.push({ stream: pino.destination(logFile) });
}
const logger = pino({ level: 'info' }, pino.multistream(streams));

if (!host || !user || !password || !database) {
    logger.error("Missing required environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME");
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

const config = {
    host,
    port,
    database,
    user,
    password,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT) || 15000,
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT) || 30000,
    query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
};

let globalPool = null;

async function getPool() {
    if (!globalPool) {
        logger.info("Creating connection pool...");
        globalPool = new Pool(config);
        
        globalPool.on('error', (err) => {
            logger.error('Unexpected error on idle client:', err);
        });
        
        logger.info("Connection pool created successfully!");
    }
    return globalPool;
}

const DANGEROUS_PATTERNS = [
    /\bDROP\s+DATABASE\b/i,
    /\bCREATE\s+DATABASE\b/i,
    /\bALTER\s+DATABASE\b/i,
    /\bDROP\s+SCHEMA\b/i,
    /\bCREATE\s+SCHEMA\b/i,
    /\bALTER\s+SCHEMA\b/i,
    /\bCOPY\s+.*FROM\s+PROGRAM\b/i,
    /\blo_import\b/i,
    /\blo_export\b/i,
    /\bdblink\b/i,
    /\bfile_fdw\b/i
];

function checkForDangerousOperations(sql) {
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(sql)) {
            throw new Error(`Potentially dangerous operation detected: ${sql.substring(0, 50)}...`);
        }
    }
}

async function validateSqlSyntax(sql, pool) {
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

    // For PostgreSQL, we can use EXPLAIN to validate syntax for SELECT statements
    if (trimmedSql.startsWith("select")) {
        try {
            const client = await pool.connect();
            try {
                await client.query(`EXPLAIN ${sql}`);
            } finally {
                client.release();
            }
        } catch (explainError) {
            if (explainError.message.includes('syntax error') ||
                explainError.message.includes('relation') ||
                explainError.message.includes('column')) {
                logger.warn('Syntax validation warning: ' + explainError.message);
            }
        }
    }
}

async function validateQuery(sql, pool) {
    checkForDangerousOperations(sql);
    await validateSqlSyntax(sql, pool);
}

async function validateScript(sqlScript, pool) {
    const statements = [];
    let currentStatement = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let dollarQuoteTag = null;

    for (let i = 0; i < sqlScript.length; i++) {
        const char = sqlScript[i];
        const nextChar = sqlScript[i + 1];

        // Handle PostgreSQL dollar quoting
        if (char === '$' && !inSingleQuote && !inDoubleQuote && !dollarQuoteTag) {
            const dollarMatch = sqlScript.slice(i).match(/^\$([a-zA-Z_][a-zA-Z0-9_]*)?\$/);
            if (dollarMatch) {
                dollarQuoteTag = dollarMatch[0];
                currentStatement += dollarQuoteTag;
                i += dollarQuoteTag.length - 1;
                continue;
            }
        } else if (dollarQuoteTag && sqlScript.slice(i).startsWith(dollarQuoteTag)) {
            currentStatement += dollarQuoteTag;
            i += dollarQuoteTag.length - 1;
            dollarQuoteTag = null;
            continue;
        }

        if (dollarQuoteTag) {
            currentStatement += char;
            continue;
        }

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
            await validateQuery(stmt, pool);
        } catch (error) {
            throw new Error(`Validation error in statement: ${stmt.substring(0, 50)}... - ${error.message}`);
        }
    }

    return statements;
}

server.tool(
    "execute-postgres-query",
    "Execute a query on the PostgreSQL DB",
    {
        query: z.string().describe("The query to run, ending with ';'. example 'SELECT tablename FROM pg_tables;'"),
    },
    async ({ query }) => {
        if (!query.trim().endsWith(';')) {
            throw new Error("Query must end with a semicolon (;)");
        }

        const queryWithoutSemiColumn = query.trim().slice(0, -1);

        if (debugSql) {
            logger.info("🐛 DEBUG: Received PostgreSQL query:");
            logger.info(queryWithoutSemiColumn);
        }

        if (!queryWithoutSemiColumn) {
            throw new Error('Missing required parameters');
        }

        let client;

        try {
            const pool = await getPool();

            if (enableValidation) {
                await validateQuery(queryWithoutSemiColumn, pool);
            }

            client = await pool.connect();
            const result = await client.query(queryWithoutSemiColumn);

            const resultString = JSON.stringify(result.rows, null, 2);
            
            if (debugSql) {
                logger.info("🐛 DEBUG: PostgreSQL query response:");
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
            if (client) {
                client.release();
            }
        }
    },
);

server.tool(
    "execute-postgres-script",
    "Execute a script on the PostgreSQL DB and returns a list of outputs each corresponding to an instruction",
    {
        sqlScript: z.string().describe("The script to run. commands separated by ';' and ending with ';', example 'CREATE TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(100));INSERT INTO test_table (name) VALUES (''Alice'');'"),
    },
    async ({ sqlScript }) => {
        if (!sqlScript) {
            throw new Error('Missing required parameters');
        }

        if (!sqlScript.trim().endsWith(';')) {
            throw new Error("Script must end with a semicolon (;)");
        }

        let client;

        try {
            const pool = await getPool();

            let statements;
            if (enableValidation) {
                if (debugSql) {
                    logger.info("🐛 DEBUG: Validating PostgreSQL script...");
                }
                statements = await validateScript(sqlScript, pool);
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
            client = await pool.connect();

            // Start a transaction for script execution
            await client.query('BEGIN');

            try {
                for (let i = 0; i < statements.length; i++) {
                    const stmt = statements[i];
                    
                    if (debugSql) {
                        logger.info(`🐛 DEBUG: Executing PostgreSQL statement ${i + 1}/${statements.length}:`);
                        logger.info(stmt);
                    }

                    const isSelect = stmt.trim().toLowerCase().startsWith("select");

                    try {
                        const result = await client.query(stmt);

                        if (isSelect || result.rows) {
                            results.push(result.rows);
                            if (debugSql) {
                                logger.info(`🐛 DEBUG: Statement ${i + 1} response - returned ${result.rows ? result.rows.length : 0} rows:`);
                                logger.info(JSON.stringify(result.rows, null, 2));
                            }
                        } else {
                            results.push({ rowsAffected: result.rowCount });
                            if (debugSql) {
                                logger.info(`🐛 DEBUG: Statement ${i + 1} response - affected ${result.rowCount} rows`);
                            }
                        }
                    } catch (execError) {
                        logger.error(`Error executing statement ${i + 1}: ${execError.message}`);
                        logger.error(`Failed statement: ${stmt}`);
                        throw new Error(`Error in statement ${i + 1}: ${execError.message}\nFailed SQL: ${stmt}`);
                    }
                }

                // Commit the transaction
                await client.query('COMMIT');
                
            } catch (transactionError) {
                // Rollback on any error
                await client.query('ROLLBACK');
                throw transactionError;
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
            if (client) {
                client.release();
            }
        }
    },
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.error("PostgreSQL Server running on stdio");
}

process.on('SIGINT', async () => {
    logger.info('Received SIGINT, closing connection pool...');
    if (globalPool) {
        await globalPool.end();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, closing connection pool...');
    if (globalPool) {
        await globalPool.end();
    }
    process.exit(0);
});

export { server };

main().catch((error) => {
    logger.error("Fatal error in main(): " + error);
    process.exit(1);
});
