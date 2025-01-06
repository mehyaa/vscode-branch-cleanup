import { resolve } from 'path';

import {
  commands,
  window,
  workspace,
  ExtensionContext,
  ProgressLocation,
  QuickPick,
  QuickPickItem,
  ThemeIcon
} from 'vscode';

import { getGitRepos, getBranchNames, deleteBranch } from './utils';

const defaultBranches = ['master', 'main'];

type FailedToGetBranchesRepo = {
  repo: string;
  error: string;
};

type DeletedBranch = {
  repo: string;
  branchName: string;
};

type FailedToDeleteBranch = {
  repo: string;
  branchName: string;
  error: string;
};

export function activate(context: ExtensionContext) {
  const disposable = commands.registerCommand('branch-cleanup.run', async () => {
    const workspaceFolders = workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      window.showErrorMessage('No workspace folder found');

      return;
    }

    const branchesQuickPickItems: QuickPickItem[] = [];

    await window.withProgress(
      {
        location: ProgressLocation.Notification,
        title: 'Collecting branches',
        cancellable: false
      },
      async () => {
        const failedToGetBranchesRepos: FailedToGetBranchesRepo[] = [];

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
                    picked: !defaultBranches.includes(branchName),
                    iconPath: new ThemeIcon('git-branch')
                  } as QuickPickItem)
              );

              branchesQuickPickItems.push(...quickPickItems);
            } catch (err) {
              const error = err instanceof Error ? err.message : err?.toString() ?? '';

              failedToGetBranchesRepos.push({
                repo,
                error
              });
            }
          }
        }

        if (failedToGetBranchesRepos.length > 0) {
          const message = `Failed to get branches for ${failedToGetBranchesRepos.length} repo${
            failedToGetBranchesRepos.length > 1 ? 's' : ''
          }`;
          const repos = failedToGetBranchesRepos.map(r => `${r.repo}: ${r.error}`);

          await window.showErrorMessage(message, { detail: repos.join('\n') });
        }
      }
    );

    const quickPick: QuickPick<QuickPickItem> = window.createQuickPick();
    quickPick.title = 'Select branches to delete';
    quickPick.placeholder = 'Type to filter branches';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;
    quickPick.canSelectMany = true;
    quickPick.items = branchesQuickPickItems;
    quickPick.ignoreFocusOut = false;
    quickPick.selectedItems = branchesQuickPickItems.filter(item => item.picked);

    quickPick.show();

    quickPick.onDidAccept(async () => {
      quickPick.hide();

      const selectedBranchesQuickPickItems = quickPick.selectedItems;

      if (!selectedBranchesQuickPickItems || selectedBranchesQuickPickItems.length === 0) {
        await window.showInformationMessage('No branches selected');

        return;
      }

      const deletedBranches: DeletedBranch[] = [];
      const failedToDeleteBranches: FailedToDeleteBranch[] = [];

      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: 'Deleting branches',
          cancellable: false
        },
        async () => {
          for (const quickPickItem of selectedBranchesQuickPickItems) {
            if (quickPickItem.label && quickPickItem.detail) {
              try {
                await deleteBranch(quickPickItem.label, quickPickItem.detail);

                deletedBranches.push({
                  repo: quickPickItem.detail,
                  branchName: quickPickItem.label
                });
              } catch (err) {
                const error = err instanceof Error ? err.message : err?.toString() ?? '';

                failedToDeleteBranches.push({
                  repo: quickPickItem.detail,
                  branchName: quickPickItem.label,
                  error
                });
              }
            }
          }
        }
      );

      if (deletedBranches.length > 0) {
        const message = `Deleted ${deletedBranches.length} branch${deletedBranches.length > 1 ? 'es' : ''}`;
        const branches = deletedBranches.map(b => `${b.repo}|${b.branchName}`);

        await window.showInformationMessage(message, { detail: branches.join('\n') });
      }

      if (failedToDeleteBranches.length > 0) {
        const message = `Failed to delete ${failedToDeleteBranches.length} branch${
          failedToDeleteBranches.length > 1 ? 'es' : ''
        }`;
        const branches = failedToDeleteBranches.map(b => `${b.repo}|${b.branchName}:  ${b.error}`);

        await window.showErrorMessage(message, { detail: branches.join('\n') });
      }
    });

    quickPick.onDidHide(() => quickPick.dispose());
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {} // eslint-disable-line @typescript-eslint/no-empty-function
