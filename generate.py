import argparse
import json
import os
from datetime import datetime
from pathlib import Path
from typing import List

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv('.env')
client = OpenAI(
    api_key=os.getenv('OPENAI_API_KEY')
)

def get_existing_companies() -> List[str]:
    """knowledge_base下に存在する会社一覧を取得"""
    knowledge_base_path = Path("knowledge_base")
    if not knowledge_base_path.exists():
        return []
    
    companies = [f.name for f in knowledge_base_path.iterdir() if f.is_dir()]
    return sorted(companies)

def select_company() -> str:
    """対話的に会社を選択"""
    companies = get_existing_companies()
    if not companies:
        raise ValueError("knowledge_base下に会社フォルダが見つかりません。先にextract.pyを実行してください。")
    
    print("\n利用可能な会社一覧:")
    for i, company in enumerate(companies, 1):
        print(f"{i}. {company}")
    
    while True:
        try:
            choice = int(input("\nクイズを生成する会社を選択してください (番号を入力): "))
            if 1 <= choice <= len(companies):
                return companies[choice - 1]
            print("有効な番号を入力してください")
        except ValueError:
            print("数値を入力してください")

def get_existing_categories(company: str) -> List[str]:
    """指定会社の既存カテゴリ一覧を取得"""
    company_path = Path("knowledge_base") / company
    categories = [f.name for f in company_path.iterdir() if f.is_dir()]
    return sorted(categories)

def select_category(company: str) -> str:
    """対話的にカテゴリを選択"""
    categories = get_existing_categories(company)
    if not categories:
        raise ValueError(f"会社 '{company}' にカテゴリが見つかりません")
    
    print(f"\n{company}の利用可能なカテゴリ:")
    for i, category in enumerate(categories, 1):
        print(f"{i}. {category}")
    
    while True:
        try:
            choice = int(input("\nカテゴリを選択してください (番号を入力): "))
            if 1 <= choice <= len(categories):
                return categories[choice - 1]
            print("有効な番号を入力してください")
        except ValueError:
            print("数値を入力してください")

def get_existing_subcategories(company: str, category: str) -> List[str]:
    """指定会社・カテゴリの既存サブカテゴリ一覧を取得（.mdファイルが存在するもののみ）"""
    category_path = Path("knowledge_base") / company / category
    subcategories_with_data = []
    
    for subcategory_path in category_path.iterdir():
        if subcategory_path.is_dir():
            # サブカテゴリに.mdファイルが存在するかチェック
            md_files = list(subcategory_path.glob("*.md"))
            if md_files:
                subcategories_with_data.append(subcategory_path.name)
    
    return sorted(subcategories_with_data)

def select_subcategory(company: str, category: str) -> str:
    """対話的にサブカテゴリを選択"""
    subcategories = get_existing_subcategories(company, category)
    if not subcategories:
        raise ValueError(f"'{company}/{category}' にデータが存在するサブカテゴリが見つかりません")
    
    print(f"\n{company}/{category}の利用可能なサブカテゴリ:")
    for i, subcategory in enumerate(subcategories, 1):
        print(f"{i}. {subcategory}")
    
    while True:
        try:
            choice = int(input("\nサブカテゴリを選択してください (番号を入力): "))
            if 1 <= choice <= len(subcategories):
                return subcategories[choice - 1]
            print("有効な番号を入力してください")
        except ValueError:
            print("数値を入力してください")

def get_md_files(company: str, category: str, subcategory: str) -> List[Path]:
    """指定パスの.mdファイル一覧を取得"""
    subcategory_path = Path("knowledge_base") / company / category / subcategory
    md_files = list(subcategory_path.glob("*.md"))
    return sorted(md_files, key=lambda x: x.stat().st_mtime, reverse=True)

def select_md_file(company: str, category: str, subcategory: str) -> Path:
    """対話的に.mdファイルを選択"""
    md_files = get_md_files(company, category, subcategory)
    if not md_files:
        raise ValueError(f"'{company}/{category}/{subcategory}' に.mdファイルが見つかりません")
    
    print(f"\n{company}/{category}/{subcategory}の利用可能なファイル:")
    for i, file_path in enumerate(md_files, 1):
        # ファイルの作成日時を表示
        mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
        print(f"{i}. {file_path.name} (作成: {mtime.strftime('%Y-%m-%d %H:%M:%S')})")
    
    while True:
        try:
            choice = int(input("\nクイズ生成に使用するファイルを選択してください (番号を入力): "))
            if 1 <= choice <= len(md_files):
                return md_files[choice - 1]
            print("有効な番号を入力してください")
        except ValueError:
            print("数値を入力してください")

