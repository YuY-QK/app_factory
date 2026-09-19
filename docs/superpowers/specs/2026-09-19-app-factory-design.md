# app_factory 设计规范 (Design Specification)

## 1. 概述与目标 (Overview & Goals)

### 1.1 背景
在多 App 并行开发中，基础设施（网络请求层、状态管理、日志系统、多环境配置、本地化、原生打包配置）具备高度共性。每次新建 App 从零搭建耗时且难以保证工程标准一致。

### 1.2 目标
构建一个通用的、多技术栈适用的 App 脚手架 CLI 工具（`app_factory`）：
- **一键创建**：运行一条命令即可基于成熟模板生成立即可跑的初始 App 工程。
- **配置驱动**：解耦“应用身份信息（App Name、BundleId 等）”与“业务代码”，通过中心化配置文件管理。
- **技术栈中立与多模板扩展**：第一期优先打通并支持现有的 Flutter 壳工程 `app_flutter_common`，同时架构上可无缝扩展支持 React Native、Web 等其他技术栈模板。
- **开箱即测**：生成的项目自带完整的代码风格检查与自动化测试基础，无需二次配置原生目录。

---

## 2. 架构设计 (Architecture)

### 2.1 模块职责划分

```text
app_factory/
├── bin/
│   └── app-factory.js          # CLI 可执行文件入口 (# !/usr/bin/env node)
├── src/
│   ├── index.ts                # 命令路由 (create, list, info)
│   ├── config/
│   │   ├── schema.ts           # Zod 规则校验器 (factory.config.yaml & app.config.yaml)
│   │   └── loader.ts           # 配置文件解析与默认值计算
│   ├── core/
│   │   ├── fetcher.ts          # 模板拉取器 (支持本地复制与 Git 克隆，排除 build/git)
│   │   ├── transformer.ts      # 文本替换引擎与目录重排器
│   │   └── runner.ts           # 跨平台命令执行器 (执行 fvm / flutter 等钩子)
│   ├── presets/
│   │   ├── types.ts            # Preset 抽象接口定义
│   │   └── flutter.preset.ts   # Flutter 专有转换规则实现
│   └── prompts/
│       └── wizard.ts           # 交互式向导 (@clack/prompts)
├── factory.config.yaml         # 全局模板注册表
├── package.json
└── tsconfig.json
```

### 2.2 核心抽象：Template Preset 模式
为支持多种技术栈，脚手架定义统一的 `TemplatePreset` 接口：
- `type`: 模板类型标识符（如 `flutter`、`react-native`、`web`）。
- `validate(context)`: 检查该技术栈所需的本地环境工具链（如检测 `fvm` / `flutter`）。
- `transform(context)`: 执行平台特定的文件内容替换和目录移动逻辑。
- `postCreate(context)`: 执行依赖安装与代码生成钩子。

---

## 3. 配置文件规范 (Configuration Specifications)

### 3.1 脚手架全局配置 (`factory.config.yaml`)
位于 `app_factory` 根目录，用于声明模板来源与规则绑定：

```yaml
version: "1.0.0"
templates:
  flutter:
    name: "Flutter Standard Shell"
    description: "基于 Material 3 + Riverpod + packages/app_foundation 的 Flutter 标准底座"
    type: "flutter"
    source: "../app_flutter_common" # 支持本地相对路径或 Git URL (如 https://github.com/... 或 git@...)
    branch: "main"                   # Git 模式下的默认分支
    author: "app_factory"
```

### 3.2 项目参数配置 (`app.config.yaml`)
用于描述具体新 App 的元数据，创建时若未传入 `--config`，则通过交互向导生成并保存在新 App 的根目录下：

```yaml
template: "flutter"

app:
  name: "闪记笔记"                 # 桌面与系统展示名称 (CFBundleDisplayName / android:label)
  packageName: "quick_note"       # 代码/工程级标识 (Dart 包名 / pubspec.yaml name，小写下划线)
  bundleId: "com.yuyqk.quicknote"   # 原生系统唯一标识 (applicationId / PRODUCT_BUNDLE_IDENTIFIER)
  version: "1.0.0"
  buildNumber: 1

environments:
  dev:
    apiBaseUrl: "https://dev-api.example.com"
  prod:
    apiBaseUrl: "https://api.example.com"
```

---

## 4. Flutter 模板转换流水线 (Flutter Pipeline)

针对本地 `app_flutter_common` 模板的具体转换规则：

