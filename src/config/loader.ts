import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";
import { AppConfig, AppConfigSchema, FactoryConfig, FactoryConfigSchema } from "./schema.js";

export async function loadAppConfig(filePath: string): Promise<AppConfig> {
  const content = await fs.readFile(filePath, "utf-8");
  const raw = YAML.parse(content);
  return AppConfigSchema.parse(raw);
}

export async function loadFactoryConfig(customPath?: string): Promise<FactoryConfig> {
  const defaultPath = path.resolve(process.cwd(), "factory.config.yaml");
  const targetPath = customPath ? path.resolve(customPath) : defaultPath;
  
  if (!(await fs.pathExists(targetPath))) {
    throw new Error(`Factory configuration file not found at: ${targetPath}`);
  }

  const content = await fs.readFile(targetPath, "utf-8");
  const raw = YAML.parse(content);
  return FactoryConfigSchema.parse(raw);
}
