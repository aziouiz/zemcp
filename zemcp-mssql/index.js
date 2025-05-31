#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import mssql from "mssql";
import pino from "pino";

const server = new McpServer({
    name: "zemcp-mssql",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});

const serverHost = process.env.DB_HOST;
const user = process.env.DB_USER;
const password = process.env.DB_PASSWORD;
const port = parseInt(process.env.DB_PORT);
const database = process.env.DB_NAME;
const enableValidation = process.env.ENABLE_VALIDATION === 'true';
const debugSql = process.env.DEBUG_SQL === 'true';
const logFile = process.env.LOG_FILE;

const streams = [{ stream: process.stdout }];
if (logFile) {
    streams.push({ stream: pino.destination(logFile) });
}
const logger = pino({ level: 'info' }, pino.multistream(streams));

if (!serverHost || !user || !password || !port || !database) {
    logger.error("Missing required environment variables: DB_HOST, DB_USER, DB_PASSWORD, DB_PORT, DB_NAME");
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
    user,
    password,
    server: serverHost,
    port,
    database,
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
    pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 10,
        min: parseInt(process.env.DB_POOL_MIN) || 2,
        idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT) || 30000,
        acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT) || 15000,
        createTimeoutMillis: parseInt(process.env.DB_POOL_CREATE_TIMEOUT) || 15000,
        destroyTimeoutMillis: parseInt(process.env.DB_POOL_DESTROY_TIMEOUT) || 5000,
    },
};

let globalPool = null;

async function getPool() {
    if (!globalPool) {
        logger.info("Creating connection pool...");
        globalPool = await mssql.connect(config);
        logger.info("Connection pool created successfully!");
    }
    return globalPool;
}

const DANGEROUS_PATTERNS = [
    /\bDROP\s+DATABASE\b/i,
    /\bSHUTDOWN\b/i,
    /\bxp_cmdshell\b/i,
    /\bsp_configure\b/i,
    /\bBULK\s+INSERT\b/i,
    /\bOPENROWSET\b/i,
    /\bOPENDATASOURCE\b/i
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

    try {
        const request = pool.request();
        await request.prepare(sql);
        await request.unprepare();
    } catch (prepareError) {
        if (prepareError.message.includes('Incorrect syntax near') ||
            prepareError.message.includes('Invalid column name') ||
            prepareError.message.includes('Invalid object name')) {
            logger.warn('Syntax validation warning: ' + prepareError.message);
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
            await validateQuery(stmt, pool);
        } catch (error) {
            throw new Error(`Validation error in statement: ${stmt.substring(0, 50)}... - ${error.message}`);
        }
    }

    return statements;
}

server.tool(
    "execute-mssql-query",
    "Execute a query on the MSSQL DB",
    {
        query: z.string().describe("The query to run, ending with ';'. example 'SELECT name FROM sys.tables;'"),
    },
    async ({ query }) => {
        if (!query.trim().endsWith(';')) {
            throw new Error("Query must end with a semicolon (;)");
        }

        const queryWithoutSemiColumn = query.trim().slice(0, -1);

        if (debugSql) {
            logger.info("🐛 DEBUG: Received SQL query:");
            logger.info(queryWithoutSemiColumn);
        }

        if (!queryWithoutSemiColumn) {
            throw new Error('Missing required parameters');
        }

        try {
            const pool = await getPool();

            if (enableValidation) {
                await validateQuery(queryWithoutSemiColumn, pool);
            }

            const result = await pool.request().query(queryWithoutSemiColumn);

            const resultString = JSON.stringify(result.recordset, null, 2);
            
            if (debugSql) {
                logger.info("🐛 DEBUG: MSSQL query response:");
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
        }
    },
);

server.tool(
    "execute-mssql-script",
    "Execute a script on the MSSQL DB and returns a list of outputs each corresponding to an instruction",
    {
        sqlScript: z.string().describe("The script to run. commands separated by ';' and ending with ';', example 'CREATE TABLE test_table (id INT, name NVARCHAR(100));INSERT INTO test_table (id, name) VALUES (1, 'Alice');'"),
    },
    async ({ sqlScript }) => {
        if (!sqlScript) {
            throw new Error('Missing required parameters');
        }

        if (!sqlScript.trim().endsWith(';')) {
            throw new Error("Script must end with a semicolon (;)");
        }

        try {
            const pool = await getPool();

            let statements;
            if (enableValidation) {
                if (debugSql) {
                    logger.info("🐛 DEBUG: Validating script...");
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

            for (let i = 0; i < statements.length; i++) {
                const stmt = statements[i];
                
                if (debugSql) {
                    logger.info(`🐛 DEBUG: Executing statement ${i + 1}/${statements.length}:`);
                    logger.info(stmt);
                }

                const isSelect = stmt.trim().toLowerCase().startsWith("select");

                try {
                    const result = await pool.request().query(stmt);

                    if (isSelect) {
                        results.push(result.recordset);
                        if (debugSql) {
                            logger.info(`🐛 DEBUG: Statement ${i + 1} response - returned ${result.recordset.length} rows:`);
                            logger.info(JSON.stringify(result.recordset, null, 2));
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
        }
    },
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.error("MSSQL Server running on stdio");
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