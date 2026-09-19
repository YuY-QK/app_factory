# app_factory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, configuration-driven, multi-template CLI scaffolding tool (`app_factory`) in TypeScript/Node.js that generates fully working mobile apps from starters like `app_flutter_common`.

**Architecture:** A modular CLI pipeline orchestrator composed of a configuration validator (Zod), template fetcher (local copy & git clone), transformer engine (token replacement & package directory re-nesting), tech-stack preset adapters (Flutter preset), and an interactive wizard (@clack/prompts).

**Tech Stack:** Node.js (v18+), TypeScript, pnpm, Commander.js, @clack/prompts, Zod, YAML, fs-extra, execa, picocolors, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-19-app-factory-design.md`

## Global Constraints

- CLI entrypoint must be executable with `node bin/app-factory.js`.
- Package names must conform to Dart package naming rules (`^[a-z][a-z0-9_]*$`).
- Bundle IDs must conform to reverse domain notation (`^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$`).
- Generated Flutter projects must keep `packages/app_foundation` intact and must pass `fvm flutter analyze` and `fvm flutter test`.
- All tests must pass with `pnpm test`.

---

### Task 1: Project Setup & Tooling Baseline

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `factory.config.yaml`
- Create: `bin/app-factory.js`

**Interfaces:**
- Produces: Base project structure, package scripts (`build`, `test`, `dev`), and TypeScript compilation pipeline.

- [ ] **Step 1: Write `.gitignore`, `tsconfig.json`, and `vitest.config.ts`**

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

```text
# .gitignore
node_modules/
dist/
*.log
.DS_Store
tmp/
```

- [ ] **Step 2: Create `package.json` and install dependencies**

```json
{
  "name": "app_factory",
  "version": "1.0.0",
  "description": "Config-driven multi-template App scaffolding CLI",
  "type": "module",
  "bin": {
    "app-factory": "./bin/app-factory.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@clack/prompts": "^0.9.0",
    "commander": "^12.1.0",
    "execa": "^9.5.2",
    "fs-extra": "^11.2.0",
    "picocolors": "^1.1.1",
    "yaml": "^2.7.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^22.13.9",
    "typescript": "^5.8.2",
    "vitest": "^3.0.7"
  }
}
```

- [ ] **Step 3: Create executable stub `bin/app-factory.js` and `factory.config.yaml`**

```javascript
#!/usr/bin/env node
import "../dist/index.js";
```

```yaml
version: "1.0.0"
templates:
  flutter:
    name: "Flutter Standard Shell"
    description: "基于 Material 3 + Riverpod + packages/app_foundation 的 Flutter 标准底座"
    type: "flutter"
    source: "../app_flutter_common"
    branch: "main"
```

- [ ] **Step 4: Install dependencies and verify TypeScript builds clean**

Run: `pnpm install && mkdir -p src && echo 'export const version = "1.0.0";' > src/index.ts && pnpm build`
Expected: `dist/index.js` generated without errors.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json vitest.config.ts .gitignore bin/app-factory.js factory.config.yaml src/index.ts
git commit -m "chore: initialize app_factory project setup and dependencies"
```

---

### Task 2: Configuration Schemas & Loader

**Files:**
- Create: `src/config/schema.ts`
- Create: `src/config/loader.ts`
- Test: `tests/config/loader.test.ts`

**Interfaces:**
- Produces:
  - `AppConfigSchema`, `AppConfig`
  - `FactoryConfigSchema`, `FactoryConfig`
  - `loadAppConfig(filePath: string): Promise<AppConfig>`
  - `loadFactoryConfig(filePath?: string): Promise<FactoryConfig>`
  - `validateAppConfig(raw: unknown): AppConfig`

- [ ] **Step 1: Write the failing tests in `tests/config/loader.test.ts`**

```typescript
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
    expect(() => validateAppConfig(invalid)).toThrowError(/packageName/);
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
    expect(() => validateAppConfig(invalid)).toThrowError(/bundleId/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/config/loader.test.ts`
