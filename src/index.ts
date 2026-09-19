import { Command } from "commander";
import { createProject } from "./commands/create.js";
import { listTemplates } from "./commands/list.js";

const program = new Command();

program
  .name("app-factory")
  .description("通用的移动端与多技术栈 App 脚手架工具")
  .version("1.0.0");

program
  .command("create [targetDir]")
  .description("创建一个新的 App 工程")
  .option("-t, --template <name>", "指定使用的模板")
  .option("-c, --config <path>", "指定 app.config.yaml 配置文件")
  .option("--skip-install", "跳过依赖安装和构建步骤")
  .action(async (targetDir, options) => {
    try {
      await createProject({
        targetDir,
        configPath: options.config,
        template: options.template,
        skipInstall: options.skipInstall,
      });
    } catch (err: any) {
      console.error(`\n❌ 创建失败: ${err.message}\n`);
      process.exit(1);
    }
  });

program
  .command("list")
  .description("列出所有已注册的模板")
  .action(async () => {
    try {
      await listTemplates();
    } catch (err: any) {
      console.error(`\n❌ 获取列表失败: ${err.message}\n`);
      process.exit(1);
    }
  });

program.parse(process.argv);