### 4.1 忽略规则 (Copy Filter)
拉取/复制模板时忽略以下文件与目录：
- `.git/`、`.agents/`、`.idea/`、`.vscode/`
- `.dart_tool/`、`build/`
- `ios/Pods/`、`ios/.symlinks/`
- `*.lock`（可选，默认保留以保证版本确定性，或在 post-create 中由 flutter 重新解析）

### 4.2 文本变量替换规则
- **`pubspec.yaml`**：
  - `name: app_flutter_common` → `name: {{app.packageName}}`
  - `description:` 替换为新 App 描述
- **Dart 源码引用**：
  - 全局替换 `package:app_flutter_common/` → `package:{{app.packageName}}/`
- **Android 原生配置**：
  - `android/app/build.gradle.kts`:
    - `namespace = "com.yuyqk.app_flutter_common"` → `namespace = "{{app.bundleId}}"`
    - `applicationId = "com.yuyqk.app_flutter_common"` → `applicationId = "{{app.bundleId}}"`
  - `android/app/src/main/AndroidManifest.xml`:
    - `android:label="app_flutter_common"` → `android:label="{{app.name}}"`
- **Android 目录重构**：
  - 原路径：`android/app/src/main/kotlin/com/yuyqk/app_flutter_common/MainActivity.kt`
  - 目标路径：根据 `app.bundleId` 拆解（如 `com.yuyqk.quicknote` → `com/yuyqk/quicknote/`）。
  - 操作：创建新目录结构，移动 `MainActivity.kt`，并更新其文件首行：`package {{app.bundleId}}`。清理遗留的空目录。
- **iOS 原生配置**：
  - `ios/Runner.xcodeproj/project.pbxproj`:
    - 将 `PRODUCT_BUNDLE_IDENTIFIER = com.yuyqk.appFlutterCommon;` 等全部替换为 `PRODUCT_BUNDLE_IDENTIFIER = {{app.bundleId}};`
  - `ios/Runner/Info.plist`:
    - `CFBundleDisplayName` → `{{app.name}}`
    - `CFBundleName` → `{{app.packageName}}`
- **Web 端配置**：
  - `web/manifest.json` 与 `web/index.html` 中的 App 标题与短名称替换。

### 4.3 后置生命周期钩子 (Post-create Hook)
按顺序尝试执行：
1. 检测是否存在 `fvm`：
   - 存在 `fvm`：执行 `fvm flutter pub get`，随后执行 `fvm flutter gen-l10n`。
   - 不存在 `fvm`：尝试执行 `flutter pub get` 与 `flutter gen-l10n`。
   - 若环境均不可用，输出友好警告提示用户手动安装依赖。
2. 在目标项目根目录下生成初始化的 `app.config.yaml`。
3. 输出启动指引，例如：
   ```bash
   cd <targetDir>
   fvm flutter run
   ```

---

## 5. CLI 交互与命令设计 (Command Line Interface)

### 5.1 命令结构
- `app-factory create [targetDir]`
  - 参数：
    - `targetDir`：目标生成目录（如 `./my_app`，必填或在交互中输入）。
    - `-t, --template <name>`：指定模板名（默认 `flutter`）。
    - `-c, --config <path>`：直接通过配置文件生成（用于 CI/自动化）。
    - `--skip-install`：跳过 post-create 的依赖安装。
- `app-factory list`
  - 列出当前 `factory.config.yaml` 注册的所有可用模板及其本地状态。

### 5.2 校验与防御设计
1. **目录非空校验**：目标目录若已存在且存在文件，要求用户确认覆盖或中止操作。
2. **命名规则校验**：
   - `packageName`：必须满足 Dart 包名规范（`^[a-z][a-z0-9_]*$`，不能包含横杠或大写）。
   - `bundleId`：必须满足 Android/iOS 命名规范（如 `^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$`）。
3. **模板有效性校验**：复制前校验模板目录是否存在 `pubspec.yaml`（Flutter 模板）等必要标记文件。

---

## 6. 测试与验证策略 (Testing & Verification)

1. **配置单元测试**：针对 Zod schema 验证非法输入（非法包名、非法 bundleId）均能给出清晰拦截提示。
2. **转换引擎单元测试**：针对文件内容替换、多层级 Kotlin 目录移动进行 mock/临时目录验证。
3. **端到端集成测试 (E2E)**：
   - 在临时目录中通过脚手架调用 `app_flutter_common` 生成完整项目 `e2e_test_app`。
   - 自动在生成的项目内调用 `fvm flutter analyze` 与 `fvm flutter test`，验证生成产物 0 静态警告、测试 100% 通过。
