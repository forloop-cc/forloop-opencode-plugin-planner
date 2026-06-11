<div align="center">

<img src="docs/images/forloop-opencode-header.png" alt="ForLoop Plugin for opencode" width="800">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Stars](https://img.shields.io/github/stars/forloop-cc/forloop-opencode-plugin-planner?style=flat-square)](https://github.com/forloop-cc/forloop-opencode-plugin-planner/stargazers)

**opencodeのためのAI駆動のスプリント計画、ストーリー管理、タスク自動化**

[English](README.md) · [中文](README_zh.md) · [日本語](README_ja.md)

[クイックインストール](#クイックインストール) · [仕組み](#仕組み) · [機能](#機能) · [よくある質問](#よくある質問)

</div>

***

## これは何ですか？

**ForLoopプラグイン**は、[opencode](https://opencode.ai) AIエージェントをあなたの[ForLoop](https://forloop.cc)ワークスペースに接続します。必要なことを自然言語で説明するだけで、エージェントが自動的に計画し、ストーリーを作成し、工数を見積もり、進捗を追跡します。コマンドを覚える必要はありません。

***

## ForLoopについて

[ForLoop](https://forloop.cc)は、自律的な開発とデプロイのための**AIエージェントプラットフォーム**です。チームの司令塔と考えてください——AIエージェントと人間がスプリント、ストーリー、コードの出荷について協力する共有スペースです。

**主な機能：**

- **AIエージェントをチームメンバーとして**——専門化されたエージェントが計画、コーディング、レビュー、デプロイを行います。実際のブランチ、コミット、プルリクエストを作成します。
- **スプリントボード**——リアルタイムコラボレーション、AI見積もり、進捗追跡を備えたドラッグ＆ドロップのストーリー管理
- **自動運転開発**——エージェントがスプリントボードを自動的に処理し、各チェックポイントでレビューと承認を行います
- **スペース**——Zoom会議、AI文字起こし、検索可能な組織横断ナレッジベースを統合した共有ワークスペース
- **ヒューマンインザループの安全性**——すべてのAI提案の変更はレビューを経ます。承認なしでは何もリリースされません。

**このプラグイン**は、コラボレーション機能——スプリント計画、ストーリー管理、ファイルアップロード、チーム調整——をopencode IDEに直接提供します。

***

## クイックインストール

```bash
curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/install.sh | bash
```

インストーラーはプラグインをクローンし、依存関係をインストールし、opencodeを設定します。macOS、Linux、Windows（Git Bash）で動作します。

**インストールオプション：**

```bash
curl -fsSL .../install.sh | bash              # 対話型（デフォルトはローカル）
curl -fsSL .../install.sh | bash -s -- -g     # グローバル（~/.config/opencode/）
curl -fsSL .../install.sh | bash -s -- -g -n  # npmパッケージ経由でグローバル
```
opencodeは起動時にプラグインをダウンロードしてキャッシュします——手動でのgit cloneやnpm installは不要です。

**後で更新：**

```bash
curl -fsSL https://raw.githubusercontent.com/forloop-cc/forloop-opencode-plugin-planner/main/update.sh | bash
```

### 前提条件

- [opencode](https://opencode.ai) CLIがインストールされていること
- [ForLoop](https://forloop.cc)アカウントとAPIトークン（[こちらで作成](https://forloop.cc/profile?tab=api-tokens)）
- トークンのスコープ：`sprint:read`、`sprint:write`、`story:read`、`story:write`、`agent:query`、`profile:read`

### クイックスタート

```bash
opencode --agent forLoopPlanner
```

または、通常通りopencodeを起動し、**Tab**キーを押してエージェントピッカーから**ForLoop Planner**エージェントに切り替えます。

`forLoopPlanner`エージェントは、プラグインの組み込みツールを使用してフル機能のスプリント、ストーリー、ファイル管理を行います。opencodeプラグインがインストールされていない環境では、スタンドアロンの`forloop` CLIバイナリで動作する`forLoopPlannerCLI`を使用します。

### トークンの設定

**最も簡単な方法——エージェントに依頼する：**
```
"ForLoop Planner, please set my API token"
```
エージェントが設定を案内します。

**手動設定：**
`~/.config/forloop/tokens.json`を作成：
```json
{
  "default": "floop_your_token_here",
  "lastUpdated": "2026-01-01T00:00:00.000Z"
}
```
トークンファイルは`~/.config/forloop/tokens.json`に制限付きパーミッションで保存されます。いつでも編集または置き換えてトークンをローテーションできます。

***

## 仕組み

<img src="docs/images/forloop-opencode-flow.png" alt="ForLoop Plugin workflow" width="800">

1. **あなたが**必要なことを自然言語で説明します
2. **エージェントが**適切なスキルとツールを自動的に選択します
3. **プラグインが**APIトークンを介してForLoopワークスペースに接続します
4. **結果が**返ってきます——スプリントが計画され、ストーリーが作成され、タスクが追跡されます

***

## エージェントに依頼できること

### スプリント計画

| エージェントができること | こう言ってみてください |
|------------------------|----------------------|
| 日付と目標を含むスプリントの作成と設定 | *"来週の月曜日から2週間のスプリント15をセットアップして"* |
| スプリントのステータスと進捗の確認 | *"スプリント14の状況は？すべてのストーリーを見せて"* |
| 期間中のスプリント詳細の更新 | *"スプリント14をもう1週間延長して"* |

### ストーリー管理

| エージェントができること | こう言ってみてください |
|------------------------|----------------------|
| テンプレートまたはスクラッチからストーリーを作成 | *"ユーザー認証を追加するストーリーを作成して"* |
| 大きなストーリーをタスクに分解 | *"ストーリー78をより小さなタスクに分解して"* |
| ストーリーのステータス、優先度、ポイントを更新 | *"ストーリー78を完了にして、次を5ポイントと見積もって"* |
| テンプレートからストーリーを作成 | *"ログインAPIを実装するための基本タスクを開発者エージェント用に作成して"* |

### AI支援計画

| エージェントができること | こう言ってみてください |
|------------------------|----------------------|
| ストーリーの分解と実装計画の取得 | *"ストーリー78をサブタスクに分解して"* |
| ストーリーポイントの複雑さの見積もり | *"ログイン機能のポイントを見積もって"* |
| スプリントレベルの提案の取得 | *"このスプリントの残りのストーリーをどう整理するか提案して"* |
| 会話履歴の確認 | *"スプリント14について話し合った内容を見せて"* |

### ファイルとドキュメント

| エージェントができること | こう言ってみてください |
|------------------------|----------------------|
| スプリントストレージにファイルをアップロード | *"requirements.pdfをスプリント14にアップロードして"* |
| スプリントファイルの一覧と管理 | *"スプリント14のすべてのファイルを見せて"* |
| ドキュメントフォルダの作成 | *"スプリント15用のドキュメントフォルダを作成して"* |
| ファイルのダウンロード | *"アーキテクチャ図のダウンロードリンクを取得して"* |

### チームと組織

| エージェントができること | こう言ってみてください |
|------------------------|----------------------|
| 組織メンバーの確認 | *"エンジニアリングチームのメンバーを見せて"* |
| 使用クォータの確認 | *"今月あと何ストーリー残っていますか？"* |
| チーム設定の管理 | *"デザインチームという新しい組織を作成して"* |

***

## プラグイン機能

プラグインはopencodeエージェントに以下のツールを提供します。エージェントはこれらを自動的に使用します——直接呼び出す必要はありません。エージェントの定義とスキルについては、[forloop-agents-skills](https://github.com/forloop-cc/forloop-agents-skills)リポジトリを参照してください。

**スプリント管理**——完全なメタデータ付きでスプリントの作成、更新、一覧表示、削除\
**ストーリー操作**——テンプレートサポート、優先度、ポイントを含む完全なCRUD\
**AIエージェントツール**——ストーリー分解、ポイント見積もり、スプリント提案、会話履歴\
**ファイル管理**——S3バックアップのアップロード、ダウンロード、一覧表示、ドキュメントフォルダ\
**組織管理**——チーム、メンバーシップ、クォータ追跡\
**スケジューリング**——ビデオリンク付きスプリント会議の作成と管理

***

## エージェントとスキル

エージェントとスキルは別のリポジトリで管理されています：**[forloop-agents-skills](https://github.com/forloop-cc/forloop-agents-skills)**。インストーラー（上記）が自動的にセットアップします。手動セットアップの場合：

```bash
git clone https://github.com/forloop-cc/forloop-agents-skills.git ~/.config/forloop/agents-skills
ln -sf ~/.config/forloop/agents-skills/agents/*.md ~/.config/opencode/agents/
ln -sfn ~/.config/forloop/agents-skills/skills/*/ ~/.config/opencode/skills/
```

このリポジトリには3つのエージェントと16のスキルが含まれており、スプリント計画、ストーリー作成、タスク追跡、ファイル管理などをカバーしています。完全なリストについては[リポジトリのREADME](https://github.com/forloop-cc/forloop-agents-skills)を参照してください。

### 含まれるエージェント

| エージェント | 最適な用途 |
|-------------|-----------|
| **ForLoop Planner** (`@forLoopPlanner`) | スプリント計画、ストーリー作成、タスク分解、スプリントレビュー |
| **ForLoop Planner CLI** (`@ForLoopPlannerCLI`) | スタンドアロンCLIワークフロー（opencodeプラグイン不要） |
| **Story Evaluator** (`@forLoopStoryEvaluator`) | ポイント見積もり、複雑さ分析 |

***

## よくある質問

**どうやって使うの？** opencodeを起動し、ForLoop Plannerエージェントに切り替えて（TAB）、必要なことを説明するだけです。エージェントがすべてを処理します。

**opencodeって何？** 無料のオープンソースAIコーディングアシスタントです。[こちらからインストール](https://opencode.ai)。

**コマンドを覚える必要はある？** いいえ。エージェントが自動的にツールを使用します。ただ話しかけるだけです。

**トークンはどこに保存される？** `~/.config/forloop/tokens.json`に制限付きファイルパーミッションで保存されます。

**スプリントを自動検出できる？** はい——gitブランチを`sprint-XXX`と名付けるか、`FORLOOP_SPRINT_ID=14`を設定してください。

**アンインストール方法は？** `opencode.json`のplugin配列からプラグインエントリを削除します。エージェントとスキルについては、`~/.config/opencode/agents/`と`~/.config/opencode/skills/`からシンボリックリンクを削除してください。

**Windowsでも動作する？** はい——Git BashまたはWSLを使用してください。

***

## コントリビューション

IssueとPRを歓迎します。[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

***

## セキュリティ

[SECURITY.md](SECURITY.md)を参照してください。APIトークンをコミットしないでください。必要最小限のスコープを使用してください。

***

## ライセンス

MIT — [LICENSE](LICENSE)を参照してください。
