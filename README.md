# GitHub to Notion Migration Tool

GitHubプロジェクト（新しいProjects V2）をNotionデータベースに移行するツールです。

[English](#english) | [日本語](#japanese)

<a name="japanese"></a>
## 日本語

### 概要

このツールは、GitHub Projects V2のデータをNotionデータベースに移行します。以下の機能をサポートしています：

- 組織プロジェクトとリポジトリプロジェクトの両方に対応
- カスタムフィールド（Status、Priority、Size等）の移行
- イシュー、プルリクエスト、ドラフトイシューの移行
- コメントの保持
- ラベルの移行
- 作成日時・更新日時の保持
- リトライ機能とエラーハンドリング

### 必要なもの

- Node.js (v18以上推奨)
- GitHubのPersonal Access Token
- NotionのIntegration Token
- 移行先のNotionデータベース

### セットアップ

#### 1. 依存関係のインストール

```bash
npm install
```

#### 2. GitHub Personal Access Tokenの取得

1. GitHubの Settings > Developer settings > Personal access tokens へアクセス
2. "Generate new token" をクリック
3. 以下のスコープを選択:
   - `read:project` - プロジェクトの読み取り
   - `repo` - リポジトリへのアクセス（プライベートリポジトリの場合）
4. トークンを生成し、安全に保存

#### 3. Notion Integration Tokenの取得

1. https://www.notion.so/my-integrations へアクセス
2. "New integration" をクリックして新しいインテグレーションを作成
3. Integration tokenをコピー
4. Notionの移行先データベースページで、右上の「...」メニューから「Add connections」でインテグレーションを追加

#### 4. 環境変数の設定

```bash
export GITHUB_TOKEN=your_github_personal_access_token
export NOTION_TOKEN=your_notion_integration_token
```

### 使い方

#### 方法1: 簡単な移行スクリプトを使用

```bash
./migrate-to-notion.sh <github-project-url> <notion-database-id> <status-field> <label-field> [imported-field]
```

例：
```bash
./migrate-to-notion.sh https://github.com/orgs/myorg/projects/1 abc123def456 Status Labels Imported
```

#### 方法2: 手動での実行

##### 1. Notionデータベースの確認

利用可能なNotionデータベースを一覧表示：

```bash
node list-notion-databases.js
```

特定のデータベースの構造を確認：

```bash
node retrieve-notion-database.js <database-id>
```

##### 2. Notionデータベースのプロパティを自動作成

GitHubプロジェクトの標準的なフィールドに対応するプロパティを作成：

```bash
node create-notion-properties.js <database-id>
```

作成されるプロパティ：
- Status (セレクト)
- Priority (セレクト)
- Size (セレクト)
- Assignees (ユーザー)
- リリース期日 (日付)
- デザイン期日 (日付)
- Labels (マルチセレクト)
- GitHub URL (URL)
- GitHub作成日 (日付)
- GitHub更新日 (日付)

##### 3. GitHubプロジェクトのエクスポート

```bash
node dump-github-project.js <github-project-url> > project.json
```

対応URL形式：
- 組織のプロジェクト: `https://github.com/orgs/{org-name}/projects/{number}`
- リポジトリのプロジェクト: `https://github.com/{owner}/{repo}/projects/{number}`

##### 4. Notionへのインポート

```bash
node import-to-notion-v2.js project.json <database-id> [--clear]
```

オプション：
- `--clear`: 既存のページをアーカイブしてからインポート

##### 5. 途中から再開する場合

```bash
node import-to-notion-resume.js project.json <database-id> <start-index>
```

### Notionデータベースの準備

移行先のNotionデータベースには以下のプロパティが必要です（`create-notion-properties.js`で自動作成可能）：

1. **タイトル** - 自動的に検出されます
2. **Status** (セレクト) - GitHubプロジェクトのステータス
3. **Priority** (セレクト) - 優先度
4. **Size** (セレクト) - タスクサイズ
5. **Assignees** (ユーザー) - 担当者
6. **リリース期日** (日付) - リリース予定日
7. **デザイン期日** (日付) - デザイン期限
8. **Labels** (マルチセレクト) - GitHubのラベル
9. **GitHub URL** (URL) - 元のGitHubイシューへのリンク
10. **GitHub作成日** (日付) - GitHubでの作成日時
11. **GitHub更新日** (日付) - GitHubでの最終更新日時

### トラブルシューティング

#### "Project not found" エラー
- GitHubトークンが正しく設定されているか確認
- プロジェクトへのアクセス権限があるか確認
- URLが正しい形式か確認

#### Notion APIエラー
- Notionトークンが正しく設定されているか確認
- データベースにインテグレーションが追加されているか確認
- フィールド名が正確に一致しているか確認（大文字小文字も含む）

#### マークダウン変換エラー
- 一部の複雑なマークダウン構造はNotionブロックに変換できない場合があります
- 失敗したアイテムは`failed-items.json`に記録されます

### 注意事項

- 大量のアイテムをインポートする場合、Notion APIのレート制限により時間がかかることがあります
- インポートは追加のみで、既存のページは更新されません
- 再実行する場合は、`--clear`オプションを使用するか、Notion側で既存のページを削除してください
- システムフィールド（created_time、last_edited_time）は直接設定できないため、カスタムの日付フィールドを使用します

<a name="english"></a>
## English

### Overview

This tool migrates GitHub Projects V2 data to Notion databases. It supports:

- Both organization and repository projects
- Custom fields (Status, Priority, Size, etc.)
- Issues, Pull Requests, and Draft Issues
- Comment preservation
- Label migration
- Creation/update timestamp preservation
- Retry functionality and error handling

### Requirements

- Node.js (v18+ recommended)
- GitHub Personal Access Token
- Notion Integration Token
- Target Notion database

### Setup

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Get GitHub Personal Access Token

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Click "Generate new token"
3. Select the following scopes:
   - `read:project` - Read project data
   - `repo` - Repository access (for private repos)
4. Generate and securely save the token

#### 3. Get Notion Integration Token

1. Visit https://www.notion.so/my-integrations
2. Click "New integration" to create a new integration
3. Copy the Integration token
4. In your target Notion database page, click "..." menu > "Add connections" and add your integration

#### 4. Set Environment Variables

```bash
export GITHUB_TOKEN=your_github_personal_access_token
export NOTION_TOKEN=your_notion_integration_token
```

### Usage

#### Method 1: Using the Migration Script

```bash
./migrate-to-notion.sh <github-project-url> <notion-database-id> <status-field> <label-field> [imported-field]
```

Example:
```bash
./migrate-to-notion.sh https://github.com/orgs/myorg/projects/1 abc123def456 Status Labels Imported
```

#### Method 2: Manual Execution

##### 1. Check Notion Databases

List available Notion databases:

```bash
node list-notion-databases.js
```

Check database structure:

```bash
node retrieve-notion-database.js <database-id>
```

##### 2. Create Notion Database Properties

Automatically create properties for standard GitHub project fields:

```bash
node create-notion-properties.js <database-id>
```

Creates the following properties:
- Status (select)
- Priority (select)
- Size (select)
- Assignees (people)
- Release Date (date)
- Design Date (date)
- Labels (multi-select)
- GitHub URL (url)
- GitHub Created (date)
- GitHub Updated (date)

##### 3. Export GitHub Project

```bash
node dump-github-project.js <github-project-url> > project.json
```

Supported URL formats:
- Organization projects: `https://github.com/orgs/{org-name}/projects/{number}`
- Repository projects: `https://github.com/{owner}/{repo}/projects/{number}`

##### 4. Import to Notion

```bash
node import-to-notion-v2.js project.json <database-id> [--clear]
```

Options:
- `--clear`: Archive existing pages before import

##### 5. Resume from Interruption

```bash
node import-to-notion-resume.js project.json <database-id> <start-index>
```

### Troubleshooting

#### "Project not found" Error
- Verify GitHub token is correctly set
- Check project access permissions
- Confirm URL format is correct

#### Notion API Errors
- Verify Notion token is correctly set
- Ensure integration is added to the database
- Check field names match exactly (including case)

#### Markdown Conversion Errors
- Some complex markdown structures may fail to convert to Notion blocks
- Failed items are recorded in `failed-items.json`

### Notes

- Large imports may take time due to Notion API rate limits
- Import only adds new pages, doesn't update existing ones
- To re-run, use `--clear` option or manually delete existing pages in Notion
- System fields (created_time, last_edited_time) cannot be set directly, so custom date fields are used

## License

MIT

## Original Project

This is a fork of [valeriangalliat/github-to-notion](https://github.com/valeriangalliat/github-to-notion), updated to support GitHub Projects V2 GraphQL API.