Expected: FAIL with module/function not found.

- [ ] **Step 3: Implement `src/config/schema.ts` and `src/config/loader.ts`**

```typescript
// src/config/schema.ts
import { z } from "zod";

export const DartPackageNameRegex = /^[a-z][a-z0-9_]*$/;
export const BundleIdRegex = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

export const AppConfigSchema = z.object({
  template: z.string().min(1, "Template name is required"),
  app: z.object({
    name: z.string().min(1, "App name is required"),
    packageName: z
      .string()
      .regex(
        DartPackageNameRegex,
        "Package name must start with a lowercase letter and contain only lowercase letters, digits, and underscores"
      ),
    bundleId: z
      .string()
      .regex(BundleIdRegex, "Bundle ID must be in reverse domain format (e.g. com.example.app)"),
    version: z.string().default("1.0.0"),
    buildNumber: z.number().int().positive().default(1),
  }),
  environments: z
    .record(
      z.object({
        apiBaseUrl: z.string().url().optional(),
      })
    )
    .optional(),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export const TemplateDefinitionSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(["flutter", "react-native", "web", "generic"]),
  source: z.string(),
  branch: z.string().default("main"),
  author: z.string().optional(),
});

export const FactoryConfigSchema = z.object({
  version: z.string().default("1.0.0"),
  templates: z.record(TemplateDefinitionSchema),
});

export type FactoryConfig = z.infer<typeof FactoryConfigSchema>;

export function validateAppConfig(raw: unknown): AppConfig {
  return AppConfigSchema.parse(raw);
}
```

```typescript
// src/config/loader.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/config/loader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config tests/config
git commit -m "feat(config): add Zod schemas and YAML loaders with format validation"
```

---

### Task 3: Template Fetcher (Local Copy & Git Clone)

**Files:**
- Create: `src/core/fetcher.ts`
- Test: `tests/core/fetcher.test.ts`

**Interfaces:**
- Produces:
  - `fetchTemplate(options: { source: string; targetDir: string; branch?: string }): Promise<void>`
  - `DEFAULT_IGNORE_PATTERNS: string[]`

- [ ] **Step 1: Write failing tests in `tests/core/fetcher.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { fetchTemplate } from "../../src/core/fetcher.js";

describe("Template Fetcher", () => {
  const tmpDir = path.resolve("./tmp/test_fetcher");
  const mockSource = path.join(tmpDir, "mock_source");
  const mockTarget = path.join(tmpDir, "mock_target");

  beforeEach(async () => {
    await fs.remove(tmpDir);
    await fs.ensureDir(mockSource);
    await fs.writeFile(path.join(mockSource, "pubspec.yaml"), "name: test\n");
    await fs.ensureDir(path.join(mockSource, ".git"));
    await fs.writeFile(path.join(mockSource, ".git/HEAD"), "ref: refs/heads/main\n");
    await fs.ensureDir(path.join(mockSource, "build"));
    await fs.writeFile(path.join(mockSource, "build/app.apk"), "dummy");
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("copies template directory while ignoring .git and build folders", async () => {
    await fetchTemplate({ source: mockSource, targetDir: mockTarget });
    expect(await fs.pathExists(path.join(mockTarget, "pubspec.yaml"))).toBe(true);
    expect(await fs.pathExists(path.join(mockTarget, ".git"))).toBe(false);
    expect(await fs.pathExists(path.join(mockTarget, "build"))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/core/fetcher.test.ts`
Expected: FAIL with `fetchTemplate` undefined.

- [ ] **Step 3: Implement `src/core/fetcher.ts`**

