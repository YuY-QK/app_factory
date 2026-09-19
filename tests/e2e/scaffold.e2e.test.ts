import { describe, it, expect, afterAll } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";
import { createProject } from "../../src/commands/create.js";

describe("E2E Scaffolding with app_flutter_common", () => {
  const e2eTarget = path.resolve("./tmp/e2e_real_app");

  afterAll(async () => {
    await fs.remove(e2eTarget);
  });

  it("scaffolds a complete Flutter app and passes test and analyze", async () => {
    await fs.remove(e2eTarget);

    const config = {
      template: "flutter",
      app: {
        name: "自动化验证应用",
        packageName: "e2e_verified_app",
        bundleId: "com.factory.e2everified",
        version: "1.0.0",
        buildNumber: 1,
      },
    };

    const configPath = path.resolve("./tmp/e2e_app.config.yaml");
    await fs.ensureDir(path.dirname(configPath));
    const YAML = (await import("yaml")).default;
    await fs.writeFile(configPath, YAML.stringify(config));

    await createProject({
      targetDir: e2eTarget,
      configPath,
      skipInstall: false,
      factoryConfigPath: path.resolve("./factory.config.yaml"),
    });

    // Verify critical files
    expect(await fs.pathExists(path.join(e2eTarget, "pubspec.yaml"))).toBe(true);
    expect(
      await fs.pathExists(path.join(e2eTarget, "packages/app_foundation/pubspec.yaml"))
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(
          e2eTarget,
          "android/app/src/main/kotlin/com/factory/e2everified/MainActivity.kt"
        )
      )
    ).toBe(true);

    // Verify Flutter test runs and passes
    const testResult = await execa("fvm", ["flutter", "test"], { cwd: e2eTarget });
    expect(testResult.exitCode).toBe(0);

    // Verify Flutter analyze passes
    const analyzeResult = await execa("fvm", ["flutter", "analyze"], { cwd: e2eTarget });
    expect(analyzeResult.exitCode).toBe(0);
  }, 180000);
});
