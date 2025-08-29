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
                const tableNames = (globalThis._velocity4gl_tables && globalThis._velocity4gl_tables[dbName]) || [];
                return tableNames.map((tbl) => {
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
        const editor = vscode.window.activeTextEditor;
        if (!editor || event.document !== editor.document) {
            return;
        }
        const position = editor.selection.active;
        const lineText = event.document.lineAt(position.line).text.trim();
        // Only trigger if the line matches the new use statement format
        const useRegex = /^use\s+(\S+)\s+table\s+(\S+)(?:\s+as\s+(\S+))?/i;
        const match = useRegex.exec(lineText);
        if (!match) {
            return;
        }
        const dbName = match[1];
        const tableName = match[2];
        // const pseudoName = match[3]; // optional alias
        // Get cached fields for the table
        try {
            const dbUtils = await import('./dbUtils.js');
            const fields = await dbUtils.getCachedFields(tableName);
            if (!fields || fields.length === 0) {
                return;
            }
            // Check if fields already inserted below
            const nextLine = position.line + 1 < event.document.lineCount ? event.document.lineAt(position.line + 1).text.trim() : '';
            if (nextLine && fields.some(f => nextLine.includes(f))) {
                return;
            }
            // Prepare field lines
            const fieldLines = fields.map(f => `    ${f}`);
            const insertPosition = new vscode.Position(position.line + 1, 0);
            await editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, fieldLines.join('\n') + '\n');
            });
            vscode.window.showInformationMessage(`Fields for table '${tableName}' inserted.`);
        }
        catch (err) {
            // Silent fail
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
        // Example: connect database rad_4gl_system as 4gl_db\n    type=mysql\n    host=localhost\n    ...
        const dbRegex = /connect database\s+(\S+)\s+as\s+(\S+)([\s\S]*?)(?=connect database|database repository end|$)/g;
        const dbs = [];
        let match;
        while ((match = dbRegex.exec(text)) !== null) {
            const name = match[1];
            const alias = match[2];
            const block = match[3];
            const config = {};
            let type = 'mysql';
            // Parse config lines
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
            }
            config.database = name;
            dbs.push({ name, alias, config, type });
        }
        if (dbs.length === 0) {
            vscode.window.showErrorMessage('No database definitions found in the open file.');
            return;
        }
        // Let user pick a database to test
        const pick = await vscode.window.showQuickPick(dbs.map(d => `${d.alias} (${d.type})`), { placeHolder: 'Select a database to test connection' });
        if (!pick) {
            return;
        }
        const db = dbs.find(d => `${d.alias} (${d.type})` === pick);
        if (!db) {
            return;
        }
        // Test connection
        try {
            if (db.type === 'mysql') {
                const dbUtils = await import('./dbUtils.js');
                const testResult = await dbUtils.testMySQLConnection(db.config);
                vscode.window.showInformationMessage(testResult);
                if (testResult.startsWith('Connection successful')) {
                    const tables = await dbUtils.getMySQLTables(db.config);
                    // Store dbnames and tables for autocomplete
                    let dbnames = globalThis._velocity4gl_dbnames || [];
                    if (!dbnames.includes(db.alias)) {
                        dbnames.push(db.alias);
                    }
                    globalThis._velocity4gl_dbnames = dbnames;
                    let tablesMap = globalThis._velocity4gl_tables || {};
                    tablesMap[db.alias] = tables;
                    globalThis._velocity4gl_tables = tablesMap;
                    // Optionally prompt for table and cache fields (existing logic)
                    const table = await vscode.window.showQuickPick(tables, { placeHolder: 'Select a table to view fields' });
                    if (table) {
                        const fields = await dbUtils.getTableFields(db.config, table);
                        dbUtils.cacheTableFields(table, fields);
                        vscode.window.showInformationMessage(`Fields in ${table}: ${fields.join(', ')}`);
                    }
                }
            }
            else if (db.type === 'sqlite') {
                vscode.window.showInformationMessage('SQLite connection (in-memory or file) ready.');
            }
        }
        catch (err) {
            vscode.window.showErrorMessage('Database connection failed: ' + err.message);
        }
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
    connect database memdb sqlite::memory: as memory_db

    connect database rad_4gl_system as 4gl_db
        type=mysql
        host=localhost
        port=3306
        username="root"
        password=""
        charset=utf8mb4

// Talbe use here


variable repository
    const variable_name.string = "string"
    const variable_name.integer = 100
    default vat.float(3.2) = 3.5
    default vat.float(3.2) = 3.6 execute 31:12:2025@00:01
variable repository end

program repository
    // my first program
    first_program_name.4gl

    // my second program
    second_program_name.4gl

    // my third program
    third_program_name.4gl
program repository end
`;
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
}
// This method is called when your extension is deactivated
function deactivate() { }
//# sourceMappingURL=extension.js.map