def generate_quiz_with_openai(content: str) -> dict:
    """OpenAI GPT-5を使用してクイズを生成"""
    prompt = """あなたはクイズ生成の専門家です。与えられた文書から4択クイズを5問作成してください。

以下のJSON形式で返答してください：
{
  "questions": [
    {
      "question": "質問文1",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correct": 0,
      "sourceUrl": "参考にした情報源のURL（文書内に記載されている場合のみ）"
    },
    {
      "question": "質問文2",
      "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
      "correct": 1,
      "sourceUrl": "参考にした情報源のURL（文書内に記載されている場合のみ）"
    }
    // ... 5問分
  ]
}

- correctは正解の選択肢のインデックス（0-3）です
- 文書の異なる部分から5問作成してください
- 難易度は適度にしてください
- sourceUrlは文書内にURLが記載されている場合のみ含めてください
- URLが見つからない場合は空文字列""にしてください

以下の文書から5問のクイズを作成してください：

""" + content

    try:
        response = client.responses.create(
            model="gpt-5",
            input=prompt,
        )
        
        quiz_data = response.output_text
        if not quiz_data:
            raise Exception("OpenAIからの応答が空です")
        
        # JSON形式で解析
        quiz_json = json.loads(quiz_data)
        return quiz_json
        
    except json.JSONDecodeError as e:
        raise Exception(f"JSONの解析に失敗しました: {e}")
    except Exception as e:
        raise Exception(f"OpenAI API呼び出しエラー: {e}")

def create_quiz_directory(company: str, category: str, subcategory: str) -> Path:
    """quizzesフォルダ下に階層構造を作成"""
    quiz_path = Path("quizzes") / company / category / subcategory
    quiz_path.mkdir(parents=True, exist_ok=True)
    return quiz_path

def save_quiz_json(quiz_data: dict, company: str, category: str, subcategory: str, source_file: str) -> Path:
    """クイズデータをJSONファイルとして保存"""
    quiz_dir = create_quiz_directory(company, category, subcategory)
    
    # タイムスタンプファイル名を生成
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{timestamp}.json"
    file_path = quiz_dir / filename
    
    # メタデータを追加
    quiz_with_metadata = {
        "metadata": {
            "company": company,
            "category": category,
            "subcategory": subcategory,
            "source_file": source_file,
            "generated_at": datetime.now().isoformat(),
            "generator": "generate.py"
        },
        **quiz_data
    }
    
    # JSONファイルに保存
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(quiz_with_metadata, f, ensure_ascii=False, indent=2)
    
    return file_path

def main():
    """メイン処理"""
    parser = argparse.ArgumentParser(description='クイズ生成ツール')
    parser.add_argument('--company', help='会社名を指定')
    parser.add_argument('--category', help='カテゴリを指定')
    parser.add_argument('--subcategory', help='サブカテゴリを指定')
    parser.add_argument('--file', help='ファイル名を指定')
    args = parser.parse_args()

    try:
        print("クイズ生成ツール")
        print("=" * 50)

        # 引数モード vs 対話モード
        if args.company and args.category and args.subcategory:
            # 引数モード（部分的な引数も許可）
            print("引数モードで実行します")
            company = args.company
            category = args.category
            subcategory = args.subcategory
            
            # 存在チェック
            if company not in get_existing_companies():
                print(f"エラー: 会社 '{company}' が見つかりません")
                return
            
            if category not in get_existing_categories(company):
                print(f"エラー: カテゴリ '{category}' が見つかりません")
                return
            
            if subcategory not in get_existing_subcategories(company, category):
                print(f"エラー: サブカテゴリ '{subcategory}' にデータが見つかりません")
                return
            
            # ファイル選択
            if args.file:
                file_path = Path("knowledge_base") / company / category / subcategory / args.file
                if not file_path.exists():
                    print(f"エラー: ファイル '{args.file}' が見つかりません")
                    return
            else:
                md_files = get_md_files(company, category, subcategory)
                if not md_files:
                    print(f"エラー: '{company}/{category}/{subcategory}' に.mdファイルが見つかりません")
                    return
                file_path = md_files[0]  # 最新のファイルを使用
                
        else:
            # 対話モード
            print("対話モードで実行します")
            
            # 1. 会社選択
            company = select_company()
            
            # 2. カテゴリ選択
            category = select_category(company)
            
            # 3. サブカテゴリ選択
            subcategory = select_subcategory(company, category)
            
            # 4. ファイル選択
            file_path = select_md_file(company, category, subcategory)

        print(f"\nクイズ生成開始: {company}/{category}/{subcategory}")
        print(f"使用ファイル: {file_path.name}")
        print("OpenAI APIでクイズを生成中...")

        # ファイル内容を読み取り
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # クイズ生成
        quiz_data = generate_quiz_with_openai(content)

        # JSONファイルとして保存
        output_path = save_quiz_json(quiz_data, company, category, subcategory, file_path.name)

        print(f"\n完了！")
        print(f"クイズは以下のファイルに保存されました: {output_path}")
        print(f"生成されたクイズ数: {len(quiz_data.get('questions', []))}問")

    except KeyboardInterrupt:
        print("\n\n処理が中断されました")
    except Exception as e:
        print(f"\nエラーが発生しました: {e}")

if __name__ == "__main__":
    main()