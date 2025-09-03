
import React, { useState, FormEvent } from 'react';
import Spinner from './Spinner';
import { HeartIcon } from './icons';
import { playClickSound } from '../services/soundService';

interface GameScreenProps {
  currentWord: string;
  score: number;
  difficultyName: string;
  currentThreshold: number;
  lives: number;
  timeLeft: number;
  onSubmit: (word: string) => void;
  isLoading: boolean;
  error: string | null;
}

const GameScreen: React.FC<GameScreenProps> = ({
  currentWord,
  score,
  difficultyName,
  currentThreshold,
  lives,
  timeLeft,
  onSubmit,
  isLoading,
  error,
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      playClickSound();
      onSubmit(inputValue.trim());
      setInputValue('');
    }
  };

  const timerPercentage = (timeLeft / 30) * 100;
  const timerColor = timeLeft > 10 ? 'bg-green-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="flex flex-col items-center space-y-4 sm:space-y-6 animate-fade-in text-2xl sm:text-3xl">
      <div className="w-full flex flex-col sm:flex-row justify-between items-center sm:items-baseline gap-1 sm:gap-2 text-indigo-200">
        <p className="whitespace-nowrap">난이도: <span className="font-bold text-fuchsia-400">{difficultyName} ({(currentThreshold * 100).toFixed(2)}%)</span></p>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5" aria-label={`남은 기회 ${lives}개`}>
                <span className="font-bold text-2xl sm:text-3xl">기회:</span>
                {Array.from({ length: 3 }).map((_, i) => (
                    <HeartIcon key={i} className={`w-8 h-8 transition-colors ${i < lives ? 'text-red-500' : 'text-slate-600'}`} />
                ))}
            </div>
            <p className="whitespace-nowrap">점수: <span className="font-bold text-purple-300 text-4xl sm:text-5xl">{score.toLocaleString()}</span></p>
        </div>
      </div>

      <div className="w-full text-center p-4 sm:p-6 bg-black/20 rounded-lg border border-white/10">
        <div className="mb-4">
            <div className="flex justify-between items-center text-indigo-200 mb-1">
                <span className="font-bold">남은 시간</span>
                <span className="font-mono font-bold text-3xl sm:text-4xl text-white">{timeLeft}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className={`${timerColor} h-2.5 rounded-full transition-all duration-200 ease-linear`}
                    style={{ width: `${timerPercentage}%` }}
                    aria-valuenow={timeLeft}
                    aria-valuemin={0}
                    aria-valuemax={30}
                    role="progressbar"
                    aria-label="남은 시간 표시줄"
                ></div>
            </div>
        </div>
        <p className="text-indigo-300 text-2xl sm:text-3xl mb-1 sm:mb-2">제시 단어</p>
        <p className="text-6xl sm:text-8xl font-bold tracking-wider text-white">{currentWord}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="다음 단어를 입력하세요..."
          disabled={isLoading}
          className="flex-grow bg-black/20 border border-white/20 rounded-lg py-3 px-4 sm:py-4 sm:px-5 text-3xl sm:text-4xl text-white placeholder-slate-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-6 py-3 sm:px-8 sm:py-4 text-xl sm:text-2xl font-bold text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-950 focus:ring-purple-400 transition-all transform hover:scale-105 disabled:bg-indigo-900/50 disabled:cursor-not-allowed flex items-center justify-center gap-3 whitespace-nowrap"
        >
          {isLoading ? <Spinner /> : '제출'}
        </button>
      </form>
      
      {error && <p className="text-pink-400 mt-2 text-xl sm:text-2xl">{error}</p>}
    </div>
  );
};

export default GameScreen;
