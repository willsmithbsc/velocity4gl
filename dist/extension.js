"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
function activate(context) {
  console.log('Congratulations, your extension "4gl-file-creator" is now active!');
  const disposable = vscode.commands.registerCommand("4gl-file-creator.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from 4GL File Creator!");
  });
  context.subscriptions.push(disposable);
  const create4glFileDisposable = vscode.commands.registerCommand("4gl-file-creator.createNew4glFile", async () => {
    const filename = await vscode.window.showInputBox({
      placeHolder: "Enter new 4GL filename (without extension)",
      prompt: "Filename for new .4gl file"
    });
    if (!filename) {
      return;
    }
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage("No workspace folder open.");
      return;
    }
    const folderUri = folders[0].uri;
    const fileUri = vscode.Uri.joinPath(folderUri, filename + ".4gl");
    try {
      await vscode.workspace.fs.writeFile(fileUri, new Uint8Array());
      const doc = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage(`Created file: ${filename}.4gl`);
    } catch (err) {
      vscode.window.showErrorMessage("Failed to create file: " + err);
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
  const createAppDisposable = vscode.commands.registerCommand("4gl-file-creator.createApp", async () => {
    const filename = await vscode.window.showInputBox({
      placeHolder: "Enter new 4GL app filename (without extension)",
      prompt: "Filename for new 4GL app (.4gl)"
    });
    if (!filename) {
      return;
    }
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      vscode.window.showErrorMessage("No workspace folder open.");
      return;
    }
    const folderUri = folders[0].uri;
    const fileUri = vscode.Uri.joinPath(folderUri, filename + ".4gl");
    try {
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(defaultAppCode, "utf8"));
      const doc = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(doc);
      vscode.window.showInformationMessage(`Created 4GL app: ${filename}.4gl`);
    } catch (err) {
      vscode.window.showErrorMessage("Failed to create 4GL app: " + err);
    }
  });
  context.subscriptions.push(createAppDisposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
