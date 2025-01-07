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

type BranchQuickPickItem = QuickPickItem & {
  repo: string;
  branchName: string;
  protected: boolean;
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

      const config = workspace.getConfiguration('branchCleanup');

      const defaultBranches: string[] = config.get<Array<string>>('defaultBranches', ['master', 'main']);
      const protectedBranches: string[] = config.get<Array<string>>('protectedBranches', []);

      const protectedBranchRegexes = protectedBranches.map(protectedBranch => new RegExp(protectedBranch));

      const quickPickItems: Array<QuickPickItem> = [];

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
                  quickPickItems.push({
                    label: basename(repo),
                    kind: QuickPickItemKind.Separator
                  });
                }

                for (const branchName of branchNames) {
                  const isDefaultBranch = defaultBranches.includes(branchName);
                  const isProtectedBranch = protectedBranchRegexes.some(regex => regex.test(branchName));

                  quickPickItems.push({
                    repo,
                    branchName,
                    protected: isDefaultBranch || isProtectedBranch,
                    label: branchName,
                    description: isDefaultBranch ? 'Default branch' : isProtectedBranch ? 'Protected branch' : '',
                    picked: !isDefaultBranch && !isProtectedBranch,
                    iconPath: new ThemeIcon('git-branch')
                  } as BranchQuickPickItem);
                }
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
      quickPick.ignoreFocusOut = false;
      quickPick.canSelectMany = true;
      quickPick.items = quickPickItems;
      quickPick.selectedItems = quickPickItems.filter(item => item.picked);

      quickPick.show();

      quickPick.onDidAccept(async () => {
        quickPick.hide();

        const selectedQuickPickItems = quickPick.selectedItems as Array<BranchQuickPickItem>;

        const protectedQuickPickItems = selectedQuickPickItems.filter(item => item.protected);

        if (protectedQuickPickItems.length > 0) {
          await window.showErrorMessage('Default and protected branches cannot be deleted');

          return;
        }

        const selectedRepos = Array.from(new Set(selectedQuickPickItems.map(item => item.repo)));

        let message: string;

        if (selectedRepos.length > 1) {
          message = selectedRepos
            .map(repo => {
              let repoBranches = `${basename(repo)}:\n`;

              repoBranches += selectedQuickPickItems
                .filter(item => item.repo === repo)
                .map(item => `▪️ ${item.branchName}`)
                .join('\n');

              return repoBranches;
            })
            .join('\n\n');
        } else {
          message = selectedQuickPickItems.map(item => `▪️ ${item.branchName}`).join('\n');
        }

        const answer = await window.showInformationMessage(
          'Following branch(es) will be deleted',
          {
            modal: true,
            detail: message
          },
          'Delete'
        );

        if (answer !== 'Delete') {
          return;
        }

        if (!selectedQuickPickItems || selectedQuickPickItems.length === 0) {
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
            for (const quickPickItem of selectedQuickPickItems) {
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
