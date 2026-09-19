import fs from "fs-extra";
import path from "node:path";
import pc from "picocolors";
import YAML from "yaml";
import { loadAppConfig, loadFactoryConfig } from "../config/loader.js";
import { AppConfig } from "../config/schema.js";
import { fetchTemplate } from "../core/fetcher.js";
import { getPreset } from "../presets/index.js";
import { runWizard } from "../prompts/wizard.js";

export interface CreateOptions {
  targetDir?: string;
  configPath?: string;
  template?: string;
  skipInstall?: boolean;
  factoryConfigPath?: string;
}

export async function createProject(options: CreateOptions): Promise<void> {
  const factoryConfig = await loadFactoryConfig(options.factoryConfigPath);

  let finalTargetDir: string;
  let finalConfig: AppConfig;

  if (options.configPath) {
    finalConfig = await loadAppConfig(options.configPath);
    if (options.template) {
      finalConfig.template = options.template;
    }
    finalTargetDir = options.targetDir || path.basename(finalConfig.app.packageName);
  } else {
    const wizardResult = await runWizard(options.targetDir, factoryConfig);
    finalTargetDir = wizardResult.targetDir;
    finalConfig = wizardResult.config;
    if (options.template) {
      finalConfig.template = options.template;
    }
  }

  const resolvedTarget = path.resolve(process.cwd(), finalTargetDir);

  if ((await fs.pathExists(resolvedTarget)) && (await fs.readdir(resolvedTarget)).length > 0) {
    throw new Error(`目标目录已存在且不为空: ${resolvedTarget}`);
  }

  const templateDef = factoryConfig.templates[finalConfig.template];
  if (!templateDef) {
    throw new Error(`模板 '${finalConfig.template}' 未在 factory.config.yaml 中定义。`);
  }

  console.log(pc.cyan(`\n📥 正在获取模板: ${templateDef.name} (${templateDef.source})...`));
  await fetchTemplate({
    source: templateDef.source,
    targetDir: resolvedTarget,
    branch: templateDef.branch,
  });

  console.log(pc.cyan("⚙️ 正在应用模板转换规则..."));
  const preset = getPreset(templateDef.type);
  await preset.transform({
    targetDir: resolvedTarget,
    config: finalConfig,
    skipInstall: options.skipInstall,
  });

  // Write app.config.yaml into target directory for future sync/maintenance
  await fs.writeFile(
    path.join(resolvedTarget, "app.config.yaml"),
    YAML.stringify(finalConfig),
    "utf-8"
  );

  console.log(pc.cyan("📦 正在执行后置生命周期..."));
  await preset.postCreate({
    targetDir: resolvedTarget,
    config: finalConfig,
    skipInstall: options.skipInstall,
  });

  console.log(pc.green(`\n🎉 项目创建成功: ${resolvedTarget}`));
  console.log(pc.white(`\n下一步操作：`));
  console.log(pc.cyan(`  cd ${finalTargetDir}`));
  console.log(pc.cyan(`  fvm flutter run\n`));
}
