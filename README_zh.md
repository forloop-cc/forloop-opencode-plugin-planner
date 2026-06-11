<div align="center">

<img src="docs/images/forloop-opencode-header.png" alt="ForLoop Plugin for opencode" width="800">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/forloop-cc/forloop-opencode-plugin-planner?style=flat-square)](https://github.com/forloop-cc/forloop-opencode-plugin-planner/stargazers)

**为 opencode 提供 AI 驱动的 Sprint 规划、用户故事管理和任务自动化**

[English](README.md) · [中文](README_zh.md) · [日本語](README_ja.md)

[快速安装](#快速安装) · [工作原理](#工作原理) · [功能](#功能) · [常见问题](#常见问题)

</div>

***

## 这是什么？

**ForLoop 插件**将 [opencode](https://opencode.ai) AI 代理连接到您的 [ForLoop](https://forloop.cc) 工作空间。用自然语言描述您的需求——代理会自动规划、创建用户故事、估算工作量并跟踪进度。无需记忆任何命令。

***

## 关于 ForLoop

[ForLoop](https://forloop.cc) 是一个用于自主开发和部署的 **AI 代理平台**。将其视为团队的指挥中心——一个 AI 代理和人类在 Sprint、用户故事和代码交付上协作的共享空间。

**主要功能：**

- **AI 代理作为团队成员**——专门的代理负责规划、编码、审查和部署。它们创建真实的分支、提交和 Pull Request。
- **Sprint 看板**——拖拽式用户故事管理，支持实时协作、AI 估算和进度跟踪。
- **自动驾驶开发**——代理自动处理您的 Sprint 看板，每个检查点都有您审查和批准。
- **空间（Spaces）**——共享工作区，集成 Zoom 会议、AI 转录和可搜索的跨组织知识库。
- **人在环安全机制**——所有 AI 提出的更改都经过审查。未经您的批准，不会发布任何内容。

**此插件**将协作功能——Sprint 规划、用户故事管理、文件上传和团队协调——直接带给您的 opencode IDE。

***

## 快速安装

```bash
curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/install.sh | bash
```

安装程序会克隆插件、安装依赖项并配置 opencode。支持 macOS、Linux 和 Windows（Git Bash）。

**安装选项：**

```bash
curl -fsSL .../install.sh | bash              # 交互式（默认本地安装）
curl -fsSL .../install.sh | bash -s -- -g     # 全局安装（~/.config/opencode/）
curl -fsSL .../install.sh | bash -s -- -g -n  # 通过 npm 包全局安装
```
opencode 在启动时下载并缓存插件——无需手动 git clone 或 npm install。

**后续更新：**

```bash
curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/update.sh | bash
```

### 前提条件

- 已安装 [opencode](https://opencode.ai) CLI
- 拥有 [ForLoop](https://forloop.cc) 账户和 API 令牌（[在此创建](https://forloop.cc/profile?tab=api-tokens)）
- 令牌权限范围：`sprint:read`、`sprint:write`、`story:read`、`story:write`、`agent:query`、`profile:read`

### 快速开始

```bash
opencode --agent forLoopPlanner
```

或者正常启动 opencode，按 **Tab** 键从代理选择器切换到 **ForLoop Planner** 代理。

`forLoopPlanner` 代理使用插件的内置工具进行完整的 Sprint、用户故事和文件管理。对于未安装 opencode 插件的环境，可以使用 `forLoopPlannerCLI`，它通过独立的 `forloop` CLI 二进制文件工作。

### 设置令牌

**最简单的方式——直接告诉代理：**
```
"ForLoop Planner, please set my API token"
```
代理会引导您完成设置。

**手动设置：**
创建 `~/.config/forloop/tokens.json`：
```json
{
  "default": "floop_your_token_here",
  "lastUpdated": "2026-01-01T00:00:00.000Z"
}
```
令牌文件存储在 `~/.config/forloop/tokens.json`，权限受限。可随时编辑或替换以轮换令牌。

***

## 工作原理

<img src="docs/images/forloop-opencode-flow.png" alt="ForLoop Plugin workflow" width="800">

1. **您用自然语言描述**需求
2. **代理**自动选择合适的技能和工具
3. **插件**通过您的 API 令牌连接到 ForLoop 工作空间
4. **结果**返回——Sprint 已规划，用户故事已创建，任务已跟踪

***

## 您可以要求代理做什么

### Sprint 规划

| 代理可以... | 试试说... |
|------------|----------|
| 创建和配置带有日期和目标的 Sprint | *"设置第 15 个 Sprint，从下周一开始，为期两周"* |
| 查看 Sprint 状态和进度 | *"第 14 个 Sprint 进展如何？显示所有用户故事"* |
| 在周期中更新 Sprint 详情 | *"将第 14 个 Sprint 再延长一周"* |

### 用户故事管理

| 代理可以... | 试试说... |
|------------|----------|
| 从零或模板创建用户故事 | *"创建一个关于添加用户认证的用户故事"* |
| 将大型用户故事分解为任务 | *"将第 78 号用户故事分解为更小的任务"* |
| 更新用户故事状态、优先级、点数 | *"将第 78 号用户故事标记为完成，并将下一个估算为 5 点"* |
| 从模板创建用户故事 | *"为开发者代理创建一个基本任务来实现登录 API"* |

### AI 辅助规划

| 代理可以... | 试试说... |
|------------|----------|
| 获取用户故事分解和实现计划 | *"将第 78 号用户故事分解为子任务"* |
| 估算用户故事复杂度 | *"估算我的登录功能的点数"* |
| 获取 Sprint 级别的建议 | *"建议如何组织此 Sprint 剩余的用户故事"* |
| 查看对话历史 | *"显示我们关于第 14 个 Sprint 的讨论内容"* |

### 文件与文档

| 代理可以... | 试试说... |
|------------|----------|
| 上传文件到 Sprint 存储 | *"上传 requirements.pdf 到第 14 个 Sprint"* |
| 列出和管理 Sprint 文件 | *"显示第 14 个 Sprint 中的所有文件"* |
| 创建文档文件夹 | *"为第 15 个 Sprint 创建一个文档文件夹"* |
| 下载文件 | *"给我架构图的下载链接"* |

### 团队与组织

| 代理可以... | 试试说... |
|------------|----------|
| 查看组织成员 | *"显示工程团队中有谁"* |
| 检查使用配额 | *"本月我们还剩多少个用户故事配额？"* |
| 管理团队设置 | *"创建一个名为设计团队的新组织"* |

***

## 插件功能

插件为 opencode 代理提供以下工具。代理会自动使用它们——您无需直接调用。关于代理定义和技能，请参见 [forloop-agents-skills](https://github.com/forloop-cc/forloop-agents-skills) 仓库。

**Sprint 管理**——创建、更新、列出和删除 Sprint，包含完整元数据\
**用户故事操作**——完整的 CRUD 操作，支持模板、优先级和点数\
**AI 代理工具**——用户故事分解、点数估算、Sprint 建议、对话历史\
**文件管理**——基于 S3 的上传、下载、列表和文档文件夹\
**组织管理**——团队、成员资格和配额跟踪\
**日程安排**——创建和管理带视频链接的 Sprint 会议

***

## 代理与技能

代理和技能在单独的仓库中维护：**[forloop-agents-skills](https://github.com/forloop-cc/forloop-agents-skills)**。安装程序（见上文）会自动设置它们。如需手动设置：

```bash
git clone https://github.com/forloop-cc/forloop-agents-skills.git ~/.config/forloop/agents-skills
ln -sf ~/.config/forloop/agents-skills/agents/*.md ~/.config/opencode/agents/
ln -sfn ~/.config/forloop/agents-skills/skills/*/ ~/.config/opencode/skills/
```

该仓库包含 3 个代理和 16 个技能，涵盖 Sprint 规划、用户故事创建、任务跟踪、文件管理等。完整列表请参见[仓库 README](https://github.com/forloop-cc/forloop-agents-skills)。

### 包含的代理

| 代理 | 最适合... |
|------|----------|
| **ForLoop Planner** (`@forLoopPlanner`) | Sprint 规划、用户故事创建、任务分解、Sprint 审查 |
| **ForLoop Planner CLI** (`@ForLoopPlannerCLI`) | 独立 CLI 工作流（无需 opencode 插件） |
| **Story Evaluator** (`@forLoopStoryEvaluator`) | 点数估算、复杂度分析 |

***

## 常见问题

**如何使用？** 启动 opencode，切换到 ForLoop Planner 代理（TAB），描述您的需求。代理会处理一切。

**什么是 opencode？** 一个免费、开源的 AI 编码助手。[在此安装](https://opencode.ai)。

**我需要记忆命令吗？** 不需要。代理会自动使用工具。直接与它们对话即可。

**我的令牌存储在哪里？** `~/.config/forloop/tokens.json`，文件权限受限。

**可以自动检测我的 Sprint 吗？** 可以——将您的 git 分支命名为 `sprint-XXX` 或设置 `FORLOOP_SPRINT_ID=14`。

**如何卸载？** 从 `opencode.json` 的 plugin 数组中移除插件条目。对于代理和技能，删除 `~/.config/opencode/agents/` 和 `~/.config/opencode/skills/` 中的符号链接。

**支持 Windows 吗？** 支持——使用 Git Bash 或 WSL。

***

## 贡献

欢迎提交 Issue 和 PR。请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

***

## 安全

请参阅 [SECURITY.md](SECURITY.md)。切勿提交 API 令牌。使用所需的最低权限范围。

***

## 许可证

MIT — 请参阅 [LICENSE](LICENSE)。
