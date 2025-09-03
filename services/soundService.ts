
let audioContext: AudioContext | null = null;
let musicGainNode: GainNode | null = null;
let isMuted: boolean = false;
let musicLoopTimeoutId: number | null = null;
let currentLives: number = 3; // Keep track of the current music state
let audioInitialized: boolean = false;

// 모듈 로드 시 localStorage에서 음소거 상태를 초기화합니다.
if (typeof window !== 'undefined') {
    isMuted = localStorage.getItem('isMuted') === 'true';
}

/**
 * 필요할 때 AudioContext를 생성하고 반환합니다.
 * 이 함수는 오디오 컨텍스트 객체를 가져오는 역할만 합니다.
 */
const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;

    // 컨텍스트가 닫혔다면, 재생성을 위해 null로 설정합니다.
    if (audioContext && audioContext.state === 'closed') {
      audioContext = null;
      audioInitialized = false; // 플래그 초기화
    }

    // 컨텍스트가 없다면 새로 생성합니다.
    if (!audioContext) {
        try {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) {
                console.warn('Web Audio API is not supported in this browser.');
                return null;
            }
            audioContext = new Ctx();
            musicGainNode = audioContext.createGain();
            musicGainNode.connect(audioContext.destination);
        } catch (e) {
            console.error("Could not create AudioContext:", e);
            return null;
        }
    }
    
    return audioContext;
};

/**
 * 첫 사용자 상호작용 시 이 함수를 호출하여 오디오 컨텍스트를 초기화하고
 * 자동 재생 제한을 해제합니다. 한 번만 실행됩니다.
 */
export const initializeAudio = () => {
  if (audioInitialized || typeof window === 'undefined') {
    return;
  }

  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().then(() => {
      console.log("AudioContext가 사용자 상호작용에 의해 성공적으로 활성화되었습니다.");
      audioInitialized = true;
    }).catch(e => console.error("AudioContext 활성화 실패", e));
  } else if (ctx) {
    // Already running or not suspended, so we are initialized.
    audioInitialized = true;
  }
};

export const getIsMuted = (): boolean => isMuted;

export const toggleMute = (): boolean => {
    isMuted = !isMuted;
    if (typeof window !== 'undefined') {
        localStorage.setItem('isMuted', String(isMuted));
    }
    if (isMuted) {
      stopBackgroundMusic();
    }
    return isMuted;
};


// 정밀한 스케줄링을 위해 선택적 startTime을 받도록 playTone 업데이트
const playTone = (
    frequency: number, 
    duration: number, 
    type: OscillatorType = 'sine', 
    volume: number = 0.1, 
    destination?: AudioNode,
    startTime?: number
) => {
  const ctx = getAudioContext();
  if (!ctx) return;

  // 효과음은 음소거 버튼을 직접 따릅니다.
  if (!destination && isMuted) return;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  // 지정된 대상(musicGainNode) 또는 메인 출력(SFX용)에 연결합니다.
  gainNode.connect(destination || ctx.destination);

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const playAt = startTime || ctx.currentTime;
  gainNode.gain.setValueAtTime(0, playAt);
  gainNode.gain.linearRampToValueAtTime(volume, playAt + 0.01); 

  oscillator.start(playAt);

  gainNode.gain.exponentialRampToValueAtTime(0.00001, playAt + duration);
  oscillator.stop(playAt + duration);
};


// --- Music Definitions ---

// Normal (3 lives) - Quarter notes, 8s loop
const normalMelody = [
    { freq: 523.25, delay: 0 }, { freq: 659.25, delay: 500 }, { freq: 783.99, delay: 1000 }, { freq: 659.25, delay: 1500 },
    { freq: 493.88, delay: 2000 }, { freq: 587.33, delay: 2500 }, { freq: 783.99, delay: 3000 }, { freq: 587.33, delay: 3500 },
    { freq: 523.25, delay: 4000 }, { freq: 659.25, delay: 4500 }, { freq: 880.00, delay: 5000 }, { freq: 659.25, delay: 5500 },
    { freq: 440.00, delay: 6000 }, { freq: 523.25, delay: 6500 }, { freq: 698.46, delay: 7000 }, { freq: 783.99, delay: 7500 },
];
const normalBassline = [
    { freq: 130.81, delay: 0 }, { freq: 98.00, delay: 2000 }, { freq: 110.00, delay: 4000 }, { freq: 87.31, delay: 6000 },
];
const normalLoopDuration = 8000;

// Urgent (2 lives) - Eighth notes, 4s loop
const urgentMelody = [
    { freq: 523.25, delay: 0 }, { freq: 659.25, delay: 250 }, { freq: 783.99, delay: 500 }, { freq: 659.25, delay: 750 },
    { freq: 493.88, delay: 1000 }, { freq: 587.33, delay: 1250 }, { freq: 783.99, delay: 1500 }, { freq: 587.33, delay: 1750 },
    { freq: 523.25, delay: 2000 }, { freq: 659.25, delay: 2250 }, { freq: 880.00, delay: 2500 }, { freq: 659.25, delay: 2750 },
    { freq: 440.00, delay: 3000 }, { freq: 523.25, delay: 3250 }, { freq: 698.46, delay: 3500 }, { freq: 783.99, delay: 3750 },
];
const urgentBassline = [
    { freq: 130.81, delay: 0 }, { freq: 98.00, delay: 1000 }, { freq: 110.00, delay: 2000 }, { freq: 87.31, delay: 3000 },
];
const urgentLoopDuration = 4000;

