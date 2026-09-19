import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";

export const DEFAULT_IGNORE_PATTERNS = [
  ".git",
  ".agents",
  ".idea",
  ".vscode",
  ".dart_tool",
  "build",
  "Pods",
  ".symlinks",
  ".DS_Store",
];

export interface FetchOptions {
  source: string;
  targetDir: string;
  branch?: string;
}

export async function fetchTemplate(options: FetchOptions): Promise<void> {
  const { source, targetDir, branch = "main" } = options;

  await fs.ensureDir(targetDir);

  const isGit =
    source.startsWith("http://") ||
    source.startsWith("https://") ||
    source.startsWith("git@");

  if (isGit) {
    await execa("git", ["clone", "--depth", "1", "--branch", branch, source, targetDir]);
    await fs.remove(path.join(targetDir, ".git"));
  } else {
    const resolvedSource = path.resolve(process.cwd(), source);
    if (!(await fs.pathExists(resolvedSource))) {
      throw new Error(`Template local source path not found: ${resolvedSource}`);
    }

    await fs.copy(resolvedSource, targetDir, {
      filter: (src) => {
        const basename = path.basename(src);
        return !DEFAULT_IGNORE_PATTERNS.includes(basename);
      },
    });
  }
}
