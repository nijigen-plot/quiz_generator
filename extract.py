import argparse
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

def get_company_name() -> str:
    """会社名を取得（環境変数から取得、なければ入力してもらう）"""
    company_name = os.getenv('COMPANY_NAME')
    if company_name:
        print(f"環境変数から会社名を取得しました: {company_name}")
        return company_name
    else:
        return input("どの会社について調べますか？: ")

def get_category_folders() -> List[str]:
    """knowledge_base下のフォルダ一覧を取得"""
    knowledge_base_path = Path("knowledge_base")
    if not knowledge_base_path.exists():
        raise FileNotFoundError("knowledge_base フォルダが見つかりません")

    folders = [f.name for f in knowledge_base_path.iterdir() if f.is_dir()]
    return sorted(folders)

def select_category(folders: List[str]) -> str:
    """カテゴリを選択してもらう"""
    print("\nknowledge_baseフォルダ下にある項目:")
    for i, folder in enumerate(folders, 1):
        print(f"{i}. {folder}")

    while True:
        try:
            choice = int(input("\nどの項目について調べますか？ (番号を入力): "))
            if 1 <= choice <= len(folders):
                return folders[choice - 1]
            print("有効な番号を入力してください")
        except ValueError:
            print("カテゴリ名に該当する数値を入力してください")

def get_subcategory_folders(category: str) -> List[str]:
    """選択されたカテゴリ内のサブフォルダ一覧を取得"""
    category_path = Path("knowledge_base") / category
    subfolders = [f.name for f in category_path.iterdir() if f.is_dir()]
    return sorted(subfolders)

def select_subcategory(category: str, subfolders: List[str]) -> str:
    """サブカテゴリを選択してもらう"""
    if not subfolders:
        raise ValueError(f"{category}フォルダ下にサブフォルダが見つかりません")

    print(f"\n{category}フォルダ下にある項目:")
    for i, folder in enumerate(subfolders, 1):
        print(f"{i}. {folder}")

    while True:
        try:
            choice = int(input("\nどの項目について調べますか？ (番号を入力): "))
            if 1 <= choice <= len(subfolders):
                return subfolders[choice - 1]
            print("有効な番号を入力してください")
        except ValueError:
            print("カテゴリ名に該当する数値を入力してください")

def search_with_openai(company_name: str, category: str, subcategory: str) -> str:
    """OpenAI APIを使用してWeb検索を行う"""
    search_query = f"""
        {company_name}の{category}の{subcategory}について詳しく調べて、最新の情報と信頼できるURLソースを含めて教えてください。
        クイズ用のナレッジベースとして用いる予定なので、URLで参照先を書くよりも文章を書くことに重点を置いてください。
        マークダウン形式で出力してほしいです。URLは[]()のフォーマットで、知識については項目 - のフォーマットで記載してください。
        """

    try:
        response = client.responses.create(
            model="gpt-5",
            tools=[{"type": "web_search_preview", "search_context_size": "medium"}],
            input=search_query
        )
        return response.output_text
    except Exception as e:
        raise Exception(f"OpenAI API呼び出しエラー: {e}")

def save_result(content: str, company_name: str, category: str, subcategory: str) -> Path:
    """結果を指定されたパスに.mdファイルとして保存"""
    # 保存パスを作成
    save_path = Path("knowledge_base") / category / subcategory
    save_path.mkdir(parents=True, exist_ok=True)

    # タイムスタンプファイル名を生成
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    full_filename = f"{timestamp}.md"
    file_path = save_path / full_filename

    # ヘッダーを追加
    header = f"""# {company_name} - {category}/{subcategory}

生成日時: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}

---

"""

    # ファイルに保存
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(header + content)

    return file_path

def main():
    """メイン処理"""
    # コマンドライン引数の解析
    parser = argparse.ArgumentParser(description='企業情報抽出ツール')
    parser.add_argument('--company', help='会社名を指定')
    parser.add_argument('--category', help='カテゴリを指定')
    parser.add_argument('--subcategory', help='サブカテゴリを指定')
    args = parser.parse_args()

    try:
        print("企業情報抽出ツール")
        print("=" * 50)

        # 引数モード vs 対話モード
        if args.company and args.category and args.subcategory:
            # 引数モード
            print("引数モードで実行します")
            company_name = args.company
            selected_category = args.category
            selected_subcategory = args.subcategory

            # カテゴリの存在確認
            categories = get_category_folders()
            if selected_category not in categories:
                print(f"エラー: カテゴリ '{selected_category}' が見つかりません")
                print(f"利用可能なカテゴリ: {', '.join(categories)}")
                return

            subcategories = get_subcategory_folders(selected_category)
            if selected_subcategory not in subcategories:
                print(f"エラー: サブカテゴリ '{selected_subcategory}' が見つかりません")
                print(f"'{selected_category}' の利用可能なサブカテゴリ: {', '.join(subcategories)}")
                return

            print(f"引数モード: {company_name} -> {selected_category}/{selected_subcategory}")
        else:
            # 対話モード
            print("対話モードで実行します。引数モードで実行するには --company, --category, --subcategory 全てを一括で指定してください。")

            # 1. 会社名を取得
            company_name = get_company_name()

            # 2. カテゴリを選択
            categories = get_category_folders()
            selected_category = select_category(categories)

            # 3. サブカテゴリを選択
            subcategories = get_subcategory_folders(selected_category)
            selected_subcategory = select_subcategory(selected_category, subcategories)

        print(f"\n調査開始: {company_name}の{selected_category}/{selected_subcategory}")
        print("OpenAI APIで情報を検索中...")

        # 4. OpenAI APIで検索
        search_result = search_with_openai(company_name, selected_category, selected_subcategory)

        # 5. 結果を保存
        file_path = save_result(search_result, company_name, selected_category, selected_subcategory)

        print(f"\n完了！")
        print(f"結果は以下のファイルに保存されました: {file_path}")

    except KeyboardInterrupt:
        print("\n\n処理が中断されました")
    except Exception as e:
        print(f"\nエラーが発生しました: {e}")

if __name__ == "__main__":
    main()
