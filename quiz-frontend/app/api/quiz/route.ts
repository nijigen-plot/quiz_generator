import { readdir, readFile, stat } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';

interface QuizRequest {
  company: string;
  category: string;
  subcategory: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  sourceUrl?: string;
}


// すべてのJSONファイルを再帰的に取得
async function getAllJsonFiles(basePath: string): Promise<string[]> {
  const allFiles: string[] = [];

  async function scanDirectory(dirPath: string) {
    const items = await readdir(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const itemStat = await stat(itemPath);

      if (itemStat.isDirectory()) {
        await scanDirectory(itemPath);
      } else if (item.endsWith('.json')) {
        allFiles.push(itemPath);
      }
    }
  }

  await scanDirectory(basePath);
  return allFiles;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuizRequest = await request.json();
    const { company, category, subcategory } = body;

    if (!company) {
      return NextResponse.json(
        { error: 'Company is required' },
        { status: 400 }
      );
    }

    let filePaths: string[] = [];
    const companyPath = join(process.cwd(), '..', 'quizzes', company);

    if (category === 'すべて' && subcategory === 'すべて') {
      // 全ての.jsonファイルから選択
      filePaths = await getAllJsonFiles(companyPath);
    } else if (category !== 'すべて' && subcategory === 'すべて') {
      // 指定カテゴリの全サブカテゴリから選択
      const categoryPath = join(companyPath, category);
      filePaths = await getAllJsonFiles(categoryPath);
    } else if (category !== 'すべて' && subcategory !== 'すべて') {
      // 指定されたカテゴリ/サブカテゴリから選択
      const subcategoryPath = join(companyPath, category, subcategory);
      const files = await readdir(subcategoryPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      filePaths = jsonFiles.map(file => join(subcategoryPath, file));
    } else {
      return NextResponse.json(
        { error: 'Invalid category/subcategory combination' },
        { status: 400 }
      );
    }

    if (filePaths.length === 0) {
      return NextResponse.json(
        { error: 'No quiz files found in the specified selection' },
        { status: 404 }
      );
    }

    // Pick a random file
    const randomFilePath = filePaths[Math.floor(Math.random() * filePaths.length)];
    const content = await readFile(randomFilePath, 'utf-8');

    // Parse the pre-generated quiz JSON
    const quizSet = JSON.parse(content);

    return NextResponse.json(quizSet);
  } catch (error) {
    console.error('Error loading quiz:', error);
    return NextResponse.json(
      { error: 'Failed to load quiz' },
      { status: 500 }
    );
  }
}
