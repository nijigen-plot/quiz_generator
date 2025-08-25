'use client';

import { useState, useEffect } from 'react';

interface Category {
  name: string;
  subcategories: string[];
  hasFiles: boolean;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface QuizResult {
  question: string;
  selectedAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  options: string[];
}

export default function QuizApp() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [questionNumber, setQuestionNumber] = useState<number>(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'setup' | 'playing' | 'finished'>('setup');

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const startQuiz = async () => {
    if (!selectedCategory || !selectedSubcategory) {
      alert('カテゴリとサブカテゴリを選択してください');
      return;
    }
    
    setGameState('playing');
    setQuestionNumber(1);
    setResults([]);
    await fetchNextQuestion();
  };

  const fetchNextQuestion = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: selectedCategory,
          subcategory: selectedSubcategory,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch quiz question');
      }
      
      const question = await response.json();
      setCurrentQuestion(question);
    } catch (error) {
      console.error('Error fetching question:', error);
      alert('質問の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = async (selectedAnswer: number) => {
    if (!currentQuestion) return;

    const result: QuizResult = {
      question: currentQuestion.question,
      selectedAnswer,
      correctAnswer: currentQuestion.correct,
      isCorrect: selectedAnswer === currentQuestion.correct,
      options: currentQuestion.options,
    };

    const newResults = [...results, result];
    setResults(newResults);

    if (questionNumber >= 5) {
      setGameState('finished');
    } else {
      setQuestionNumber(prev => prev + 1);
      await fetchNextQuestion();
    }
  };

  const resetQuiz = () => {
    setGameState('setup');
    setCurrentQuestion(null);
    setQuestionNumber(0);
    setResults([]);
    setSelectedCategory('');
    setSelectedSubcategory('');
  };

  const selectedCategoryData = categories.find(cat => cat.name === selectedCategory);

  if (gameState === 'setup') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-black">
            企業クイズ
          </h1>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                カテゴリを選択
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSubcategory('');
                }}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value="">カテゴリを選んでください</option>
                {categories.map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedCategoryData && (
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  サブカテゴリを選択
                </label>
                <select
                  value={selectedSubcategory}
                  onChange={(e) => setSelectedSubcategory(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                >
                  <option value="">サブカテゴリを選んでください</option>
                  {selectedCategoryData.subcategories.map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={startQuiz}
              disabled={!selectedCategory || !selectedSubcategory}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              クイズ開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-black">
              問題 {questionNumber} / 5
            </h1>
            <div className="text-sm text-black">
              {selectedCategory} → {selectedSubcategory}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-black">問題を読み込み中...</p>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-black leading-relaxed">
                {currentQuestion.question}
              </h2>
              
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-black"
                  >
                    <span className="font-medium text-blue-600 mr-3">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  if (gameState === 'finished') {
    const correctCount = results.filter(result => result.isCorrect).length;
    
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-8 text-black">
            結果発表
          </h1>
          
          <div className="text-center mb-8">
            <div className="text-5xl font-bold mb-4">
              {correctCount} / 5
            </div>
            <div className="text-xl text-black">
              正解率: {Math.round((correctCount / 5) * 100)}%
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {results.map((result, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  result.isCorrect 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="font-medium mb-2 text-black">
                  問題 {index + 1}: {result.question}
                </div>
                <div className="text-sm text-black">
                  あなたの回答: {String.fromCharCode(65 + result.selectedAnswer)}. {result.options[result.selectedAnswer]}
                  {result.isCorrect ? ' ✅' : ` ❌ (正解: ${String.fromCharCode(65 + result.correctAnswer)}. ${result.options[result.correctAnswer]})`}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={resetQuiz}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            もう一度挑戦
          </button>
        </div>
      </div>
    );
  }

  return null;
}