```typescript
import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";

export const DEFAULT_IGNORE_PATTERNS = [
  ".git",
  ".agents",
  ".idea",
  ".vscode",
  ".dart_tool",
  "build",
  "Pods",
  ".symlinks",
  ".DS_Store",
];

export interface FetchOptions {
  source: string;
  targetDir: string;
  branch?: string;
}

export async function fetchTemplate(options: FetchOptions): Promise<void> {
  const { source, targetDir, branch = "main" } = options;

  await fs.ensureDir(targetDir);

  const isGit = source.startsWith("http://") || source.startsWith("https://") || source.startsWith("git@");

  if (isGit) {
    await execa("git", ["clone", "--depth", "1", "--branch", branch, source, targetDir]);
    await fs.remove(path.join(targetDir, ".git"));
  } else {
    const resolvedSource = path.resolve(process.cwd(), source);
    if (!(await fs.pathExists(resolvedSource))) {
      throw new Error(`Template local source path not found: ${resolvedSource}`);
    }

    await fs.copy(resolvedSource, targetDir, {
      filter: (src) => {
        const basename = path.basename(src);
        return !DEFAULT_IGNORE_PATTERNS.includes(basename);
      },
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/core/fetcher.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/fetcher.ts tests/core/fetcher.test.ts
git commit -m "feat(core): implement template fetcher with ignore filters and git clone"
```

---

### Task 4: Text Replacement & Directory Reorganization Engine

**Files:**
- Create: `src/core/transformer.ts`
- Test: `tests/core/transformer.test.ts`

**Interfaces:**
- Produces:
  - `replaceInFiles(dir: string, replacements: Array<{ from: string | RegExp; to: string }>, filePatterns?: string[]): Promise<number>`
  - `moveAndReorganizePackage(baseDir: string, oldPackagePath: string, newPackagePath: string, targetFile: string): Promise<void>`

- [ ] **Step 1: Write failing tests in `tests/core/transformer.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { replaceInFiles, moveAndReorganizePackage } from "../../src/core/transformer.js";

describe("Transformer Engine", () => {
  const tmpDir = path.resolve("./tmp/test_transformer");

  beforeEach(async () => {
    await fs.remove(tmpDir);
    await fs.ensureDir(tmpDir);
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("replaces exact tokens in target files", async () => {
    const testFile = path.join(tmpDir, "sample.yaml");
    await fs.writeFile(testFile, "name: app_flutter_common\nlabel: app_flutter_common\n");

    const count = await replaceInFiles(tmpDir, [
      { from: "app_flutter_common", to: "my_cool_app" },
    ]);

    expect(count).toBeGreaterThan(0);
    const updated = await fs.readFile(testFile, "utf-8");
    expect(updated).toBe("name: my_cool_app\nlabel: my_cool_app\n");
  });

  it("moves MainActivity.kt to target package directory and deletes empty old folders", async () => {
    const kotlinBase = path.join(tmpDir, "kotlin");
    const oldPath = "com/old/app";
    const newPath = "com/new/company/app";
    const file = "MainActivity.kt";

    const oldFolder = path.join(kotlinBase, oldPath);
    await fs.ensureDir(oldFolder);
    await fs.writeFile(path.join(oldFolder, file), "package com.old.app\nclass MainActivity");

    await moveAndReorganizePackage(kotlinBase, oldPath, newPath, file);

    const newFilePath = path.join(kotlinBase, newPath, file);
    expect(await fs.pathExists(newFilePath)).toBe(true);
    expect(await fs.pathExists(path.join(oldFolder, file))).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/core/transformer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/core/transformer.ts`**

