import { resolve } from 'path';

import { commands, window, workspace, ExtensionContext, QuickPickItem } from 'vscode';

import { getGitRepos, getBranchNames, deleteBranch } from './utils';

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
      const path = resolve(workspaceFolder.uri.fsPath);

      const repos = await getGitRepos(path);

      for (const repo of repos) {
        try {
          const branchNames = await getBranchNames(repo);

          const quickPickItems = branchNames.map(
            branchName =>
              ({
                label: branchName,
                description: defaultBranches.includes(branchName) ? 'Default branch' : '',
                detail: repo,
                picked: !defaultBranches.includes(branchName)
              } as QuickPickItem)
          );

          branchesQuickPickItems.push(...quickPickItems);
        } catch (err) {
          window.showErrorMessage(`Failed to get branches for ${repo}.\nError: ${err}`);
        }
      }
    }

    const selectedBranchesQuickPickItems = await window.showQuickPick(branchesQuickPickItems, {
      canPickMany: true,
      placeHolder: 'Select branches to delete'
    });

    if (!selectedBranchesQuickPickItems || selectedBranchesQuickPickItems.length === 0) {
      window.showInformationMessage('No branches selected');

      return;
    }

    for (const quickPickItem of selectedBranchesQuickPickItems) {
      if (quickPickItem.label && quickPickItem.detail) {
        try {
          await deleteBranch(quickPickItem.label, quickPickItem.detail);
        } catch (err) {
          window.showErrorMessage(
            `Failed to delete branch ${quickPickItem.label} on ${quickPickItem.detail}.\nError: ${err}`
          );
        }
      }
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {} // eslint-disable-line @typescript-eslint/no-empty-function
