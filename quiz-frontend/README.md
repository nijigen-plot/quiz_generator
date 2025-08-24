# 企業クイズアプリ

このプロジェクトは、OpenAI APIを使用してknowledge_baseフォルダの企業情報から4択クイズを生成するNext.js + TypeScriptアプリケーションです。

## 環境構築手順

### 1. プロジェクト作成
```bash
# Bunでプロジェクト作成
bun create next-app quiz-frontend --typescript
cd quiz-frontend

# Tailwind CSS使用: Yes
# src/ディレクトリ使用: No  
# App Router使用: Yes
# その他設定: デフォルト
```

### 2. 依存関係追加
```bash
# OpenAI APIライブラリを追加
bun add openai
```

### 3. 環境変数設定
```bash
# 環境変数ファイル作成
cp ../.env .env.local

# または直接作成
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local
```

## 開発サーバー起動

```bash
bun run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてクイズアプリを使用できます。

## アプリ機能

1. **カテゴリ選択**: knowledge_baseフォルダの階層からカテゴリとサブカテゴリを選択
2. **クイズ生成**: 選択したカテゴリの.mdファイルからOpenAI APIが4択クイズを生成
3. **5問出題**: 1回の挑戦で5問のクイズが出題
4. **結果表示**: 正解率と各問題の詳細結果を表示

## API エンドポイント

- `GET /api/categories` - 利用可能なカテゴリ一覧を取得
- `POST /api/quiz` - 指定カテゴリからクイズ問題を生成

## 本番デプロイ

```bash
# ビルド
bun run build

# 本番サーバー起動
bun start

# またはVercel/Netlifyにデプロイ
```

## 必要な環境

- Node.js 18.0+
- Bun (推奨) または npm/yarn/pnpm
- OpenAI API キー
- 親ディレクトリにknowledge_baseフォルダとデータ(.mdファイル)が必要