```typescript
import fs from "fs-extra";
import path from "node:path";

export interface Replacement {
  from: string | RegExp;
  to: string;
}

export async function replaceInFiles(
  dir: string,
  replacements: Replacement[],
  fileFilter?: (filePath: string) => boolean
): Promise<number> {
  let changedFilesCount = 0;

  async function walk(currentDir: string) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        if (fileFilter && !fileFilter(fullPath)) continue;

        let content = await fs.readFile(fullPath, "utf-8");
        let modified = false;

        for (const { from, to } of replacements) {
          if (typeof from === "string") {
            if (content.includes(from)) {
              content = content.replaceAll(from, to);
              modified = true;
            }
          } else {
            if (from.test(content)) {
              content = content.replace(from, to);
              modified = true;
            }
          }
        }

        if (modified) {
          await fs.writeFile(fullPath, content, "utf-8");
          changedFilesCount++;
        }
      }
    }
  }

  await walk(dir);
  return changedFilesCount;
}

export async function moveAndReorganizePackage(
  baseDir: string,
  oldPackagePath: string,
  newPackagePath: string,
  fileName: string
): Promise<void> {
  const oldFile = path.join(baseDir, oldPackagePath, fileName);
  const newDir = path.join(baseDir, newPackagePath);
  const newFile = path.join(newDir, fileName);

  if (!(await fs.pathExists(oldFile))) {
    return;
  }

  await fs.ensureDir(newDir);
  await fs.move(oldFile, newFile, { overwrite: true });

  // Clean empty parent directories of old path
  let current = path.dirname(oldFile);
  while (current !== baseDir && current.startsWith(baseDir)) {
    const files = await fs.readdir(current);
    if (files.length === 0) {
      await fs.remove(current);
      current = path.dirname(current);
    } else {
      break;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/core/transformer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/transformer.ts tests/core/transformer.test.ts
git commit -m "feat(core): implement string replacement and package directory re-nesting engine"
```

---

### Task 5: Command Runner & Tooling Detection

**Files:**
- Create: `src/core/runner.ts`
- Test: `tests/core/runner.test.ts`

**Interfaces:**
- Produces:
  - `detectFlutterCli(): Promise<{ command: string; isFvm: boolean } | null>`
  - `runCommand(cmd: string, args: string[], cwd: string): Promise<void>`

- [ ] **Step 1: Write failing tests in `tests/core/runner.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { detectFlutterCli, runCommand } from "../../src/core/runner.js";

describe("Runner and CLI Detection", () => {
  it("detects system tool availability", async () => {
    const tool = await detectFlutterCli();
    // In our system FVM or Flutter is available
    expect(tool).not.toBeNull();
    if (tool) {
      expect(["fvm", "flutter"]).toContain(tool.command);
    }
  });

  it("successfully runs a valid echo command", async () => {
    await expect(runCommand("node", ["-v"], process.cwd())).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/core/runner.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/core/runner.ts`**

```typescript
import { execa } from "execa";

export async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await execa("which", [command]);
    return true;
  } catch {
    return false;
  }
}

export async function detectFlutterCli(): Promise<{ command: string; isFvm: boolean } | null> {
  if (await isCommandAvailable("fvm")) {
    return { command: "fvm", isFvm: true };
  }
  if (await isCommandAvailable("flutter")) {
    return { command: "flutter", isFvm: false };
  }
  return null;
}

export async function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  await execa(cmd, args, {
    cwd,
    stdio: "inherit",
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/core/runner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/runner.ts tests/core/runner.test.ts
git commit -m "feat(core): implement CLI detector and command execution runner"
```

---

### Task 6: Flutter Preset Transformation & Lifecycle Implementation

**Files:**
- Create: `src/presets/types.ts`
- Create: `src/presets/flutter.preset.ts`
- Create: `src/presets/index.ts`
- Test: `tests/presets/flutter.preset.test.ts`

**Interfaces:**
- Produces:
  - `TemplatePreset` interface
  - `FlutterPreset` implementation
  - `getPreset(type: string): TemplatePreset`

- [ ] **Step 1: Write failing tests in `tests/presets/flutter.preset.test.ts`**

```typescript
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/presets/flutter.preset.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/presets/types.ts`, `src/presets/flutter.preset.ts`, `src/presets/index.ts`**

```typescript
// src/presets/types.ts
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
```

