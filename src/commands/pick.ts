import { basename } from "path";
import {
  FileType,
  OpenDialogOptions,
  QuickPickItem,
  Uri,
  window,
  workspace,
} from "vscode";
import { RPartial } from "../common";
import showQuickPick = window.showQuickPick;
import showOpenDialog = window.showOpenDialog;
import fs = workspace.fs;

type Options = Omit<OpenDialogOptions, "defaultUri" | "filters"> & {
  path?: string;
  workspace?: string;
  native: boolean;
  canChangeFolder: boolean; // true,
};

type FullParam = {
  options: Options;
  output: {
    join: string;
    fsPath: boolean;
    defaultPath?: string;
    default?: string;
  };
};

type Param = string | RPartial<FullParam>;

export async function pickHandler(args?: Param): Promise<string | undefined> {
  const { options, output } = parseArgs(args);

  const uris = options.native
    ? await pickWithNative(resolvePath(options.path), options)
    : await pickWithQuick(resolvePath(options.path) ?? Uri.parse(""), options);

  if (uris != null) {
    return formatUris(uris, output);
  }
  if (output.default != null) {
    return output.default;
  }
  if (output.defaultPath != null) {
    const defaultUri = resolvePath(output.defaultPath);
    const formated =
      defaultUri != null ? formatUris([defaultUri], output) : undefined;
    return formated ?? output.defaultPath;
  }
}

function parseArgs(param?: Param): FullParam {
  const defaultParam: FullParam = {
    options: { native: false, canChangeFolder: true },
    output: { join: ",", fsPath: true },
  };

  if (typeof param === "string") {
    return {
      ...defaultParam,
      options: { ...defaultParam.options, path: param },
    };
  }

  return {
    ...defaultParam,
    ...param,
    options: { ...defaultParam.options, ...param?.options },
    output: { ...defaultParam.output, ...param?.output },
  };
}

async function pickWithNative(
  dir: Uri | undefined,
  options: FullParam["options"]
): Promise<Uri[] | undefined> {
  return await showOpenDialog({ ...options, defaultUri: dir });
}

async function pickWithQuick(
  dir: Uri,
  options: FullParam["options"]
): Promise<Uri[] | undefined> {
  const children = await fs.readDirectory(dir);
  type Item = QuickPickItem & { uri: Uri; type: FileType };
  const res = await showQuickPick<Item>(
    [
      ["..", FileType.Directory] as [string, FileType],
      [".", FileType.Directory] as [string, FileType],
      ...children,
    ]
      .filter(
        ([_, type]) =>
          (type !== FileType.Directory ||
            (options.canSelectFolders ?? true) ||
            options.canChangeFolder) &&
          (type !== FileType.File || (options.canSelectFiles ?? true))
      )
      .map(([name, type]) => ({
        name,
        type,
        label: type === FileType.Directory ? `${name}/` : name,
        uri: Uri.joinPath(dir, name),
      })),
    {
      title: options.title,
      canPickMany: options.canSelectMany,
    }
  );
  if (res == null) {
    return;
  }
  const items = Array.isArray(res) ? (res as Item[]) : [res];
  if (
    items.length === 1 &&
    items[0].type === FileType.Directory &&
    options.canChangeFolder &&
    items[0].uri.path !== Uri.joinPath(dir, ".").path
  ) {
    return pickWithQuick(items[0].uri, options);
  }
  return items.map((i) => i.uri);
}

function resolvePath(path: string | undefined): Uri | undefined {
  const workspaceFolders = workspace.workspaceFolders;

  if (path == null) {
    if ((workspaceFolders?.length ?? 0) >= 1) {
      return workspaceFolders![0].uri;
    }
    return;
  }

  if (path.startsWith("/")) {
    return Uri.parse(path);
  }

  if (workspaceFolders?.length === 1) {
    return Uri.joinPath(workspaceFolders[0].uri, path);
  }

  const defaultPath = Uri.parse(path).path;
  const workspaceFolder = workspaceFolders?.find((f) =>
    defaultPath.startsWith(basename(f.uri.path) + "/")
  );
  if (workspaceFolder != null) {
    return Uri.joinPath(workspaceFolder.uri, path);
  }

  return;
}

function formatUris(
  uris: Uri[] | undefined,
  output: FullParam["output"]
): string | undefined {
  return uris
    ?.map((uri) => (output.fsPath ? uri.fsPath : uri.path))
    .join(output.join);
}
