

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, type Difficulty, type GameAttempt } from './types';
import { getRandomKoreanWord, calculateSimilarity, isApiKeyConfigured } from './services/geminiService';
import DifficultySelector from './components/DifficultySelector';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import { LinkIcon, VolumeOnIcon, VolumeOffIcon } from './components/icons';
import { playStartSound, playSuccessSound, playFailureSound, playClickSound, getIsMuted, toggleMute, playBackgroundMusic, stopBackgroundMusic, updateBackgroundMusic, initializeAudio } from './services/soundService';

const ApiKeyError: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-fuchsia-900 flex flex-col items-center justify-center p-4 text-center">
    <div className="bg-pink-900/50 backdrop-blur-sm border border-pink-700 rounded-2xl p-6 sm:p-8 max-w-lg shadow-2xl shadow-pink-500/10 animate-fade-in-scale">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.031-1.742 3.031H4.42c-1.532 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-4a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
        <h1 className="text-3xl sm:text-4xl font-bold text-pink-300">API 키 설정 오류</h1>
      </div>
      <p className="text-xl text-slate-300">
        Google Gemini API 키가 설정되지 않았습니다.
      </p>
      <p className="mt-2 text-slate-400">
        이 애플리케이션이 올바르게 작동하려면, 개발자가 환경 변수에 유효한 API 키를 제공해야 합니다.
      </p>
    </div>
  </div>
);

