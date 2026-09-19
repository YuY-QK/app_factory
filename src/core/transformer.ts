import fs from "fs-extra";
import path from "node:path";

export interface Replacement {
  from: string | RegExp;
  to: string;
}

export async function replaceInFiles(
  dir: string,
  replacements: Replacement[],
  fileFilter?: (filePath: string) => boolean
): Promise<number> {
  let changedFilesCount = 0;

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (fileFilter && !fileFilter(fullPath)) continue;

        let content = await fs.readFile(fullPath, "utf-8");
        let modified = false;

        for (const { from, to } of replacements) {
          if (typeof from === "string") {
            if (content.includes(from)) {
              content = content.replaceAll(from, to);
              modified = true;
            }
          } else {
            if (from.test(content)) {
              content = content.replace(from, to);
              modified = true;
            }
          }
        }

        if (modified) {
          await fs.writeFile(fullPath, content, "utf-8");
          changedFilesCount++;
        }
      }
    }
  }

  await walk(dir);
  return changedFilesCount;
}

export async function moveAndReorganizePackage(
  baseDir: string,
  oldPackagePath: string,
  newPackagePath: string,
  fileName: string
): Promise<void> {
  const oldFile = path.join(baseDir, oldPackagePath, fileName);
  const newDir = path.join(baseDir, newPackagePath);
  const newFile = path.join(newDir, fileName);

  if (!(await fs.pathExists(oldFile))) {
    return;
  }

  await fs.ensureDir(newDir);
  await fs.move(oldFile, newFile, { overwrite: true });

  // Clean empty parent directories of old path
  let current = path.dirname(oldFile);
  while (current !== baseDir && current.startsWith(baseDir)) {
    const files = await fs.readdir(current);
    if (files.length === 0) {
      await fs.remove(current);
      current = path.dirname(current);
    } else {
      break;
    }
  }
}
