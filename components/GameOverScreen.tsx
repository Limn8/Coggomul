
import React, { useState, useEffect, FormEvent, useRef } from 'react';
import type { GameAttempt } from '../types';
import { calculateSimilarity } from '../services/geminiService';
import { getLeaderboard, submitScore, type LeaderboardEntry } from '../services/leaderboardService';
import { TrophyIcon, CheckCircleIcon, XCircleIcon, CrownIcon } from './icons';
import Spinner from './Spinner';

interface GameOverScreenProps {
  score: number;
  history: GameAttempt[];
  onRestart: () => void;
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ score, history, onRestart }) => {
  const [finalSimilarity, setFinalSimilarity] = useState<number | null>(null);
  const [isLoadingSimilarity, setIsLoadingSimilarity] = useState<boolean>(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState<boolean>(true);
  
  const [localHighScore, setLocalHighScore] = useState<number>(0);
  const [localPlayerName, setLocalPlayerName] = useState<string>('');
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isNewLocalHighScore, setIsNewLocalHighScore] = useState<boolean>(false);

  const [playerName, setPlayerName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionComplete, setSubmissionComplete] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const calculateRank = (scoreToRank: number, currentLeaderboard: LeaderboardEntry[]): number | null => {
    if (scoreToRank <= 0) return null;

    let rank: number | null = null;
    for (let i = 0; i < currentLeaderboard.length; i++) {
      if (scoreToRank > currentLeaderboard[i].score) {
        rank = i + 1;
        break;
      } else if (scoreToRank === currentLeaderboard[i].score) {
        rank = i + 1;
        break;
      }
    }

    if (rank === null && currentLeaderboard.length < 3) {
      rank = currentLeaderboard.length + 1;
    }
    
    return rank;
  };

  const fetchLeaderboardAndRank = async (scoreToRank: number) => {
    setIsLoadingLeaderboard(true);
    setError(null);
    try {
      const data = await getLeaderboard();
      setLeaderboard(data);
      setPlayerRank(calculateRank(scoreToRank, data));
    } catch (err) {
      console.error(err);
      setError('리더보드를 불러오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setLeaderboard([]);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };


  useEffect(() => {
    // 1. Calculate final word similarity
    const calculateFinalWordSimilarity = async () => {
      if (history.length > 0) {
        const firstWord = history[0].previousWord;
        const lastSuccessfulAttempt = [...history].reverse().find(h => h.success);
        const lastWord = lastSuccessfulAttempt ? lastSuccessfulAttempt.newWord : firstWord;

        if (firstWord !== lastWord) {
          setIsLoadingSimilarity(true);
          try {
            const similarity = await calculateSimilarity(firstWord, lastWord);
            setFinalSimilarity(similarity);
          } catch (e) {
            console.error("Could not calculate final similarity", e);
          } finally {
            setIsLoadingSimilarity(false);
          }
        } else {
          setFinalSimilarity(1.0);
        }
      }
    };
    
    // 2. Load local high score and check for new record
    const savedScore = parseInt(localStorage.getItem('localHighScore') || '0', 10);
    const savedName = localStorage.getItem('localPlayerName') || '익명의 플레이어';
    setLocalHighScore(savedScore);
    setLocalPlayerName(savedName);
    
    if (score > savedScore) {
      setIsNewLocalHighScore(true);
    }

    // 3. Fetch leaderboard and calculate rank for existing high score
    fetchLeaderboardAndRank(savedScore);
    calculateFinalWordSimilarity();

  }, [history]); // This effect runs only once when the component mounts.

  useEffect(() => {
    // Focus name input when a new high score is achieved
    if (isNewLocalHighScore && !submissionComplete) {
      nameInputRef.current?.focus();
    }
  }, [isNewLocalHighScore, submissionComplete]);
  
  const handleNameSubmit = async (e: FormEvent) => {
      e.preventDefault();
      if (!playerName.trim()) {
          setError('이름을 입력해주세요.');
          return;
      }
      setIsSubmitting(true);
      setError(null);
      try {
          await submitScore(playerName.trim(), score);
          
          // Update local storage with new high score
          localStorage.setItem('localHighScore', String(score));
          localStorage.setItem('localPlayerName', playerName.trim());
          setLocalHighScore(score);
          setLocalPlayerName(playerName.trim());

          setSubmissionComplete(true);
          await fetchLeaderboardAndRank(score); // Refresh leaderboard and rank with the new score
      } catch (err) {
          console.error(err);
          setError('점수 제출에 실패했습니다. 다시 시도해주세요.');
      } finally {
          setIsSubmitting(false);
      }
  };

  const LeaderboardDisplay: React.FC = () => {
    if (isLoadingLeaderboard) {
      return <div className="flex items-center justify-center gap-2 text-indigo-200 text-xl sm:text-2xl"><Spinner /> 리더보드 로딩 중...</div>;
    }
    if (error && (!leaderboard || leaderboard.length === 0)) {
      return <p className="text-pink-400 text-xl sm:text-2xl">{error}</p>;
    }
    if (!leaderboard || leaderboard.length === 0) {
      return <p className="text-indigo-300 text-xl sm:text-2xl">아직 등록된 점수가 없습니다. 첫 번째 챔피언이 되어보세요!</p>;
    }
    const rankColors = ['text-yellow-400', 'text-slate-300', 'text-yellow-600'];

    return (
      <div className="w-full space-y-2">
        {leaderboard.map((entry, index) => (
          <div key={index} className="flex items-center justify-between bg-black/20 p-2 sm:p-3 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <CrownIcon className={`w-7 h-7 sm:w-8 sm:h-8 ${rankColors[index] || 'text-transparent'}`} />
              <span className="text-2xl sm:text-4xl font-bold text-white">{entry.name}</span>
            </div>
            <span className="text-2xl sm:text-4xl font-semibold text-fuchsia-300">{entry.score.toLocaleString()}점</span>
          </div>
        ))}
      </div>
    );
  };


  return (
    <div className="flex flex-col items-center text-center animate-fade-in-scale text-2xl sm:text-3xl w-full">
      <TrophyIcon className="w-20 h-20 sm:w-24 sm:h-24 text-fuchsia-400 mb-4" />
      <h2 className="text-5xl sm:text-6xl font-bold text-white mb-2">게임 종료!</h2>
      <p className="text-4xl sm:text-5xl text-indigo-200 mb-6">최종 점수: <span className="font-bold text-purple-300">{score.toLocaleString()}</span>점</p>
      
      <div className="w-full bg-black/20 rounded-lg border border-white/10 p-4 mb-6">
        <h3 className="text-3xl sm:text-4xl font-semibold text-fuchsia-300 mb-3">🏆 명예의 전당 🏆</h3>
        <LeaderboardDisplay />
      </div>

      <div className="w-full bg-indigo-900/30 rounded-lg border border-indigo-500 p-4 mb-6 text-center">
        <h3 className="text-2xl sm:text-3xl font-bold text-indigo-200 mb-2">나의 최고 기록</h3>
        {localHighScore > 0 ? (
          <>
            <p className="text-4xl sm:text-5xl font-bold text-white">
              {localHighScore.toLocaleString()}점 
              <span className="text-2xl sm:text-3xl text-slate-300 ml-2">({localPlayerName})</span>
            </p>
            {playerRank ? (
              <p className="text-2xl sm:text-3xl text-yellow-400 mt-1">전체 {playerRank}위</p>
            ) : (
              <p className="text-xl sm:text-2xl text-slate-400 mt-1">현재 순위권 밖</p>
            )}
          </>
        ) : (
          <p className="text-xl sm:text-2xl text-slate-400">아직 기록이 없습니다.</p>
        )}
      </div>

      {isNewLocalHighScore && (
        submissionComplete ? (
          <div className="w-full bg-green-900/30 rounded-lg border border-green-500 p-4 mb-6 animate-fade-in text-center flex flex-col items-center">
            <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-green-400 mb-2"/>
            <h3 className="text-3xl sm:text-4xl font-bold text-green-300 mb-2">신기록 등록 완료!</h3>
            <p className="text-xl sm:text-2xl text-indigo-200">명예의 전당에 오르신 것을 축하합니다!</p>
          </div>
        ) : (
          <div className="w-full bg-fuchsia-900/30 rounded-lg border border-fuchsia-500 p-4 mb-6 animate-fade-in">
              <h3 className="text-3xl sm:text-4xl font-bold text-fuchsia-300 mb-3">👑 신기록 달성! 👑</h3>
              <p className="text-xl sm:text-2xl text-indigo-200 mb-4">새로운 최고 기록입니다! 명예의 전당에 이름을 남겨주세요.</p>
              <form onSubmit={handleNameSubmit} className="flex flex-col sm:flex-row gap-3">
                  <input
                      ref={nameInputRef}
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="이름 (최대 10자)"
                      maxLength={10}
                      disabled={isSubmitting}
                      className="flex-grow bg-black/20 border border-white/20 rounded-lg py-3 px-4 text-2xl sm:text-3xl text-white placeholder-slate-500 focus:ring-2 focus:ring-fuchsia-500"
                      aria-label="플레이어 이름"
                  />
                  <button
                      type="submit"
                      disabled={isSubmitting || !playerName.trim()}
                      className="px-6 py-3 text-2xl sm:text-3xl font-bold text-white bg-fuchsia-600 rounded-lg shadow-md hover:bg-fuchsia-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                      {isSubmitting ? <Spinner /> : '등록하기'}
                  </button>
              </form>
              {error && <p className="text-pink-400 mt-2 text-xl sm:text-2xl">{error}</p>}
          </div>
        )
      )}

      {(!isNewLocalHighScore || submissionComplete) && (
        <button
          onClick={onRestart}
          className="w-full px-8 py-4 text-3xl sm:text-4xl font-bold text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-950 focus:ring-purple-400 transition-transform transform hover:scale-105"
        >
          다시하기
        </button>
      )}

      <div className="w-full bg-black/20 rounded-lg border border-white/10 p-4 my-6">
        <h3 className="text-3xl sm:text-4xl font-semibold text-fuchsia-300 mb-3">게임 기록</h3>
        <ul className="space-y-2 text-left max-h-48 overflow-y-auto pr-2 text-xl sm:text-2xl">
          {history.map((attempt, index) => (
            <li key={index} className={`flex items-center justify-between p-2 rounded ${attempt.success ? 'bg-purple-500/20' : 'bg-pink-500/20'}`}>
              <div className="flex items-center gap-2">
                {attempt.success ? <CheckCircleIcon className="w-6 h-6 text-purple-400" /> : <XCircleIcon className="w-6 h-6 text-pink-400" />}
                <span className="break-all">{attempt.previousWord} → {attempt.newWord}</span>
              </div>
              <div className="flex items-baseline gap-2 text-right flex-shrink-0 ml-2">
                  <span className={`font-semibold ${attempt.success ? 'text-purple-300' : 'text-pink-300'}`}>
                    {(Math.max(0, attempt.similarity) * 100).toFixed(2)}%
                    <span className="text-indigo-300 text-lg sm:text-xl font-normal"> / {(attempt.requiredThreshold * 100).toFixed(2)}%</span>
                  </span>
                  {attempt.points !== 0 && (
                    <span className={`text-lg sm:text-xl font-bold ${attempt.success ? 'text-fuchsia-300' : 'text-red-400'}`}>
                      ({attempt.points > 0 ? '+' : ''}{attempt.points.toLocaleString()})
                    </span>
                  )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="w-full bg-black/20 rounded-lg border border-white/10 p-4 mb-6">
        <h3 className="text-3xl sm:text-4xl font-semibold text-fuchsia-300 mb-2">종합 유사도</h3>
        {isLoadingSimilarity ? (
          <div className="flex items-center justify-center gap-2 text-indigo-200 text-xl sm:text-2xl"><Spinner /> 계산 중...</div>
        ) : finalSimilarity !== null ? (
          <p className="text-2xl sm:text-3xl">
            <span className="text-indigo-200">{history[0]?.previousWord}</span> 와(과)
            <span className="text-indigo-200"> {([...history].reverse().find(h => h.success))?.newWord || history[0]?.previousWord}</span> 의 최종 유사도는
            <span className="font-bold text-4xl sm:text-5xl text-fuchsia-400 block mt-1">{(Math.max(0, finalSimilarity) * 100).toFixed(2)}%</span> 입니다.
          </p>
        ) : (
          <p className="text-slate-400 text-xl sm:text-2xl">최종 유사도를 계산할 수 없습니다.</p>
        )}
      </div>

    </div>
  );
};

export default GameOverScreen;
