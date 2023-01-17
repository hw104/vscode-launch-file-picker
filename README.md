# Launch File Picker

The file (or directory) path picker for `launch.json` and `tasks.json`.

## How to use

1. Add item to `inputs` field in `launch.json` or `tasks.json` like this. ([more info for `inputs`](https://code.visualstudio.com/docs/editor/variables-reference#_input-variables)).
   ```jsonc
   {
      "id": "pickSingleFile",
      "type": "command",
      "command": "launch-file-picker.pick",
      "args": ".envs", // (optional) The directory the dialog shows when opened.
   }
   ```
1. use variable `${input:<input-id>}` in `configurations` or `tasks` items like this.
   ```jsonc
   {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}\\app.js",
      "envFile": "${input:pickEnvFile}" // This!
   }
   ```

## Options

```jsonc
"args": string, // The directory the dialog shows when opened.
// or
"args": {
  "native": boolean, // whether open native file manoger.
  "options": {
    "defaultPath": string, // The directory the dialog shows when opened. (Default: workspace's root)
    "canSelectFiles": boolean, // Allow to select files, defaults to `true`. (Default: true)
    "canSelectFolders": boolean, // Allow to select folders, defaults to `false`. (Default: true)
    "canSelectMany": boolean, // Allow to select many files or folders. (Default: false)
    "title": string, // Dialog title. (Default: null)
  },
  "output": {
    "join": string, // path separator for `options.canSelectMany` is true. (Default: ",")
    "fsPath": boolean, // The string representing the corresponding file system path of this Uri. (e.g. in windown output is `\\server\c$\folder\file.txt`. Default: true)
  },
}
```

## Example

Select env file in launch.json:

```jsonc
{
  "version": "0.2.0",
  "configurations": [
   {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}\\app.js",
      "envFile": "${input:pickEnvFile}"
    }
  ],
  "inputs": [
    {
      "id": "pickEnvFile",
      "type": "command",
      "command": "launch-file-picker.pick",
      "args": ".envs",
    }
  ]
}
```
