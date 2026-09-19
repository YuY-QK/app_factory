import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { replaceInFiles, moveAndReorganizePackage } from "../../src/core/transformer.js";

describe("Transformer Engine", () => {
  const tmpDir = path.resolve("./tmp/test_transformer");

  beforeEach(async () => {
    await fs.remove(tmpDir);
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("replaces exact tokens in target files", async () => {
    const testFile = path.join(tmpDir, "sample.yaml");
    await fs.writeFile(testFile, "name: app_flutter_common\nlabel: app_flutter_common\n");

    const count = await replaceInFiles(tmpDir, [
      { from: "app_flutter_common", to: "my_cool_app" },
    ]);

    expect(count).toBeGreaterThan(0);
    const updated = await fs.readFile(testFile, "utf-8");
    expect(updated).toBe("name: my_cool_app\nlabel: my_cool_app\n");
  });

  it("moves MainActivity.kt to target package directory and deletes empty old folders", async () => {
    const kotlinBase = path.join(tmpDir, "kotlin");
    const oldPath = "com/old/app";
    const newPath = "com/new/company/app";
    const file = "MainActivity.kt";

    const oldFolder = path.join(kotlinBase, oldPath);
    await fs.ensureDir(oldFolder);
    await fs.writeFile(path.join(oldFolder, file), "package com.old.app\nclass MainActivity");

    await moveAndReorganizePackage(kotlinBase, oldPath, newPath, file);

    const newFilePath = path.join(kotlinBase, newPath, file);
    expect(await fs.pathExists(newFilePath)).toBe(true);
    expect(await fs.pathExists(path.join(oldFolder, file))).toBe(false);
  });
});
