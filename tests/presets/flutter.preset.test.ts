import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { FlutterPreset } from "../../src/presets/flutter.preset.js";
import { AppConfig } from "../../src/config/schema.js";

describe("Flutter Preset Transformation", () => {
  const tmpDir = path.resolve("./tmp/test_flutter_preset");

  beforeEach(async () => {
    await fs.remove(tmpDir);
    await fs.ensureDir(tmpDir);

    // Mock minimal flutter project files
    await fs.writeFile(
      path.join(tmpDir, "pubspec.yaml"),
      "name: app_flutter_common\ndescription: Starter\n"
    );

    const kotlinDir = path.join(tmpDir, "android/app/src/main/kotlin/com/yuyqk/app_flutter_common");
    await fs.ensureDir(kotlinDir);
    await fs.writeFile(
      path.join(kotlinDir, "MainActivity.kt"),
      "package com.yuyqk.app_flutter_common\nclass MainActivity\n"
    );

    const gradleDir = path.join(tmpDir, "android/app");
    await fs.ensureDir(gradleDir);
    await fs.writeFile(
      path.join(gradleDir, "build.gradle.kts"),
      'namespace = "com.yuyqk.app_flutter_common"\napplicationId = "com.yuyqk.app_flutter_common"\n'
    );

    const iosDir = path.join(tmpDir, "ios/Runner");
    await fs.ensureDir(iosDir);
    await fs.writeFile(
      path.join(iosDir, "Info.plist"),
      "<key>CFBundleDisplayName</key>\n<string>App Flutter Common</string>\n"
    );
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("transforms Flutter project identifiers and Android kotlin paths", async () => {
    const config: AppConfig = {
      template: "flutter",
      app: {
        name: "闪记笔记",
        packageName: "quick_note",
        bundleId: "com.acme.quicknote",
        version: "1.0.0",
        buildNumber: 1,
      },
    };

    const preset = new FlutterPreset();
    await preset.transform({ targetDir: tmpDir, config });

    // Check pubspec
    const pubspec = await fs.readFile(path.join(tmpDir, "pubspec.yaml"), "utf-8");
    expect(pubspec).toContain("name: quick_note");

    // Check build.gradle.kts
    const gradle = await fs.readFile(path.join(tmpDir, "android/app/build.gradle.kts"), "utf-8");
    expect(gradle).toContain('namespace = "com.acme.quicknote"');
    expect(gradle).toContain('applicationId = "com.acme.quicknote"');

    // Check MainActivity relocated
    const newMainActivity = path.join(
      tmpDir,
      "android/app/src/main/kotlin/com/acme/quicknote/MainActivity.kt"
    );
    expect(await fs.pathExists(newMainActivity)).toBe(true);
    const content = await fs.readFile(newMainActivity, "utf-8");
    expect(content).toContain("package com.acme.quicknote");
  });

  it("transforms iOS bundle identifiers, display names, and package imports", async () => {
    const config: AppConfig = {
      template: "flutter",
      app: {
        name: "我的酷炫应用",
        packageName: "cool_app",
        bundleId: "com.super.coolapp",
        version: "1.0.0",
        buildNumber: 1,
      },
    };

    const pbxprojPath = path.join(tmpDir, "ios/Runner.xcodeproj/project.pbxproj");
    await fs.ensureDir(path.dirname(pbxprojPath));
    await fs.writeFile(
      pbxprojPath,
      "PRODUCT_BUNDLE_IDENTIFIER = com.yuyqk.appFlutterCommon;\nPRODUCT_BUNDLE_IDENTIFIER = com.yuyqk.appFlutterCommon.RunnerTests;\n"
    );

    const dartTestFile = path.join(tmpDir, "lib/main.dart");
    await fs.ensureDir(path.dirname(dartTestFile));
    await fs.writeFile(
      dartTestFile,
      "import 'package:app_flutter_common/app/app.dart';\nvoid main() {}\n"
    );

    const preset = new FlutterPreset();
    await preset.transform({ targetDir: tmpDir, config });

    const pbxproj = await fs.readFile(pbxprojPath, "utf-8");
    expect(pbxproj).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.super.coolapp;");
    expect(pbxproj).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.super.coolapp.RunnerTests;");

    const infoPlist = await fs.readFile(path.join(tmpDir, "ios/Runner/Info.plist"), "utf-8");
    expect(infoPlist).toContain("<string>我的酷炫应用</string>");

    const dartContent = await fs.readFile(dartTestFile, "utf-8");
    expect(dartContent).toContain("import 'package:cool_app/app/app.dart';");
  });
});
