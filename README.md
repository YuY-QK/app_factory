# app_factory

通用的移动端与多技术栈 App 脚手架工具（App Scaffolding & Factory CLI）。

通过配置驱动与预设模板，一键生成具备完整工程基建（网络、路由、状态管理、日志、国际化、多环境与原生配置）的初始 App，开发人员无需再做重复的基础设施搭建，直接开始编写业务逻辑。

---

## 🌟 核心特性

- **多技术栈解耦**：通过 `factory.config.yaml` 声明并管理模板源（支持本地相对路径与远程 Git 仓库），首发支持 Flutter 官方基建模板，后续可无缝扩展 React Native、Web 等其他技术栈。
- **配置驱动设计**：目标 App 的基本信息（应用名称、包标识、版本号、网络环境等）由独立的 `app.config.yaml` 统一定义，杜绝散落在原生各个工程文件中的手工修改。
- **深度原生适配**：自动化完成技术栈深层重命名：
  - **Android**：自动更新 `applicationId`、`namespace`、`AndroidManifest.xml`，并将 `MainActivity.kt` 自动重构移动到匹配目标包名的新目录结构中。
  - **iOS**：自动更新 `project.pbxproj` 中的 `PRODUCT_BUNDLE_IDENTIFIER`，以及 `Info.plist` 中的 `CFBundleDisplayName`。
  - **Flutter**：自动重命名 `pubspec.yaml` 中的工程名，并批量重写源码中的 `package:<name>` 引用。
- **双模式创建**：
  - **交互式向导模式**：直接运行 `app-factory create`，通过优雅的命令行交互引导输入。
  - **配置文件驱动模式**：通过 `app-factory create --config app.config.yaml` 一键批量自动化生成。
- **开箱即用**：自动识别环境中的 `fvm` 或 `flutter` 执行依赖获取 (`pub get`) 与国际化生成 (`gen-l10n`)，生成后立即可运行并跑通测试。

---

## 📁 目录结构

```text
app_factory/
├── bin/
│   └── app-factory.js          # CLI 执行入口
├── src/
│   ├── index.ts                # 命令定义 (create, list)
│   ├── config/
│   │   ├── schema.ts           # 配置文件 Zod 模式校验
│   │   └── loader.ts           # 配置文件解析加载器
│   ├── core/
│   │   ├── fetcher.ts          # 模板拷贝与拉取引擎
│   │   ├── transformer.ts      # 文本替换与文件目录重构引擎
│   │   └── runner.ts           # 跨平台命令执行器 (FVM/Flutter/NPM)
│   ├── presets/
│   │   ├── types.ts            # Preset 模板规范接口
│   │   └── flutter.preset.ts   # Flutter 专属转换逻辑
│   └── prompts/
│       └── wizard.ts           # 命令行交互式问答流程
├── docs/                       # 架构规范与开发文档
├── factory.config.yaml         # 全局模板注册表
├── README.md
├── package.json
└── tsconfig.json
```

---

## 🚀 快速上手

### 1. 安装与构建

```bash
# 安装依赖
pnpm install

# 构建脚手架
pnpm build

# 本地链接为全局命令 (可选)
npm link
```

### 2. 查看已注册模板

```bash
app-factory list
```

### 3. 创建新 App

#### 交互式创建：
```bash
app-factory create my_new_app
```

#### 配置文件快速创建：
准备好 `app.config.yaml`：
```yaml
template: "flutter"
app:
  name: "闪记笔记"
  packageName: "quick_note"
  bundleId: "com.yuyqk.quicknote"
  version: "1.0.0"
  buildNumber: 1
```

执行生成：
```bash
app-factory create my_new_app --config app.config.yaml
```

---

## ⚙️ 配置文件说明

### 全局模板注册表 (`factory.config.yaml`)
```yaml
version: "1.0.0"
templates:
  flutter:
    name: "Flutter Standard Shell"
    description: "基于 Material 3 + Riverpod + packages/app_foundation 的 Flutter 标准底座"
    type: "flutter"
    source: "../app_flutter_common" # 本地相对路径或 Git URL
    branch: "main"
```

### 单项目配置 (`app.config.yaml`)
```yaml
template: "flutter"
app:
  name: "应用展示名称"
  packageName: "package_name"        # 小写下划线标识
  bundleId: "com.example.app"        # 移动端包名
  version: "1.0.0"
  buildNumber: 1

environments:
  dev:
    apiBaseUrl: "https://dev-api.example.com"
  prod:
    apiBaseUrl: "https://api.example.com"
```

---

## 📄 许可与协议

MIT License.