```typescript
// src/presets/flutter.preset.ts
import path from "node:path";
import fs from "fs-extra";
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

    // 1. Text Replacements
    await replaceInFiles(targetDir, [
      { from: `name: ${oldPackageName}`, to: `name: ${packageName}` },
      { from: `package:${oldPackageName}/`, to: `package:${packageName}/` },
      { from: oldBundleId, to: bundleId },
      { from: oldIosBundleId, to: bundleId },
      { from: `android:label="${oldPackageName}"`, to: `android:label="${name}"` },
      { from: `<string>${oldDisplayName}</string>`, to: `<string>${name}</string>` },
      { from: `<string>${oldPackageName}</string>`, to: `<string>${packageName}</string>` },
      { from: `"name": "${oldPackageName}"`, to: `"name": "${name}"` },
      { from: `"short_name": "${oldPackageName}"`, to: `"short_name": "${name}"` },
      { from: `<title>${oldPackageName}</title>`, to: `<title>${name}</title>` },
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
      return;
    }

    const flutterCli = await detectFlutterCli();
    if (!flutterCli) {
      console.warn("⚠️ Flutter SDK not found in PATH. Skipping pub get.");
      return;
    }

    const { command, isFvm } = flutterCli;
    const argsPrefix = isFvm ? ["flutter"] : [];

    console.log(`📦 Running ${command} pub get...`);
    await runCommand(command, [...argsPrefix, "pub", "get"], context.targetDir);

    console.log(`🌐 Running ${command} gen-l10n...`);
    await runCommand(command, [...argsPrefix, "gen-l10n"], context.targetDir);
  }
}
```

```typescript
// src/presets/index.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/presets/flutter.preset.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/presets tests/presets
git commit -m "feat(presets): implement Flutter preset adapter and transforms"
```

---

### Task 7: Interactive Wizard & CLI Entrypoints

**Files:**
- Create: `src/prompts/wizard.ts`
- Create: `src/commands/create.ts`
- Create: `src/commands/list.ts`
- Modify: `src/index.ts`
- Test: `tests/commands/create.test.ts`

**Interfaces:**
- Produces:
  - `runWizard(factoryConfig: FactoryConfig): Promise<{ targetDir: string; config: AppConfig }>`
  - `createProject(options: CreateOptions): Promise<void>`
  - Executable CLI `app-factory create` and `app-factory list`

- [ ] **Step 1: Write tests in `tests/commands/create.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import YAML from "yaml";
import { createProject } from "../../src/commands/create.js";

describe("Create Command", () => {
  const tmpDir = path.resolve("./tmp/test_create_cmd");
  const targetDir = path.join(tmpDir, "output_app");
  const configPath = path.join(tmpDir, "app.config.yaml");

  beforeEach(async () => {
    await fs.remove(tmpDir);
    await fs.ensureDir(tmpDir);

    const config = {
      template: "flutter",
      app: {
        name: "测试应用",
        packageName: "test_app",
        bundleId: "com.example.testapp",
        version: "1.0.0",
        buildNumber: 1,
      },
    };
    await fs.writeFile(configPath, YAML.stringify(config));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it("creates project successfully using config file and skips install", async () => {
    await createProject({
      targetDir,
      configPath,
      skipInstall: true,
      factoryConfigPath: path.resolve("./factory.config.yaml"),
    });

    expect(await fs.pathExists(path.join(targetDir, "pubspec.yaml"))).toBe(true);
    expect(await fs.pathExists(path.join(targetDir, "app.config.yaml"))).toBe(true);
    const pubspec = await fs.readFile(path.join(targetDir, "pubspec.yaml"), "utf-8");
    expect(pubspec).toContain("name: test_app");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/commands/create.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement `src/prompts/wizard.ts`, `src/commands/create.ts`, `src/commands/list.ts`, `src/index.ts`**

```typescript
// src/prompts/wizard.ts
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
```

```typescript
// src/commands/create.ts
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
    finalTargetDir = options.targetDir || path.basename(finalConfig.app.packageName);
  } else {
    const wizardResult = await runWizard(options.targetDir, factoryConfig);
    finalTargetDir = wizardResult.targetDir;
    finalConfig = wizardResult.config;
  }

  const resolvedTarget = path.resolve(process.cwd(), finalTargetDir);

  if ((await fs.pathExists(resolvedTarget)) && (await fs.readdir(resolvedTarget)).length > 0) {
    throw new Error(`目标目录已存在且不为空: ${resolvedTarget}`);
  }

  const templateDef = factoryConfig.templates[finalConfig.template];
  if (!templateDef) {
    throw new Error(`模板 '${finalConfig.template}' 未在 factory.config.yaml 中定义。`);
  }

  console.log(pc.cyan(`\n📥 正在拉取模板: ${templateDef.name} (${templateDef.source})...`));
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

  console.log(pc.cyan("📦 正在执行后置生命周期与依赖安装..."));
  await preset.postCreate({
    targetDir: resolvedTarget,
    config: finalConfig,
    skipInstall: options.skipInstall,
  });

  console.log(pc.green(`\n🎉 项目创建成功！`));
  console.log(pc.white(`\n下一步操作：`));
  console.log(pc.cyan(`  cd ${finalTargetDir}`));
  console.log(pc.cyan(`  fvm flutter run\n`));
}
```

```typescript
// src/commands/list.ts
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
```

```typescript
// src/index.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/commands/create.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src tests/commands
git commit -m "feat(cli): implement interactive wizard and create/list CLI commands"
```

---

### Task 8: Build Verification & End-to-End Test with `app_flutter_common`

**Files:**
- Test: `tests/e2e/scaffold.e2e.test.ts`

**Interfaces:**
- Produces: Verified global build and passing E2E test executing against `/Users/yu/Work/AppsWp/app_flutter_common`.

- [ ] **Step 1: Write E2E test in `tests/e2e/scaffold.e2e.test.ts`**

```typescript
import { describe, it, expect, afterAll } from "vitest";
import fs from "fs-extra";
import path from "node:path";
import { execa } from "execa";
import { createProject } from "../../src/commands/create.js";

