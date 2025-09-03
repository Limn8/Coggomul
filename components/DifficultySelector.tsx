
import React, { useState } from 'react';
import type { Difficulty } from '../types';
import Spinner from './Spinner';
import { playClickSound } from '../services/soundService';

// Accordion Item component
const AccordionItem: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
  <details className="w-full bg-black/20 rounded-lg border border-white/10 group">
    <summary className="p-4 cursor-pointer text-2xl sm:text-3xl font-semibold text-fuchsia-300 list-none flex justify-between items-center group-hover:bg-white/5 transition-colors">
      {title}
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform transition-transform duration-300 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    </summary>
    <div className="p-4 border-t border-white/10 text-xl sm:text-2xl text-indigo-200">
      {children}
    </div>
  </details>
);


interface DifficultySelectorProps {
  onSelect: (difficulty: Difficulty) => void;
  isLoading: boolean;
  error: string | null;
}

const predefinedDifficulties: Difficulty[] = [
  { name: '쉬움', threshold: 0.25, multiplier: 0.25 },
  { name: '보통', threshold: 0.50, multiplier: 1.0 },
  { name: '어려움', threshold: 0.75, multiplier: 2.0 },
];

const DifficultySelector: React.FC<DifficultySelectorProps> = ({ onSelect, isLoading, error }) => {
  const [customThreshold, setCustomThreshold] = useState<string>('30');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();
    const thresholdValue = parseInt(customThreshold, 10);
    if (!isNaN(thresholdValue) && thresholdValue > 0 && thresholdValue <= 100) {
      onSelect({ name: '커스텀', threshold: thresholdValue / 100, multiplier: 1.0 });
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6 animate-fade-in">
      <div className="w-full space-y-2 mb-4">
        <AccordionItem title="🤔 코사인 유사도란?">
            <p className="leading-relaxed">단어는 AI 모델에 의해 다차원 공간의 '벡터(vector)'라는 숫자 좌표로 표현됩니다. 코사인 유사도는 이 두 단어 벡터가 이루는 각도의 코사인 값을 측정하는 방법입니다. 두 벡터가 같은 방향을 가리킬수록(각도가 0°에 가까울수록) 코사인 값은 1에 가까워지며, 이는 두 단어의 의미가 매우 유사함을 의미합니다. 반대로, 방향이 반대가 될수록 값은 -1에 가까워집니다.(게임에서는 음수는 0점으로 처리했습니다. 감점되면 슬프니까.)</p>
        </AccordionItem>
        <AccordionItem title="📝 게임 방법">
            <ul className="list-decimal list-inside space-y-2 leading-relaxed">
                <li>난이도를 선택하면 AI가 첫 단어를 제시해요.</li>
                <li>제시된 단어와 의미가 비슷한 다음 단어를 입력하세요.</li>
                <li>입력한 단어의 유사도가 현재 '목표 유사도' 이상이면 성공! 점수를 얻고 다음 라운드로 넘어가요.</li>
                <li>성공할 때마다 목표 유사도가 조금씩 올라가 더 어려워져요. 실패하면 기회가 줄어들고, 기회를 모두 잃으면 게임이 종료돼요.</li>
            </ul>
        </AccordionItem>
        <AccordionItem title="💰 점수 계산">
             <ul className="list-disc list-inside space-y-2 leading-relaxed">
                <li>점수는 <strong>(측정 유사도 - 목표 유사도)</strong>를 기준으로 계산돼요. 목표치를 아슬아슬하게 넘기는 것보다, 훨씬 높은 유사도의 단어를 제시하면 더 큰 점수를 얻을 수 있어요!</li>
                <li>성공적으로 라운드를 이어갈수록 라운드 보너스 점수가 추가돼요.</li>
                <li>난이도에 따라 최종 점수에 가중치가 적용됩니다. (<strong>쉬움: 0.25배</strong>, <strong>보통: 1배</strong>, <strong>어려움: 2배</strong>)</li>
            </ul>
        </AccordionItem>
      </div>

      <h2 className="text-4xl sm:text-5xl font-bold text-fuchsia-300">난이도 선택</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {predefinedDifficulties.map((level) => (
          <button
            key={level.name}
            onClick={() => { playClickSound(); onSelect(level); }}
            disabled={isLoading}
            className="w-full px-6 py-3 sm:py-4 text-2xl sm:text-3xl font-semibold text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-950 focus:ring-purple-400 transition-transform transform hover:scale-105 disabled:bg-indigo-900/50 disabled:cursor-not-allowed"
          >
            {level.name} ({level.threshold * 100}%)
          </button>
        ))}
      </div>

      <div className="w-full pt-4 border-t border-white/10">
        <form onSubmit={handleCustomSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-grow w-full">
            <input
              type="number"
              value={customThreshold}
              onChange={(e) => setCustomThreshold(e.target.value)}
              min="1"
              max="100"
              disabled={isLoading}
              className="w-full bg-black/20 border border-white/20 rounded-lg py-3 pl-4 pr-24 text-white placeholder-slate-400 focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 text-2xl sm:text-3xl"
              placeholder="1-100"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-2xl sm:text-3xl">%</span>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full sm:w-auto px-6 py-3 text-2xl sm:text-3xl font-semibold text-white bg-fuchsia-600 rounded-lg shadow-md hover:bg-fuchsia-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-950 focus:ring-fuchsia-400 transition-transform transform hover:scale-105 disabled:bg-indigo-900/50 disabled:cursor-not-allowed"
          >
            커스텀 시작
          </button>
        </form>
      </div>
      
      {isLoading && (
        <div className="flex items-center space-x-2 text-indigo-200 text-xl sm:text-2xl">
          <Spinner />
          <span>첫 단어를 생성 중입니다...</span>
        </div>
      )}
      
      {error && <p className="text-pink-400 mt-4 text-xl sm:text-2xl">{error}</p>}
    </div>
  );
};

export default DifficultySelector;
