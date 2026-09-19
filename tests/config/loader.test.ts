import { describe, it, expect } from "vitest";
import { validateAppConfig, AppConfigSchema, FactoryConfigSchema } from "../../src/config/schema.js";

describe("Configuration Schema Validation", () => {
  it("validates a standard valid app config", () => {
    const valid = {
      template: "flutter",
      app: {
        name: "闪记笔记",
        packageName: "quick_note",
        bundleId: "com.yuyqk.quicknote",
        version: "1.0.0",
        buildNumber: 1,
      },
    };
    const parsed = validateAppConfig(valid);
    expect(parsed.app.packageName).toBe("quick_note");
  });

  it("rejects invalid Dart package names with uppercase or dashes", () => {
    const invalid = {
      template: "flutter",
      app: {
        name: "Test",
        packageName: "Quick-Note",
        bundleId: "com.example.test",
      },
    };
    expect(() => validateAppConfig(invalid)).toThrowError();
  });

  it("rejects invalid bundleId format", () => {
    const invalid = {
      template: "flutter",
      app: {
        name: "Test",
        packageName: "quick_note",
        bundleId: "invalidbundleid",
      },
    };
    expect(() => validateAppConfig(invalid)).toThrowError();
  });
});

import { loadFactoryConfig } from "../../src/config/loader.js";

describe("Factory Config Loader", () => {
  it("loads factory.config.yaml properly", async () => {
    const config = await loadFactoryConfig();
    expect(config.version).toBe("1.0.0");
    expect(config.templates.flutter).toBeDefined();
    expect(config.templates.flutter.type).toBe("flutter");
  });
});
