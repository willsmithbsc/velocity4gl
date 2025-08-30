"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMySQLConnection = testMySQLConnection;
exports.getMySQLTables = getMySQLTables;
exports.getTableFields = getTableFields;
exports.getSqliteDb = getSqliteDb;
exports.cacheTableFields = cacheTableFields;
exports.getCachedFields = getCachedFields;
const promise_1 = __importDefault(require("mysql2/promise"));
// @ts-ignore
// @ts-ignore
const sql_js_1 = __importDefault(require("sql.js"));
async function testMySQLConnection(config) {
    try {
        const connection = await promise_1.default.createConnection(config);
        await connection.ping();
        await connection.end();
        return 'Connection successful!';
    }
    catch (err) {
        return `Connection failed: ${err.message}`;
    }
}
async function getMySQLTables(config) {
    const connection = await promise_1.default.createConnection(config);
    const [rows] = await connection.query('SHOW TABLES');
    await connection.end();
    // Extract table names
    const tables = [];
    for (const row of rows) {
        const tableName = String(Object.values(row)[0]);
        tables.push(tableName);
    }
    return tables;
}
async function getTableFields(config, table) {
    const connection = await promise_1.default.createConnection(config);
    const [rows] = await connection.query(`DESCRIBE \`${table}\``);
    await connection.end();
    // Return detailed field objects for enhanced output
    return rows.map((r) => ({
        name: r.Field,
        type: r.Type,
        null: r.Null,
        key: r.Key,
        default: r.Default,
        extra: r.Extra
    }));
}
let sqliteDb = null;
async function getSqliteDb() {
    if (!sqliteDb) {
        const SQL = await (0, sql_js_1.default)({});
        sqliteDb = new SQL.Database();
    }
    return sqliteDb;
}
async function cacheTableFields(table, fields) {
    const db = await getSqliteDb();
    db.run('CREATE TABLE IF NOT EXISTS table_fields (table_name TEXT, field_name TEXT)');
    const stmt = db.prepare('INSERT INTO table_fields (table_name, field_name) VALUES (?, ?)');
    for (const field of fields) {
        stmt.run([table, field]);
    }
    stmt.free();
}
async function getCachedFields(table) {
    const db = await getSqliteDb();
    db.run('CREATE TABLE IF NOT EXISTS table_fields (table_name TEXT, field_name TEXT)');
    const stmt = db.prepare('SELECT field_name FROM table_fields WHERE table_name = ?');
    const result = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        result.push(row['field_name']);
    }
    stmt.free();
    return result;
}
//# sourceMappingURL=dbUtils.js.map