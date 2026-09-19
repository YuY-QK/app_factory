import * as p from "@clack/prompts";
import pc from "picocolors";
import { FactoryConfig, AppConfig, DartPackageNameRegex, BundleIdRegex } from "../config/schema.js";

export async function runWizard(
  defaultTargetDir: string | undefined,
  factoryConfig: FactoryConfig
): Promise<{ targetDir: string; config: AppConfig }> {
  p.intro(pc.cyan("🚀 欢迎使用 app_factory 脚手架"));

  const availableTemplates = Object.keys(factoryConfig.templates);

  const responses = await p.group(
    {
      targetDir: () =>
        p.text({
          message: "请输入目标项目目录：",
          placeholder: "./my_new_app",
          defaultValue: defaultTargetDir || "./my_new_app",
          validate: (value) => {
            if (!value || value.trim().length === 0) return "目录名不能为空";
          },
        }),
      template: () =>
        p.select({
          message: "请选择应用底座模板：",
          options: availableTemplates.map((t) => ({
            value: t,
            label: factoryConfig.templates[t].name || t,
            hint: factoryConfig.templates[t].description,
          })),
          initialValue: "flutter",
        }),
      name: () =>
        p.text({
          message: "请输入应用桌面名称（App Name）：",
          placeholder: "闪记笔记",
          validate: (value) => (!value ? "应用名称不能为空" : undefined),
        }),
      packageName: () =>
        p.text({
          message: "请输入项目工程包名（Dart package name，小写下划线）：",
          placeholder: "quick_note",
          validate: (value) => {
            if (!DartPackageNameRegex.test(value)) {
              return "必须以小写字母开头，仅包含小写字母、数字和下划线";
            }
          },
        }),
      bundleId: () =>
        p.text({
          message: "请输入唯一移动端包标识（Bundle ID / Application ID）：",
          placeholder: "com.example.quicknote",
          validate: (value) => {
            if (!BundleIdRegex.test(value)) {
              return "必须为反向域名格式 (例如 com.example.app)";
            }
          },
        }),
    },
    {
      onCancel: () => {
        p.cancel("已取消创建。");
        process.exit(0);
      },
    }
  );

  const config: AppConfig = {
    template: responses.template as string,
    app: {
      name: responses.name as string,
      packageName: responses.packageName as string,
      bundleId: responses.bundleId as string,
      version: "1.0.0",
      buildNumber: 1,
    },
  };

  return { targetDir: responses.targetDir as string, config };
}
