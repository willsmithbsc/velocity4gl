import mysql from 'mysql2/promise';
// @ts-ignore
// @ts-ignore
import initSqlJs from 'sql.js';
type SqlJsDatabase = any;

export interface MySQLConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
}
export async function testMySQLConnection(config: MySQLConfig): Promise<string> {
    try {
        const connection = await mysql.createConnection(config);
        await connection.ping();
        await connection.end();
        return 'Connection successful!';
    } catch (err: any) {
        return `Connection failed: ${err.message}`;
    }
}

export async function getMySQLTables(config: MySQLConfig): Promise<string[]> {
    const connection = await mysql.createConnection(config);
    const [rows] = await connection.query('SHOW TABLES');
    await connection.end();
    // Extract table names
    const tables: string[] = [];
        for (const row of rows as any[]) {
            const tableName = String(Object.values(row)[0]);
            tables.push(tableName);
    }
    return tables;
}

export async function getTableFields(config: MySQLConfig, table: string): Promise<string[]> {
    const connection = await mysql.createConnection(config);
        const [rows] = await connection.query(`DESCRIBE \`${table}\``);
    await connection.end();
        return (rows as any[]).map((r: any) => r.Field);
}


let sqliteDb: SqlJsDatabase | null = null;

export async function getSqliteDb(): Promise<SqlJsDatabase> {
    if (!sqliteDb) {
        const SQL = await initSqlJs({});
        sqliteDb = new SQL.Database();
    }
    return sqliteDb;
}

export async function cacheTableFields(table: string, fields: string[]): Promise<void> {
    const db = await getSqliteDb();
    db.run('CREATE TABLE IF NOT EXISTS table_fields (table_name TEXT, field_name TEXT)');
    const stmt = db.prepare('INSERT INTO table_fields (table_name, field_name) VALUES (?, ?)');
    for (const field of fields) {
        stmt.run([table, field]);
    }
    stmt.free();
}

export async function getCachedFields(table: string): Promise<string[]> {
    const db = await getSqliteDb();
    db.run('CREATE TABLE IF NOT EXISTS table_fields (table_name TEXT, field_name TEXT)');
    const stmt = db.prepare('SELECT field_name FROM table_fields WHERE table_name = ?');
    const result: string[] = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row['field_name'] as string);
    }
    stmt.free();
    return result;
}
