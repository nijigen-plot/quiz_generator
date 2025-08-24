import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuizRequest {
  category: string;
  subcategory: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuizRequest = await request.json();
    const { category, subcategory } = body;

    if (!category || !subcategory) {
      return NextResponse.json(
        { error: 'Category and subcategory are required' },
        { status: 400 }
      );
    }

    // Read random .md file from the specified category/subcategory
    const subcategoryPath = join(process.cwd(), '..', 'knowledge_base', category, subcategory);
    const files = await readdir(subcategoryPath);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    if (mdFiles.length === 0) {
      return NextResponse.json(
        { error: 'No markdown files found in the specified category' },
        { status: 404 }
      );
    }

    // Pick a random file
    const randomFile = mdFiles[Math.floor(Math.random() * mdFiles.length)];
    const filePath = join(subcategoryPath, randomFile);
    const content = await readFile(filePath, 'utf-8');

    // Generate quiz using OpenAI
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `あなたはクイズ生成の専門家です。与えられた文書から4択クイズを1問作成してください。
          
          以下のJSON形式で返答してください：
          {
            "question": "質問文",
            "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
            "correct": 0
          }
          
          correctは正解の選択肢のインデックス（0-3）です。
          クイズは文書の内容に基づいて作成し、適度な難易度にしてください。`
        },
        {
          role: 'user',
          content: `以下の文書からクイズを作成してください：\n\n${content}`
        }
      ],
      temperature: 0.7,
    });

    const quizData = response.choices[0].message.content;
    if (!quizData) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    const quiz: QuizQuestion = JSON.parse(quizData);

    return NextResponse.json(quiz);
  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}