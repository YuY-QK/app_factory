import { AppConfig } from "../config/schema.js";

export interface PresetContext {
  targetDir: string;
  config: AppConfig;
  skipInstall?: boolean;
}

export interface TemplatePreset {
  type: string;
  transform(context: PresetContext): Promise<void>;
  postCreate(context: PresetContext): Promise<void>;
}
