import { resolve, basename } from 'path';

import {
  commands,
  window,
  workspace,
  ExtensionContext,
  ProgressLocation,
  QuickPick,
  QuickPickItem,
  QuickPickItemKind,
  ThemeIcon
} from 'vscode';

import { getGitRepos, getBranchNames, deleteBranch } from './utils';

const defaultBranches: Array<string> = ['master', 'main'];
const protectedBranches: Array<string> = [];

type BranchQuickPickItem = QuickPickItem & {
  repo: string;
  branchName: string;
};

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
  context.subscriptions.push(
    commands.registerCommand('branch-cleanup.run', async () => {
      const workspaceFolders = workspace.workspaceFolders;

      if (!workspaceFolders || workspaceFolders.length === 0) {
        window.showErrorMessage('No workspace folder found');

        return;
      }

      const branchesQuickPickItems: Array<QuickPickItem> = [];

      await window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: 'Collecting branches',
          cancellable: false
        },
        async () => {
          const failedToGetBranchesRepos: Array<FailedToGetBranchesRepo> = [];

          let multiRepos = workspaceFolders.length > 1;

          for (const workspaceFolder of workspaceFolders) {
            const path = resolve(workspaceFolder.uri.fsPath);

            const repos = await getGitRepos(path);

            multiRepos ||= repos.length > 1;

            for (const repo of repos) {
              try {
                const branchNames = await getBranchNames(repo);

                if (branchNames.length === 0) {
                  continue;
                }

                if (multiRepos) {
                  branchesQuickPickItems.push({
                    label: basename(repo),
                    kind: QuickPickItemKind.Separator
                  });
                }

                const quickPickItems = branchNames.map(
                  branchName =>
                    ({
                      repo,
                      branchName,
                      label: branchName,
                      description: defaultBranches.includes(branchName)
                        ? 'Default branch'
                        : protectedBranches.includes(branchName)
                        ? 'Protected branch'
                        : '',
                      picked: !defaultBranches.includes(branchName),
                      iconPath: new ThemeIcon('git-branch')
                    } as BranchQuickPickItem)
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

          for (const failedToGetBranchesRepo of failedToGetBranchesRepos) {
            const message = `Failed to get branches for ${failedToGetBranchesRepo.repo}: ${failedToGetBranchesRepo.error}`;

            await window.showErrorMessage(message);
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

        const selectedBranchesQuickPickItems = quickPick.selectedItems as Array<BranchQuickPickItem>;

        const selectedRepos = Array.from(new Set(selectedBranchesQuickPickItems.map(item => item.repo)));

        let message: string;

        if (selectedRepos.length > 1) {
          message = selectedRepos
            .map(repo => {
              let repoBranches = `${basename(repo)}:\n`;

              repoBranches += selectedBranchesQuickPickItems
                .filter(item => item.repo === repo)
                .map(item => `▪️ ${item.branchName}`)
                .join('\n');

              return repoBranches;
            })
            .join('\n\n');
        } else {
          message = selectedBranchesQuickPickItems.map(item => `▪️ ${item.branchName}`).join('\n');
        }

        const answer = await window.showInformationMessage(
          'Following branches will be deleted',
          {
            modal: true,
            detail: message
          },
          'Delete'
        );

        if (answer !== 'Delete') {
          return;
        }

        if (!selectedBranchesQuickPickItems || selectedBranchesQuickPickItems.length === 0) {
          await window.showInformationMessage('No branches selected');

          return;
        }

        const deletedBranches: Array<DeletedBranch> = [];
        const failedToDeleteBranches: Array<FailedToDeleteBranch> = [];

        await window.withProgress(
          {
            location: ProgressLocation.Notification,
            title: 'Deleting branches',
            cancellable: false
          },
          async () => {
            for (const quickPickItem of selectedBranchesQuickPickItems) {
              if (quickPickItem.repo && quickPickItem.branchName) {
                try {
                  await deleteBranch(quickPickItem.branchName, quickPickItem.repo);

                  deletedBranches.push({
                    repo: quickPickItem.repo,
                    branchName: quickPickItem.branchName
                  });
                } catch (err) {
                  const error = err instanceof Error ? err.message : err?.toString() ?? '';

                  failedToDeleteBranches.push({
                    repo: quickPickItem.repo,
                    branchName: quickPickItem.branchName,
                    error
                  });
                }
              }
            }
          }
        );

        if (deletedBranches.length > 0) {
          const branches = deletedBranches.map(b => `${b.branchName} in ${b.repo}`);

          const message = `Branch${deletedBranches.length > 1 ? 'es' : ''} ${branches.join(', ')} ${
            deletedBranches.length > 1 ? 'are' : 'is'
          } deleted successfully`;

          await window.showInformationMessage(message);
        }

        for (const failedToDeleteBranch of failedToDeleteBranches) {
          const message = `Failed to delete branch ${failedToDeleteBranch.branchName} in ${failedToDeleteBranch.repo}: ${failedToDeleteBranch.error}`;

          await window.showErrorMessage(message);
        }
      });

      quickPick.onDidHide(() => quickPick.dispose());
    })
  );
}

export function deactivate() {} // eslint-disable-line @typescript-eslint/no-empty-function
