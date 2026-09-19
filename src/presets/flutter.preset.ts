import path from "node:path";
import fs from "fs-extra";
import pc from "picocolors";
import { TemplatePreset, PresetContext } from "./types.js";
import { replaceInFiles, moveAndReorganizePackage } from "../core/transformer.js";
import { detectFlutterCli, runCommand } from "../core/runner.js";

export class FlutterPreset implements TemplatePreset {
  type = "flutter";

  async transform(context: PresetContext): Promise<void> {
    const { targetDir, config } = context;
    const { name, packageName, bundleId } = config.app;

    const oldPackageName = "app_flutter_common";
    const oldBundleId = "com.yuyqk.app_flutter_common";
    const oldIosBundleId = "com.yuyqk.appFlutterCommon";
    const oldDisplayName = "App Flutter Common";

    // 1. Text Replacements across target directory
    await replaceInFiles(targetDir, [
      { from: `name: ${oldPackageName}`, to: `name: ${packageName}` },
      { from: `package:${oldPackageName}/`, to: `package:${packageName}/` },
      { from: `${oldIosBundleId}.RunnerTests`, to: `${bundleId}.RunnerTests` },
      { from: oldIosBundleId, to: bundleId },
      { from: oldBundleId, to: bundleId },
      { from: `android:label="${oldPackageName}"`, to: `android:label="${name}"` },
      { from: `<string>${oldDisplayName}</string>`, to: `<string>${name}</string>` },
      { from: `<string>${oldPackageName}</string>`, to: `<string>${packageName}</string>` },
      { from: `"name": "${oldPackageName}"`, to: `"name": "${name}"` },
      { from: `"short_name": "${oldPackageName}"`, to: `"short_name": "${name}"` },
      { from: `<title>${oldPackageName}</title>`, to: `<title>${name}</title>` },
      { from: `content="${oldPackageName}"`, to: `content="${name}"` },
    ]);

    // 2. Android Kotlin directory reorganization
    const kotlinBaseDir = path.join(targetDir, "android/app/src/main/kotlin");
    if (await fs.pathExists(kotlinBaseDir)) {
      const oldPath = oldBundleId.replaceAll(".", "/");
      const newPath = bundleId.replaceAll(".", "/");

      await moveAndReorganizePackage(kotlinBaseDir, oldPath, newPath, "MainActivity.kt");

      // Ensure package declaration in MainActivity is updated
      const mainActivityPath = path.join(kotlinBaseDir, newPath, "MainActivity.kt");
      if (await fs.pathExists(mainActivityPath)) {
        let content = await fs.readFile(mainActivityPath, "utf-8");
        content = content.replace(/^package\s+.*$/m, `package ${bundleId}`);
        await fs.writeFile(mainActivityPath, content, "utf-8");
      }
    }
  }

  async postCreate(context: PresetContext): Promise<void> {
    if (context.skipInstall) {
      console.log(pc.gray("⏩ 跳过依赖安装 (--skip-install)"));
      return;
    }

    const flutterCli = await detectFlutterCli();
    if (!flutterCli) {
      console.warn(pc.yellow("⚠️ 未在环境中找到 fvm 或 flutter 命令，跳过自动获取依赖。"));
      return;
    }

    const { command, isFvm } = flutterCli;
    const argsPrefix = isFvm ? ["flutter"] : [];

    console.log(pc.cyan(`📦 正在执行 ${command} pub get...`));
    await runCommand(command, [...argsPrefix, "pub", "get"], context.targetDir);

    console.log(pc.cyan(`🌐 正在执行 ${command} gen-l10n...`));
    await runCommand(command, [...argsPrefix, "gen-l10n"], context.targetDir);
  }
}
