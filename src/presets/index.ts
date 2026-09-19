import { TemplatePreset } from "./types.js";
import { FlutterPreset } from "./flutter.preset.js";

const presets: Record<string, TemplatePreset> = {
  flutter: new FlutterPreset(),
};

export function getPreset(type: string): TemplatePreset {
  const preset = presets[type];
  if (!preset) {
    throw new Error(`Preset for template type '${type}' is not supported.`);
  }
  return preset;
}
