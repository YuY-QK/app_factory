import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";
import { createProject } from "../../src/commands/create.js";

describe("Create Command", () => {
  const tmpDir = path.resolve("./tmp/test_create_cmd");
  const mockTemplateDir = path.join(tmpDir, "mock_flutter_starter");
  const targetDir = path.join(tmpDir, "output_app");
  const configPath = path.join(tmpDir, "app.config.yaml");
  const factoryConfigPath = path.join(tmpDir, "factory.config.yaml");

  beforeEach(async () => {
    await fs.remove(tmpDir);
    await fs.ensureDir(tmpDir);

    // Create a mock template
    await fs.ensureDir(mockTemplateDir);
    await fs.writeFile(
      path.join(mockTemplateDir, "pubspec.yaml"),
      "name: app_flutter_common\ndescription: A template\n"
    );
    const kotlinDir = path.join(
      mockTemplateDir,
      "android/app/src/main/kotlin/com/yuyqk/app_flutter_common"
    );
    await fs.ensureDir(kotlinDir);
    await fs.writeFile(
      path.join(kotlinDir, "MainActivity.kt"),
      "package com.yuyqk.app_flutter_common\nclass MainActivity\n"
    );

    // Create factory config pointing to this mock template
    const factoryConfig = {
      version: "1.0.0",
      templates: {
        flutter: {
          name: "Mock Flutter",
          type: "flutter",
          source: mockTemplateDir,
          branch: "main",
        },
      },
    };
    await fs.writeFile(factoryConfigPath, YAML.stringify(factoryConfig));

    // Create app config
    const appConfig = {
      template: "flutter",
      app: {
        name: "测试应用",
        packageName: "test_app",
        bundleId: "com.example.testapp",
        version: "1.0.0",
        buildNumber: 1,
      },
    };
    await fs.writeFile(configPath, YAML.stringify(appConfig));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("creates project successfully using config file and skips install", async () => {
    await createProject({
      targetDir,
      configPath,
      skipInstall: true,
      factoryConfigPath,
    });

    expect(await fs.pathExists(path.join(targetDir, "pubspec.yaml"))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, "app.config.yaml"))).toBe(true);
    const pubspec = await fs.readFile(path.join(targetDir, "pubspec.yaml"), "utf-8");
    expect(pubspec).toContain("name: test_app");
  });
});
