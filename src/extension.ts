import * as vscode from "vscode";
import { pickHandler } from "./commands/pick";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("launch-file-picker.pick", pickHandler)
  );
}

export function deactivate() {}
