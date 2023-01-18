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
  defaultPath?: string;
  workspace?: string;
};

type FullParam = {
  native: boolean;
  empty?: string;
  output: {
    join: string;
    fsPath: boolean;
  };
  options: Options;
};

type Param = string | RPartial<FullParam>;

export async function pickHandler(args?: Param): Promise<string | undefined> {
  const param = parseArgs(args);
  const uris = param.native
    ? await pickWithNative(getDefaultUri(param), param)
    : await pickWithQuick(getDefaultUri(param) ?? Uri.parse(""), param);
  return formatUris(uris, param);
}

function parseArgs(param?: Param): FullParam {
  const defaultParam: FullParam = {
    empty: undefined,
    native: false,
    options: {},
    output: {
      join: ",",
      fsPath: true,
    },
  };

  if (typeof param === "string") {
    return {
      ...defaultParam,
      options: { ...defaultParam.options, defaultPath: param },
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
  param: FullParam
): Promise<Uri[] | undefined> {
  return await showOpenDialog({ ...param.options, defaultUri: dir });
}

async function pickWithQuick(
  dir: Uri,
  param: FullParam
): Promise<Uri[] | undefined> {
  const children = await fs.readDirectory(dir);
  console.log("children:", children);
  type Item = QuickPickItem & { uri: Uri; type: FileType };
  const res = await showQuickPick<Item>(
    [
      { label: "..", uri: Uri.joinPath(dir, ".."), type: FileType.Directory },
      ...[...children, [".", FileType.Directory] as [string, FileType]]
        .filter(
          ([_, type]) =>
            (type !== FileType.Directory ||
              (param.options.canSelectFolders ?? true)) &&
            (type !== FileType.File || (param.options.canSelectFiles ?? true))
        )
        .map(([name, type]) => ({
          name,
          type,
          label: name,
          uri: Uri.joinPath(dir, name),
        })),
    ],
    {
      title: param.options.title,
      canPickMany: param.options.canSelectMany,
    }
  );
  if (res == null) {
    return;
  }
  const items = Array.isArray(res) ? (res as Item[]) : [res];
  if (
    items.length === 1 &&
    items[0].type === FileType.Directory &&
    items[0].uri.path !== Uri.joinPath(dir, ".").path
  ) {
    return pickWithQuick(items[0].uri, param);
  }
  return items.map((i) => i.uri);
}

function getDefaultUri({ options }: FullParam): Uri | undefined {
  const workspaceFolders = workspace.workspaceFolders;

  if (options.defaultPath == null) {
    if ((workspaceFolders?.length ?? 0) >= 1) {
      return workspaceFolders![0].uri;
    }
    return;
  }

  if (options.defaultPath.startsWith("/")) {
    return Uri.parse(options.defaultPath);
  }

  if (workspaceFolders?.length === 1) {
    return Uri.joinPath(workspaceFolders[0].uri, options.defaultPath);
  }

  const defaultPath = Uri.parse(options.defaultPath).path;
  const workspaceFolder = workspaceFolders?.find((f) =>
    defaultPath.startsWith(basename(f.uri.path) + "/")
  );
  if (workspaceFolder != null) {
    return Uri.joinPath(workspaceFolder.uri, options.defaultPath);
  }

  return;
}

function formatUris(
  uris: Uri[] | undefined,
  param: FullParam
): string | undefined {
  return (
    uris
      ?.map((uri) => (param.output.fsPath ? uri.fsPath : uri.path))
      .join(param.output.join) ?? param.empty
  );
}