// Custom hook for declarative intervals
function useInterval(callback: () => void, delay: number | null) {
  // FIX: Initialize useRef with null. Calling useRef() without arguments can cause
  // an "Expected 1 arguments, but got 0" error in some environments.
  const savedCallback = useRef<(() => void) | null>(null);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      let id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const App: React.FC = () => {
  const [apiKeyAvailable] = useState(isApiKeyConfigured());
  const [gameState, setGameState] = useState<GameState>(GameState.SELECTING_DIFFICULTY);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [currentThreshold, setCurrentThreshold] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [currentWord, setCurrentWord] = useState<string>('');
  const [history, setHistory] = useState<GameAttempt[]>([]);
  const [lives, setLives] = useState<number>(3);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(getIsMuted());
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    // This effect sets up a one-time event listener to unlock the audio context
    // on the first user interaction, which is required by modern browsers.
    const unlockAudio = () => {
        initializeAudio();
        // Remove the listeners after the first interaction
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);

    return () => {
        // Cleanup listeners when the component unmounts
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
    };
  }, []); // Empty dependency array ensures this runs only once on mount


  useEffect(() => {
    updateBackgroundMusic(lives);
  }, [lives]);
  
  const handleTimeout = useCallback(() => {
    const newLives = lives - 1;
    setLives(newLives);
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
    setScore(prev => Math.max(0, prev - 1000));

    const attempt: GameAttempt = {
      previousWord: currentWord,
      newWord: '(시간 초과)',
      similarity: 0,
      success: false,
      requiredThreshold: currentThreshold,
      points: -1000,
    };
    setHistory(prev => [...prev, attempt]);
    playFailureSound();
    
    if (newLives <= 0) {
      setGameState(GameState.GAME_OVER);
      stopBackgroundMusic();
    } else {
      setError(`시간 초과! 남은 기회: ${newLives}번.`);
      setTimeLeft(30); // Reset timer for next attempt
    }
  }, [lives, currentWord, currentThreshold]);

  useInterval(() => {
    if (timeLeft <= 1) {
      handleTimeout();
    } else {
      setTimeLeft(timeLeft - 1);
    }
  }, (gameState === GameState.PLAYING && !isLoading) ? 1000 : null);


  const handleToggleMute = () => {
    const newMutedState = toggleMute();
    setIsMuted(newMutedState);
    if (!newMutedState && gameState === GameState.PLAYING) {
        playBackgroundMusic(lives);
    }
  };

  const handleSelectDifficulty = useCallback(async (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty);
    setCurrentThreshold(selectedDifficulty.threshold);
    setIsLoading(true);
    setError(null);
    setHistory([]);
    setScore(0);
    setLives(3);
    setTimeLeft(30);
    try {
      const firstWord = await getRandomKoreanWord();
      setCurrentWord(firstWord);
      setGameState(GameState.PLAYING);
      playStartSound();
      // Fix: Called playBackgroundMusic with the initial number of lives (3), as a new game always starts with 3 lives.
      playBackgroundMusic(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : '시작 단어를 가져오는 중 알 수 없는 오류가 발생했습니다.');
      setGameState(GameState.SELECTING_DIFFICULTY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmitWord = useCallback(async (newWord: string) => {
    if (!difficulty || !currentWord) return;

    // Check for used words
    const allPreviouslyUsedWords = new Set(history.map(attempt => attempt.newWord));
    if (history.length > 0) {
        allPreviouslyUsedWords.add(history[0].previousWord);
    } else {
        // Before the first submission, the only "used" word is the one given by the AI.
        allPreviouslyUsedWords.add(currentWord);
    }

    if (allPreviouslyUsedWords.has(newWord)) {
      setError('이미 사용한 단어입니다. 다른 단어를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const similarity = await calculateSimilarity(currentWord, newWord);
      const success = similarity >= currentThreshold;

      if (success) {
        const basePoints = Math.round((similarity - currentThreshold) * 10000);
        const roundNumber = history.filter(h => h.success).length + 1;
        const bonusPoints = Math.round(basePoints * (roundNumber * 0.2));
        const totalPoints = Math.round((basePoints + bonusPoints) * difficulty.multiplier);
        
        const attempt: GameAttempt = {
          previousWord: currentWord,
          newWord,
          similarity,
          success,
          requiredThreshold: currentThreshold,
          points: totalPoints,
        };
        
        setHistory(prev => [...prev, attempt]);
        setScore(prev => prev + totalPoints);
        setCurrentWord(newWord);
        setCurrentThreshold(prev => prev + 0.01); // Increase threshold by 1%
        setLives(3); // Reset lives on success
        setTimeLeft(30); // Reset timer
        playSuccessSound();
      } else {
        const newLives = lives - 1;
        setLives(newLives);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500); // Reset shake after animation
        setScore(prev => Math.max(0, prev - 1000)); // Deduct 1000 points

        const attempt: GameAttempt = {
          previousWord: currentWord,
          newWord,
          similarity,
          success: false,
          requiredThreshold: currentThreshold,
          points: -1000,
        };
        setHistory(prev => [...prev, attempt]);
        playFailureSound();
        
        if (newLives <= 0) {
          setGameState(GameState.GAME_OVER);
          stopBackgroundMusic();
        } else {
          setError(`유사도 부족! 남은 기회: ${newLives}번.`);
          setTimeLeft(30); // Reset timer
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '유사도 계산 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [currentWord, difficulty, currentThreshold, history, lives]);

  const handleRestart = () => {
    playClickSound();
    stopBackgroundMusic();
    setGameState(GameState.SELECTING_DIFFICULTY);
    setDifficulty(null);
    setCurrentThreshold(0);
    setScore(0);
    setCurrentWord('');
    setHistory([]);
    setError(null);
  };

  if (!apiKeyAvailable) {
    return <ApiKeyError />;
  }
  
  const getBackgroundClasses = (lives: number): string => {
    switch (lives) {
        case 2:
            return 'from-pink-900 via-red-900 to-rose-950';
        case 1:
            return 'from-red-950 via-rose-950 to-black breathing-bg';
        default:
            return 'from-purple-900 via-indigo-900 to-fuchsia-900';
    }
  };

  const renderContent = () => {
    switch (gameState) {
      case GameState.PLAYING:
        return (
          <GameScreen
            currentWord={currentWord}
            score={score}
            difficultyName={difficulty!.name}
            currentThreshold={currentThreshold}
            lives={lives}
            timeLeft={timeLeft}
            onSubmit={handleSubmitWord}
            isLoading={isLoading}
            error={error}
          />
        );
      case GameState.GAME_OVER:
        return (
          <GameOverScreen
            score={score}
            history={history}
            onRestart={handleRestart}
          />
        );
      case GameState.SELECTING_DIFFICULTY:
      default:
        return (
          <DifficultySelector
            onSelect={handleSelectDifficulty}
            isLoading={isLoading}
            error={error}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br flex flex-col items-center justify-center p-2 sm:p-4 transition-all duration-1000 ${getBackgroundClasses(lives)} ${isShaking ? 'shake' : ''}`}>
      <header className="text-center mb-4 sm:mb-8">
        <div className="flex items-center justify-center gap-2 sm:gap-4">
          <LinkIcon className="w-12 h-12 sm:w-16 sm:h-16 text-fuchsia-400" />
          <div>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white">
              코사인 유사도 꼬리물기
            </h1>
            <p className="text-3xl sm:text-5xl text-fuchsia-300 font-bold -mt-2 sm:-mt-1 text-right pr-2">
              (코꼬물)
            </p>
          </div>
        </div>
        <p className="mt-2 sm:mt-4 text-2xl sm:text-3xl text-indigo-200">유사한 단어를 계속 입력해 보세요!</p>
      </header>
      <main className="w-full max-w-2xl">
        <div className="bg-black/20 backdrop-blur-lg rounded-2xl shadow-2xl shadow-purple-500/10 p-4 sm:p-8 border border-white/10">
          {renderContent()}
        </div>
      </main>
      <footer className="w-full max-w-2xl flex items-center justify-center mt-4 sm:mt-8 text-indigo-300 text-xl sm:text-2xl relative">
        <p>제작: 경기이음온학교 임현우</p>
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <button 
                onClick={handleToggleMute} 
                className="p-2 rounded-full text-indigo-300 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-950 focus:ring-fuchsia-400 transition-colors"
                aria-label={isMuted ? "소리 켜기" : "소리 끄기"}
            >
                {isMuted ? <VolumeOffIcon className="w-8 h-8 sm:w-7 sm:h-7" /> : <VolumeOnIcon className="w-8 h-8 sm:w-7 sm:h-7" />}
            </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
