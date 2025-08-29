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
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "4gl-file-creator" is now active!');
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
    const defaultAppCode = `database repository
    database memdb sqlite::memory: as memory_db
    connect

    database rad_4gl_system as 4gl_db
        type=mysql
        host=localhost
        port=3306
        username="root"
        password=""
        charset=utf8mb4
    connect
database repository end

tables repository
    table name from 4gl_db as pseudo_table 
        column1
        column2
        column3
    use
tables repository end

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