import { readdir, readFile, stat } from 'fs/promises';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { join } from 'path';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

interface QuizSet {
  questions: QuizQuestion[];
  sourceFile: string;
}

// すべてのmdファイルを再帰的に取得
async function getAllMdFiles(basePath: string): Promise<string[]> {
  const allFiles: string[] = [];

  async function scanDirectory(dirPath: string) {
    const items = await readdir(dirPath);

    for (const item of items) {
      const itemPath = join(dirPath, item);
      const itemStat = await stat(itemPath);

      if (itemStat.isDirectory()) {
        await scanDirectory(itemPath);
      } else if (item.endsWith('.md')) {
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
    const companyPath = join(process.cwd(), '..', 'knowledge_base', company);

    if (category === 'すべて' && subcategory === 'すべて') {
      // 全ての.mdファイルから選択
      filePaths = await getAllMdFiles(companyPath);
    } else if (category !== 'すべて' && subcategory === 'すべて') {
      // 指定カテゴリの全サブカテゴリから選択
      const categoryPath = join(companyPath, category);
      filePaths = await getAllMdFiles(categoryPath);
    } else if (category !== 'すべて' && subcategory !== 'すべて') {
      // 指定されたカテゴリ/サブカテゴリから選択
      const subcategoryPath = join(companyPath, category, subcategory);
      const files = await readdir(subcategoryPath);
      const mdFiles = files.filter(file => file.endsWith('.md'));
      filePaths = mdFiles.map(file => join(subcategoryPath, file));
    } else {
      return NextResponse.json(
        { error: 'Invalid category/subcategory combination' },
        { status: 400 }
      );
    }

    if (filePaths.length === 0) {
      return NextResponse.json(
        { error: 'No markdown files found in the specified selection' },
        { status: 404 }
      );
    }

    // Pick a random file
    const randomFilePath = filePaths[Math.floor(Math.random() * filePaths.length)];
    const content = await readFile(randomFilePath, 'utf-8');

    // Generate 5 quiz questions using OpenAI
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `あなたはクイズ生成の専門家です。与えられた文書から4択クイズを5問作成してください。

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
          - URLが見つからない場合は空文字列""にしてください`
        },
        {
          role: 'user',
          content: `以下の文書から5問のクイズを作成してください：\n\n${content}`
        }
      ],
      temperature: 0.7,
    });

    const quizData = response.choices[0].message.content;
    if (!quizData) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const quizSet = JSON.parse(quizData);

    return NextResponse.json(quizSet);
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}