// Critical (1 life) - Triplets, 4s loop
const tripletStep = 4000 / 24;
const criticalMelody = [
    { freq: 523.25, delay: 0 * tripletStep }, { freq: 659.25, delay: 1 * tripletStep }, { freq: 783.99, delay: 2 * tripletStep },
    { freq: 523.25, delay: 3 * tripletStep }, { freq: 783.99, delay: 4 * tripletStep }, { freq: 659.25, delay: 5 * tripletStep },
    { freq: 493.88, delay: 6 * tripletStep }, { freq: 587.33, delay: 7 * tripletStep }, { freq: 783.99, delay: 8 * tripletStep },
    { freq: 493.88, delay: 9 * tripletStep }, { freq: 783.99, delay: 10 * tripletStep }, { freq: 587.33, delay: 11 * tripletStep },
    { freq: 523.25, delay: 12 * tripletStep }, { freq: 659.25, delay: 13 * tripletStep }, { freq: 880.00, delay: 14 * tripletStep },
    { freq: 523.25, delay: 15 * tripletStep }, { freq: 880.00, delay: 16 * tripletStep }, { freq: 659.25, delay: 17 * tripletStep },
    { freq: 440.00, delay: 18 * tripletStep }, { freq: 523.25, delay: 19 * tripletStep }, { freq: 698.46, delay: 20 * tripletStep },
    { freq: 493.88, delay: 21 * tripletStep }, { freq: 587.33, delay: 22 * tripletStep }, { freq: 783.99, delay: 23 * tripletStep },
];
const criticalBassline = urgentBassline;
const criticalLoopDuration = 4000;


export const playBackgroundMusic = (lives: number = 3) => {
  if (musicLoopTimeoutId !== null) return; // 이미 재생 중
  if (isMuted) return; // 전체 음소거 상태에서는 시작하지 않음

  currentLives = lives;

  const ctx = getAudioContext();
  if (!ctx || !musicGainNode) return;

  // 페이드 인으로 음악 볼륨 복원
  musicGainNode.gain.cancelScheduledValues(ctx.currentTime);
  musicGainNode.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.5);

  let melody: typeof normalMelody;
  let bassline: typeof normalBassline;
  let loopDuration: number;

  switch (lives) {
    case 1:
      melody = criticalMelody;
      bassline = criticalBassline;
      loopDuration = criticalLoopDuration;
      break;
    case 2:
      melody = urgentMelody;
      bassline = urgentBassline;
      loopDuration = urgentLoopDuration;
      break;
    default:
      melody = normalMelody;
      bassline = normalBassline;
      loopDuration = normalLoopDuration;
      break;
  }
  
  const playLoop = () => {
    const context = getAudioContext();
    if (!context || !musicGainNode) return;

    const loopStartTime = context.currentTime;
    
    melody.forEach(note => {
        const noteStartTime = loopStartTime + note.delay / 1000.0;
        playTone(note.freq, 0.2, 'square', 0.05, musicGainNode, noteStartTime);
    });

    bassline.forEach(note => {
        const noteStartTime = loopStartTime + note.delay / 1000.0;
        playTone(note.freq, 1.8, 'triangle', 0.08, musicGainNode, noteStartTime);
    });
    
    musicLoopTimeoutId = window.setTimeout(playLoop, loopDuration);
  };

  playLoop();
};

export const stopBackgroundMusic = (fadeOut: boolean = true) => {
  if (musicLoopTimeoutId !== null) {
    clearTimeout(musicLoopTimeoutId);
    musicLoopTimeoutId = null;
  }
  
  // 갑작스러운 중단을 막기 위해 음악을 부드럽게 페이드 아웃
  const ctx = getAudioContext();
  if (ctx && musicGainNode) {
    musicGainNode.gain.cancelScheduledValues(ctx.currentTime);
    if (fadeOut) {
      musicGainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    } else {
      musicGainNode.gain.setValueAtTime(0, ctx.currentTime);
    }
  }
};

export const updateBackgroundMusic = (lives: number) => {
  // 1-3 범위 밖의 값을 처리
  const newLivesState = Math.max(1, Math.min(3, lives));
  
  // 음악이 재생 중이 아니거나 상태가 동일하면 아무것도 하지 않음
  if (musicLoopTimeoutId === null || newLivesState === currentLives) {
    return;
  }

  // 즉시 음악을 전환
  stopBackgroundMusic(false); // 페이드 아웃 없이 중지
  playBackgroundMusic(newLivesState);
};

export const playClickSound = () => {
  playTone(600, 0.05, 'sine', 0.1);
};

export const playSuccessSound = () => {
  playTone(523.25, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(783.99, 0.15, 'sine', 0.1), 120);
};

export const playFailureSound = () => {
  playTone(196.00, 0.15, 'triangle', 0.1);
  setTimeout(() => playTone(130.81, 0.25, 'triangle', 0.1), 150);
};

export const playStartSound = () => {
    playTone(261.63, 0.1, 'sine', 0.1);
    setTimeout(() => playTone(329.63, 0.1, 'sine', 0.1), 100);
    setTimeout(() => playTone(392.00, 0.2, 'sine', 0.1), 200);
};