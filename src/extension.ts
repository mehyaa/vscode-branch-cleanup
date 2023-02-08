import { spawn } from 'child_process';

import { commands, window, workspace, ExtensionContext, QuickPickItem } from 'vscode';

const defaultBranches = ['master', 'main'];

export function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand('branch-cleanup.run', async () => {
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      window.showErrorMessage('No workspace folder found');

      return;
    }

    const branchesQuickPickItems: QuickPickItem[] = [];

    for (const workspaceFolder of workspaceFolders) {
      const branchNames = await getBranchNames(workspaceFolder.uri.fsPath);

      const workspaceBranchesQuickPickItems = branchNames.map(
        branchName =>
          ({
            label: branchName,
            description: defaultBranches.includes(branchName) ? 'Default branch' : '',
            detail: workspaceFolder.uri.fsPath,
            picked: !defaultBranches.includes(branchName)
          } as QuickPickItem)
      );

      branchesQuickPickItems.push(...workspaceBranchesQuickPickItems);
    }

    const selectedBranchesQuickPickItems = await window.showQuickPick(branchesQuickPickItems, {
      canPickMany: true,
      placeHolder: 'Select branches to delete'
    });

    if (!selectedBranchesQuickPickItems || selectedBranchesQuickPickItems.length === 0) {
      window.showInformationMessage('No branches selected');

      return;
    }

    for (const branchesQuickPickItem of selectedBranchesQuickPickItems) {
      if (branchesQuickPickItem.label && branchesQuickPickItem.detail) {
        try {
          await deleteBranch(branchesQuickPickItem.label, branchesQuickPickItem.detail);
        } catch (err) {
          window.showErrorMessage(
            `Failed to delete branch ${branchesQuickPickItem.label} on ${branchesQuickPickItem.detail}.\nError: ${err}`
          );
        }
      }
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {} // eslint-disable-line @typescript-eslint/no-empty-function

function gitCommand(cmd: string, cwd: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const args = cmd
      .split(' ')
      .filter(item => item !== '')
      .map(item => item.trim());

    const child = spawn('git', args, { cwd });

    let result = '';

    child.stdout.on('data', data => (result += data.toString()));
    child.stdout.on('error', data => (result += data.toString()));
    child.stderr.on('data', data => (result += data.toString()));
    child.stderr.on('error', data => (result += data.toString()));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    child.on('close', (code: number) => {
      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(result));
      }
    });
  });
}

function getBranchNames(cwd: string): Promise<string[]> {
  return gitCommand('branch', cwd).then(result => {
    const branchNames = result
      .split('\n')
      .map(item => (item.indexOf('*') === 0 ? item.substring(2).trim() : item.trim()))
      .filter(Boolean);

    return branchNames;
  });
}

function deleteBranch(branchName: string, cwd: string): Promise<string> {
  return gitCommand(`branch -D ${branchName}`, cwd);
}
