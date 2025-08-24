## これはなに

Vibe Codingを用いて特定の組織についてのクイズを生成→回答して遊べるものを作るリポジトリ

Claude Codeで全体的にいい感じに作る。

## 全体像

### データ抽出

以下が実行できるスクリプトを用意して、都度実行する。対話的にカテゴリを選んだら自動でAIが持ってくるスタイル

1. [OpenAI API Web search](https://platform.openai.com/docs/guides/tools-web-search?api-mode=responses)でクイズのデータ元を検索して持ってくる
2. 指定したカテゴリの中に.mdファイルを作る
3. 気になるなら目で確認

#### 抽出カテゴリ

大分類カテゴリ→中分類カテゴリの2階層つくり、それをベースに出題します。(2階層は必ずknowledge_baseフォルダの下に作ってください)

`knowledge_base`下にカテゴリのフォルダを作成するとそれがクイズ生成する時のカテゴリ選択肢として選べます。カテゴリ名はフォルダ名。


### クイズ生成

データ抽出して`md`ファイルが存在するカテゴリだけをピックして、カテゴリの選択肢が出てくるのでそれを選ぶとOpenAI APIによる文書ベースのクイズが作られる

1回の挑戦で5問出てきて、全部4択問題。回答した結果は履歴として残る

カテゴリ選択は「全て」も可能

#### 生成フロー

1. 指定されたカテゴリのフォルダ下にある.mdファイルをランダムに5回読み取る(1つしかない場合はその1つの文書から5回とも読まれる)
2. 読み取った結果から都度クイズを出題する。
3. 互いのクイズが被らないという保証はない。

## 実行方法

### 1. データ抽出（Python）

```bash
# 環境セットアップ
uv sync

# 環境変数設定
cp .env.example .env
# .envファイルでOPENAI_API_KEYとCOMPANY_NAME(オプション)を設定

# データ抽出実行
python extract.py
```

### 2. クイズアプリ（Next.js）

```bash
cd quiz-frontend

# 依存関係インストール
bun install

# 環境変数設定
# .env.localファイルでOPENAI_API_KEYを設定

# 開発サーバー起動
bun run dev
```

ブラウザで http://localhost:3000 にアクセスしてクイズアプリを使用できます。

### 3. 本番デプロイ

```bash
cd quiz-frontend
bun run build
bun start
# またはVercel/Netlifyにデプロイ
```