describe("E2E Scaffolding with app_flutter_common", () => {
  const e2eTarget = path.resolve("./tmp/e2e_real_app");

  afterAll(async () => {
    await fs.remove(e2eTarget);
  });

  it("scaffolds a complete Flutter app and passes test and analyze", async () => {
    await fs.remove(e2eTarget);

    const config = {
      template: "flutter",
      app: {
        name: "自动化验证应用",
        packageName: "e2e_verified_app",
        bundleId: "com.factory.e2everified",
        version: "1.0.0",
        buildNumber: 1,
      },
    };

    const configPath = path.resolve("./tmp/e2e_app.config.yaml");
    await fs.ensureDir(path.dirname(configPath));
    const YAML = (await import("yaml")).default;
    await fs.writeFile(configPath, YAML.stringify(config));

    await createProject({
      targetDir: e2eTarget,
      configPath,
      skipInstall: false,
      factoryConfigPath: path.resolve("./factory.config.yaml"),
    });

    // Verify critical files
    expect(await fs.pathExists(path.join(e2eTarget, "pubspec.yaml"))).toBe(true);
    expect(await fs.pathExists(path.join(e2eTarget, "packages/app_foundation/pubspec.yaml"))).toBe(true);
    expect(
      await fs.pathExists(
        path.join(e2eTarget, "android/app/src/main/kotlin/com/factory/e2everified/MainActivity.kt")
      )
    ).toBe(true);

    // Verify Flutter test runs and passes
    const testResult = await execa("fvm", ["flutter", "test"], { cwd: e2eTarget });
    expect(testResult.exitCode).toBe(0);

    // Verify Flutter analyze passes
    const analyzeResult = await execa("fvm", ["flutter", "analyze"], { cwd: e2eTarget });
    expect(analyzeResult.exitCode).toBe(0);
  }, 180000);
});
```

- [ ] **Step 2: Build project and run complete test suite**

Run: `pnpm build && pnpm test`
Expected: ALL tests pass, E2E test verifies flutter test & analyze pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e
git commit -m "test(e2e): add end-to-end verification test with real Flutter starter"
```
