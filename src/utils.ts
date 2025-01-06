import { spawn } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

export function getSubDirectories(source: string): Array<string> {
  return readdirSync(source, { withFileTypes: true })
    .filter(dir => dir.isDirectory())
    .map(dir => join(source, dir.name));
}

export function gitCommand(cmd: string, cwd: string): Promise<string> {
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

    child.on('close', (code: number) => {
      if (code === 0) {
        resolve(result);
      } else {
        reject(new Error(result));
      }
    });
  });
}

export async function getGitRepos(cwd: string): Promise<Array<string>> {
  try {
    const result = await gitCommand('rev-parse --show-toplevel', cwd);

    return [result.trim()];
  } catch (err: unknown) {
    if ((err as Error)?.message?.indexOf('not a git repository') >= 0) {
      const subDirectories = getSubDirectories(cwd);
      const promises = subDirectories.map(getGitRepos);
      const results = await Promise.all(promises);
      return results.flat(Infinity) as Array<string>;
    }

    return [];
  }
}

export async function getBranchNames(cwd: string): Promise<Array<string>> {
  const result = await gitCommand('branch', cwd);

  return result
    .split('\n')
    .map(item => (item.indexOf('*') === 0 ? item.substring(2).trim() : item.trim()))
    .filter(Boolean);
}

export function deleteBranch(branchName: string, cwd: string): Promise<string> {
  return gitCommand(`branch -D ${branchName}`, cwd);
}
