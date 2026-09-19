import pc from "picocolors";
import { loadFactoryConfig } from "../config/loader.js";

export async function listTemplates(): Promise<void> {
  const config = await loadFactoryConfig();
  console.log(pc.cyan("\n📋 已注册的 App 模版列表：\n"));

  for (const [id, def] of Object.entries(config.templates)) {
    console.log(`  ${pc.bold(pc.green(id))} - ${def.name}`);
    if (def.description) {
      console.log(`    ${pc.gray(def.description)}`);
    }
    console.log(`    ${pc.dim("类型:")} ${def.type}  ${pc.dim("来源:")} ${def.source}\n`);
  }
}
