export interface LeaderboardEntry {
  name: string;
  score: number;
}

// 이 URL은 Google Apps Script를 웹 앱으로 배포한 후 얻게 되는 URL입니다.
// 사용자가 제공한 URL을 여기에 직접 설정합니다.
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyAzZVi1jzHV-ibXgF_nZLUOqL3OOkqiHYXWRBy4pDPsOjJvMY4zwZpkZV2YZXazAReDA/exec';

/**
 * 리더보드 상위 점수를 가져옵니다.
 * @returns {Promise<LeaderboardEntry[]>} 상위 3명의 리더보드 데이터 배열
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!APPS_SCRIPT_URL) {
    console.warn("Apps Script URL is not configured. Leaderboard will not be available.");
    // URL이 없는 경우에도 앱이 작동하도록 빈 배열을 반환합니다.
    return [];
  }
  
  try {
    // CORS 오류를 피하기 위해 GET 요청에서 불필요한 'Content-Type' 헤더를 제거했습니다.
    // GET 요청은 본문(body)이 없으므로 해당 헤더는 문제를 유발할 수 있습니다.
    const response = await fetch(APPS_SCRIPT_URL, {
        method: 'GET',
        redirect: 'follow', // Apps Script는 GET 요청 시 리다이렉션을 수행할 수 있습니다.
    });
    
    if (!response.ok) {
        // 더 나은 디버깅을 위해 상태 코드와 텍스트를 포함합니다.
        throw new Error(`Failed to fetch leaderboard: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.leaderboard;

  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    // 여기서 발생한 오류는 네트워크 문제(CORS 등)일 가능성이 높습니다.
    throw new Error('리더보드 데이터를 가져오는 데 실패했습니다. 네트워크 연결 또는 CORS 설정을 확인하세요.');
  }
}

/**
 * 새로운 점수를 리더보드에 제출합니다.
 * @param {string} name 플레이어 이름
 * @param {number} score 플레이어 점수
 * @returns {Promise<void>}
 */
export async function submitScore(name: string, score: number): Promise<void> {
    if (!APPS_SCRIPT_URL) {
        throw new Error("Apps Script URL is not configured. Cannot submit score.");
    }

    try {
        // POST 요청은 'text/plain' Content-Type을 사용하여 CORS preflight 요청을 피합니다.
        // 이것은 Google Apps Script와 통신할 때 일반적인 패턴입니다.
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify({ name, score }),
            mode: 'cors',
        });

        if (!response.ok) {
            throw new Error(`Failed to submit score: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        if (result.status !== 'success') {
            throw new Error(result.message || 'An unknown error occurred during score submission.');
        }

    } catch (error) {
        console.error("Error submitting score:", error);
        throw new Error('점수 제출에 실패했습니다. 네트워크 연결 또는 CORS 설정을 확인하세요.');
    }
}
