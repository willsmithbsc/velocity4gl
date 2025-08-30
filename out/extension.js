"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = __importStar(require("vscode"));
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context) {
    // Autocomplete provider for dbname and tablename in .4gl files
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('4gl', {
        async provideCompletionItems(document, position) {
            const lineText = document.lineAt(position.line).text;
            const beforeCursor = lineText.substring(0, position.character);
            // Stepwise autocomplete
            // use dbName ...
            // Always show all dbnames after 'use ' (even if user hasn't typed a prefix)
            if (/^use\s*$/i.test(beforeCursor) || /^use\s+$/i.test(beforeCursor)) {
                const dbNames = globalThis._velocity4gl_dbnames || [];
                return dbNames.map((db) => {
                    const item = new vscode.CompletionItem(db, vscode.CompletionItemKind.Variable);
                    item.filterText = db; // ensure all are shown
                    item.sortText = db;
                    return item;
                });
            }
            // Always suggest 'table' after any db name (even if cursor is after db name or after space)
            if (/^use\s+\S+/.test(beforeCursor) && !/^use\s+\S+\s+table/.test(beforeCursor)) {
                return [new vscode.CompletionItem('table', vscode.CompletionItemKind.Keyword)];
            }
            // use dbName table tableName ...
            // Always show all tables for the selected db after 'use dbName table ' (with or without trailing space)
            if (/^use\s+\S+\s+table\s*$/.test(beforeCursor) || /^use\s+\S+\s+table\s+$/.test(beforeCursor)) {
                const dbNameMatch = /^use\s+(\S+)\s+table\s*$/.exec(beforeCursor) || /^use\s+(\S+)\s+table\s+$/.exec(beforeCursor);
                const dbName = dbNameMatch ? dbNameMatch[1] : '';
                // Only use the live cache, never fallback
                const tablesMap = globalThis._velocity4gl_tables && globalThis._velocity4gl_tables[dbName] ? globalThis._velocity4gl_tables[dbName] : {};
                const liveTableNames = Object.keys(tablesMap).filter(tbl => Array.isArray(tablesMap[tbl]) && tablesMap[tbl].length > 0);
                if (liveTableNames.length === 0) {
                    return [];
                }
                return liveTableNames.map((tbl) => {
                    const item = new vscode.CompletionItem(tbl, vscode.CompletionItemKind.Variable);
                    item.filterText = tbl;
                    item.sortText = tbl;
                    return item;
                });
            }
            // use dbName table tableName as ...
            if (/^use\s+\S+\s+table\s+\S+\s*$/i.test(beforeCursor)) {
                return [new vscode.CompletionItem('as', vscode.CompletionItemKind.Keyword)];
            }
            // After 'as', allow free text for pseudo name
            return undefined;
        }
    }, ' '));
    // Command: Fill Table Fields below 'use from dbname table tablename as pseudo'
    // Automatically insert fields after completing the use line
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
        // Only proceed if a new line was added (Enter key)
        if (!event.contentChanges || event.contentChanges.length === 0) {
            return;
        }
        const change = event.contentChanges[0];
        // Check if the change is a newline insertion
        if (!change.text.includes('\n')) {
            return;
        }
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document !== editor.document) {
            return;
        }
        // Get the line before the new line
        const lineNum = change.range.start.line;
        if (lineNum < 0) {
            return;
        }
        const prevLineText = event.document.lineAt(lineNum).text.trim();
        const useRegex = /^use\s+(\S+)\s+table\s+(\S+)(?:\s+as\s+(\S+))?/i;
        const match = useRegex.exec(prevLineText);
        if (!match) {
            return;
        }
        const dbName = match[1];
        const tableName = match[2];
        try {
            const dbUtils = await import('./dbUtils.js');
            // Lookup fields using both dbName and tableName
            // Lookup fields using global cache for dbName and tableName
            const tablesMap = globalThis._velocity4gl_tables || {};
            let fields = (tablesMap[dbName] && tablesMap[dbName][tableName]) ? tablesMap[dbName][tableName] : await dbUtils.getCachedFields(tableName);
            // Only insert fields if they are real (not empty, not generated)
            if (!fields || fields.length === 0) {
                vscode.window.showInformationMessage(`No fields found for dbName='${dbName}', tableName='${tableName}'`);
                return;
            }
            // Check if fields already inserted below
            const nextLineNum = lineNum + 1;
            const nextLine = nextLineNum < event.document.lineCount ? event.document.lineAt(nextLineNum).text.trim() : '';
            // If fields are objects, check by name
            if (nextLine && fields.some((f) => nextLine.includes(f.name || f))) {
                return;
            }
            // Prepare field lines with attributes
            const fieldLines = fields.map((f) => {
                if (typeof f === 'object' && f.name) {
                    let attrParts = [];
                    if (f.type) {
                        attrParts.push(`type=${f.type}`);
                    }
                    if (f.key) {
                        attrParts.push(`key=${f.key}`);
                    }
                    if (f.sorted) {
                        attrParts.push(`sorted=${f.sorted}`);
                    }
                    if (f.ranges) {
                        attrParts.push(`ranges=${Array.isArray(f.ranges) ? f.ranges.join('|') : f.ranges}`);
                    }
                    return `    field ${f.name} ${attrParts.join(' ')}`;
                }
                else {
                    return `    field ${f}`;
                }
            });
            const insertPosition = new vscode.Position(nextLineNum, 0);
            await editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, fieldLines.join('\n') + '\n');
            });
            vscode.window.showInformationMessage(`Fields for table '${tableName}' inserted.`);
        }
        catch (err) {
            //vscode.window.showErrorMessage(`[4GL DEBUG] Error looking up fields for dbName='${dbName}', tableName='${tableName}': ${err}`);
        }
    }));
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "4gl-file-creator" is now active!');
    // Command: Connect to database(s) defined in the currently open file
    const connectDbDisposable = vscode.commands.registerCommand('4gl-file-creator.connectDatabase', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No file is open in the editor.');
            return;
        }
        const text = editor.document.getText();
        // Parse database definitions from the open file
        // Support both long-form and shorthand connection strings
        // Long-form: connect database rad_4gl_system as 4gl_db\n    type=mysql\n    host=localhost\n    ...
        // Shorthand: connect database rad_4gl_system mysql:host=localhost;dbname=rad_4gl_system;charset=utf8mb4;user=root as short_db
        const dbRegex = /connect database\s+(\S+)(?:\s+(mysql:[^\s]+))?\s+as\s+(\S+)([\s\S]*?)(?=connect database|database repository end|$)/g;
        const dbs = [];
        let match;
        while ((match = dbRegex.exec(text)) !== null) {
            const name = match[1];
            const shorthand = match[2];
            const alias = match[3];
            const block = match[4];
            const config = {};
            let type = 'mysql';
            if (shorthand && shorthand.startsWith('mysql:')) {
                // Parse shorthand connection string
                type = 'mysql';
                const parts = shorthand.replace('mysql:', '').split(';');
                for (const part of parts) {
                    const [key, value] = part.split('=');
                    if (!key || !value) {
                        continue;
                    }
                    const k = key.trim();
                    const v = value.trim();
                    if (k === 'host') {
                        config.host = v;
                    }
                    if (k === 'dbname') {
                        config.database = v;
                    }
                    if (k === 'charset') {
                        config.charset = v;
                    }
                    if (k === 'user') {
                        config.user = v;
                    }
                    if (k === 'password') {
                        config.password = v;
                    }
                    if (k === 'port') {
                        config.port = Number(v);
                    }
                }
            }
            // Detect sqlite memory database in shorthand or long-form
            if ((shorthand && shorthand.includes('sqlite::memory:')) || block.includes('sqlite::memory:')) {
                type = 'sqlite';
                config.filename = ':memory:';
            }
            // Parse config lines (long-form)
            const lines = block.split(/\r?\n/).map(l => l.trim()).filter(l => l);
            for (const line of lines) {
                if (line.startsWith('type=')) {
                    type = line.split('=')[1].trim();
                }
                if (line.startsWith('host=')) {
                    config.host = line.split('=')[1].trim();
                }
                if (line.startsWith('port=')) {
                    config.port = Number(line.split('=')[1].trim());
                }
                if (line.startsWith('username=')) {
                    config.user = line.split('=')[1].replace(/"/g, '').trim();
                }
                if (line.startsWith('password=')) {
                    config.password = line.split('=')[1].replace(/"/g, '').trim();
                }
                if (line.startsWith('charset=')) {
                    config.charset = line.split('=')[1].trim();
                }
                if (line.startsWith('sqlite::memory:')) {
                    type = 'sqlite';
                    config.filename = ':memory:';
                }
                if (line.startsWith('database=')) {
                    config.database = line.split('=')[1].trim();
                }
            }
            if (!config.database) {
                config.database = name;
            }
            dbs.push({ name, alias, config, type });
        }
        if (dbs.length === 0) {
            vscode.window.showErrorMessage('No database definitions found in the open file.');
            return;
        }
        // Connect to all databases found
        const dbUtils = await import('./dbUtils.js');
        let dbnames = globalThis._velocity4gl_dbnames || [];
        let tablesMap = globalThis._velocity4gl_tables || {};
        for (const db of dbs) {
            try {
                let testResult = '';
                if (db.type === 'mysql') {
                    testResult = await dbUtils.testMySQLConnection(db.config);
                }
                else if (db.type === 'sqlite') {
                    testResult = 'SQLite connection (in-memory or file) ready.';
                }
                vscode.window.showInformationMessage(`Database '${db.alias}': ${testResult}`);
                // Always show a message for sqlite, even if no tables
                if (db.type === 'sqlite' && !testResult) {
                    vscode.window.showInformationMessage(`Database '${db.alias}': SQLite connection (in-memory or file) ready.`);
                }
                if (testResult.startsWith('Connection successful') || db.type === 'sqlite') {
                    // Get tables for this database
                    let tables = [];
                    // Use getMySQLTables for MySQL, and getTableFields for SQLite (table list must be provided for SQLite)
                    if (db.type === 'mysql') {
                        //console.log(`[4GL DEBUG] Calling getMySQLTables for database '${db.alias}' with config:`, db.config);
                        //vscode.window.showInformationMessage(`[4GL DEBUG] Calling getMySQLTables for database '${db.alias}'`);
                        tables = await dbUtils.getMySQLTables(db.config);
                        //console.log(`[4GL DEBUG] Raw tables returned for database '${db.alias}':`, tables);
                        //vscode.window.showInformationMessage(`[4GL DEBUG] Raw tables returned for database '${db.alias}': ${tables.join(', ')}`);
                        //console.log(`[4GL DEBUG] Tables found for database '${db.alias}':`, tables);
                        //vscode.window.showInformationMessage(`[4GL DEBUG] Tables found for database '${db.alias}': ${tables.join(', ')}`);
                    }
                    else if (db.type === 'sqlite') {
                        // For SQLite, try to get tables from getTableFields with a special call, or provide your own table list
                        // Here, we assume you have a way to get SQLite table names, otherwise leave as []
                        tables = [];
                    }
                    tablesMap[db.alias] = tablesMap[db.alias] || {};
                    if (!dbnames.includes(db.alias)) {
                        dbnames.push(db.alias);
                    }
                    // Cache fields for all tables
                    for (const table of tables) {
                        let fields = await dbUtils.getTableFields(db.config, table);
                        tablesMap[db.alias][table] = fields;
                        dbUtils.cacheTableFields(table, fields); // keep legacy cache for fallback
                    }
                }
            }
            catch (err) {
                vscode.window.showErrorMessage(`Database '${db.alias}' connection failed: ${err.message}`);
            }
        }
        globalThis._velocity4gl_dbnames = dbnames;
        globalThis._velocity4gl_tables = tablesMap;
    });
    context.subscriptions.push(connectDbDisposable);
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('4gl-file-creator.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from 4GL File Creator!');
    });
    context.subscriptions.push(disposable);
    const create4glFileDisposable = vscode.commands.registerCommand('4gl-file-creator.createNew4glFile', async () => {
        const filename = await vscode.window.showInputBox({
            placeHolder: 'Enter new 4GL filename (without extension)',
            prompt: 'Filename for new .4gl file',
        });
        if (!filename) {
            return;
        }
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }
        const folderUri = folders[0].uri;
        const fileUri = vscode.Uri.joinPath(folderUri, filename + '.4gl');
        try {
            await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
            const doc = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Created file: ${filename}.4gl`);
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to create file: ' + err);
        }
    });
    context.subscriptions.push(create4glFileDisposable);
    const defaultAppCode = `// My Application Repository

system
    // System configuration, environment, entry points, etc.
    set appName = "My4GLApp"
    set appVersion = "1.0.0"
    set appAuthor = "Your Name"
    set appLicense = "MIT"
    set appDescription = "A simple 4GL application"
    set appLocation = "/path/to/your/app"
    set appHomepage = "https://example.com/my4glapp"
    set appRepository = "https://github.com/username/my4glapp"
    set programEntryPoint = "first_program_name.4gl"
    set login = false
    set system = single // options: single, saas, legacy
    set viewer = "browser" // options: browser, mobilie, desktop, terminal

system end

data
    // Database connections and table definitions
    connect database memdb sqlite::memory: as memory_db

	connect database rad_4gl_system mysql:host=localhost;dbname=rad_4gl_system;charset=utf8mb4;user=root as short_db
	 
    connect database rad_4gl_system as 4gl_db
        type=mysql
        host=localhost
        port=3306
        username="root"
        password=""
        charset=utf8mb4

data end


tables
	// Table use here  use 4gl_db table program	as test
	use 4gl_db table program_catalog as cat

	use 4gl_db table programs

	use 4gl_db table users

tables end

defaults
    // System-wide defaults (currency, tax rates, formats, etc.)
	default currency.string = "USD"
	default tax_rate.float = 0.07
	default date_format.string = "YYYY-MM-DD"
	default time_format.string = "HH:mm:ss"
	default timezone.string = "America/New_York"
	default vat_rate.float = 0.17
	default vat_rate.float = 0.20 execute 01:01:2026@00:00
defaults end

constants
    // Developer-defined constants
	const MAX_USERS.int = 1000
	const APP_NAME.string = "My4GLApp"
	const SUPPORT_EMAIL.string = "support@example.com"
	const PI.float = 3.14159
constants end

programs
    // Entry point and list of programs to compile/run
    // my first program
    first_program_name.4gl

    // my second program
    second_program_name.4gl

    // my third program
    third_program_name.4gl

programs end`;
    const createAppDisposable = vscode.commands.registerCommand('4gl-file-creator.createApp', async () => {
        const filename = await vscode.window.showInputBox({
            placeHolder: 'Enter new 4GL app filename (without extension)',
            prompt: 'Filename for new 4GL app (.4gl)',
        });
        if (!filename) {
            return;
        }
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }
        const folderUri = folders[0].uri;
        const fileUri = vscode.Uri.joinPath(folderUri, filename + '.4gl');
        try {
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(defaultAppCode, 'utf8'));
            const doc = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Created 4GL app: ${filename}.4gl`);
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to create 4GL app: ' + err);
        }
    });
    context.subscriptions.push(createAppDisposable);
    // Command: Create new .4gl file from current use line (table or pseudo name)
    const createProgramFromUseDisposable = vscode.commands.registerCommand('4gl-file-creator.createProgramFromUse', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No file is open in the editor.');
            return;
        }
        const position = editor.selection.active;
        const lineText = editor.document.lineAt(position.line).text.trim();
        // Match use line: use dbName table tableName [as pseudo]
        const useRegex = /^use\s+(\S+)\s+table\s+(\S+)(?:\s+as\s+(\S+))?/i;
        const match = useRegex.exec(lineText);
        if (!match) {
            vscode.window.showErrorMessage('Cursor is not on a valid use line.');
            return;
        }
        const tableName = match[2];
        const pseudoName = match[3];
        const defaultName = pseudoName || tableName;
        const filename = await vscode.window.showInputBox({
            placeHolder: `Enter new 4GL program filename (default: ${defaultName})`,
            prompt: 'Filename for new .4gl file',
            value: defaultName
        });
        if (!filename) {
            return;
        }
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open.');
            return;
        }
        const folderUri = folders[0].uri;
        const fileUri = vscode.Uri.joinPath(folderUri, filename + '.4gl');
        try {
            await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
            const doc = await vscode.workspace.openTextDocument(fileUri);
            await vscode.window.showTextDocument(doc);
            vscode.window.showInformationMessage(`Created file: ${filename}.4gl`);
        }
        catch (err) {
            vscode.window.showErrorMessage('Failed to create file: ' + err);
        }
    });
    context.subscriptions.push(createProgramFromUseDisposable);
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map