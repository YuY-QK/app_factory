import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { fetchTemplate } from "../../src/core/fetcher.js";

describe("Template Fetcher", () => {
  const tmpDir = path.resolve("./tmp/test_fetcher");
  const mockSource = path.join(tmpDir, "mock_source");
  const mockTarget = path.join(tmpDir, "mock_target");

  beforeEach(async () => {
    await fs.remove(tmpDir);
    await fs.ensureDir(mockSource);
    await fs.writeFile(path.join(mockSource, "pubspec.yaml"), "name: test\n");
    await fs.ensureDir(path.join(mockSource, ".git"));
    await fs.writeFile(path.join(mockSource, ".git/HEAD"), "ref: refs/heads/main\n");
    await fs.ensureDir(path.join(mockSource, "build"));
    await fs.writeFile(path.join(mockSource, "build/app.apk"), "dummy");
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("copies template directory while ignoring .git and build folders", async () => {
    await fetchTemplate({ source: mockSource, targetDir: mockTarget });
    expect(await fs.pathExists(path.join(mockTarget, "pubspec.yaml"))).toBe(true);
    expect(await fs.pathExists(path.join(mockTarget, ".git"))).toBe(false);
    expect(await fs.pathExists(path.join(mockTarget, "build"))).toBe(false);
  });

  it("throws error when local source does not exist", async () => {
    await expect(
      fetchTemplate({ source: "./non_existent_dir_12345", targetDir: mockTarget })
    ).rejects.toThrowError(/not found/);
  });
});
