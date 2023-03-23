import { resolve } from 'path';

import { commands, window, workspace, ExtensionContext, QuickPickItem } from 'vscode';

import { getGitRepos, getBranchNames, deleteBranch } from './utils';

const defaultBranches = ['master', 'main'];

interface FailedToGetBranchesRepo {
  repo: string;
  error: string;
}

interface DeletedBranch {
  repo: string;
  branchName: string;
}

interface FailedToDeleteBranch {
  repo: string;
  branchName: string;
  error: string;
}

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
        location: 15, // Notification
        title: 'Getting branches',
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
                    picked: !defaultBranches.includes(branchName)
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

          await window.showErrorMessage(message, ...repos);
        }
      }
    );

    const selectedBranchesQuickPickItems = await window.showQuickPick(branchesQuickPickItems, {
      canPickMany: true,
      placeHolder: 'Select branches to delete'
    });

    if (!selectedBranchesQuickPickItems || selectedBranchesQuickPickItems.length === 0) {
      window.showInformationMessage('No branches selected');

      return;
    }

    const deletedBranches: DeletedBranch[] = [];
    const failedToDeleteBranches: FailedToDeleteBranch[] = [];

    await window.withProgress(
      {
        location: 15, // Notification
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
      const branches = deletedBranches.map(b => `${b.branchName}: ${b.repo}`);

      await window.showInformationMessage(message, ...branches);
    }

    if (failedToDeleteBranches.length > 0) {
      const message = `Failed to delete ${failedToDeleteBranches.length} branch${
        failedToDeleteBranches.length > 1 ? 'es' : ''
      }`;
      const branches = failedToDeleteBranches.map(b => `${b.branchName}: ${b.repo} - ${b.error}`);

      await window.showErrorMessage(message, ...branches);
    }
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {} // eslint-disable-line @typescript-eslint/no-empty-function
