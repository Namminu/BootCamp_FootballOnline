import { prisma } from "../utils/prisma/index.js";

export async function calculateSquadAverageStats(accountId) {
  // 1. 해당 계정이 속한 스쿼드 찾기
  const account = await prisma.accounts.findUnique({
    where: { account_id: accountId },
    select: {
      squad: true, // 계정의 스쿼드
    },
  });

  if (!account || !account.squad) {
    throw new Error("스쿼드 정보가 없습니다.");
  }

  const squadId = account.squad.squad_id; // 계정의 스쿼드 ID

  // 2. 해당 스쿼드에 속한 모든 멤버들의 능력치 조회
  const squadMembers = await prisma.squad.findUnique({
    where: {
      squad_id: squadId,
    },
    select: {
      squad_player1: true,
      squad_player2: true,
      squad_player3: true,
    },
  });

  if (!squadMembers) {
    throw new Error("스쿼드 멤버를 찾을 수 없습니다.");
  }

  // 3. 각 멤버의 능력치 평균 구하기
  const playerAverages = [];

  // 선수 1, 2, 3의 평균 능력치 계산
  for (let i = 1; i <= 3; i++) {
    const player = await prisma.players.findUnique({
      where: {
        player_id: squadMembers[`squad_player${i}`],
      },
      select: {
        player_speed: true,
        player_finish: true,
        player_power: true,
        player_defense: true,
        player_stamina: true,
      },
    });

    const playerAverage =
      (player.player_speed +
        player.player_finish +
        player.player_power +
        player.player_defense +
        player.player_stamina) /
      5;
    playerAverages.push(playerAverage);
  }

  // 4. 팀 평균 능력치 계산
  const squadAverage =
    playerAverages.reduce((sum, avg) => sum + avg, 0) / playerAverages.length;

  return squadAverage;
}

export function playGame(currentTeamAverageStat, opponentTeamAverageStat) {
  const goals = []; // 각 팀의 골 기록을 담을 배열
  const maxMinutes = 15; // 게임 시간 15분
  let currentTeamScore = 0;
  let opponentTeamScore = 0;

  // 각 팀의 평균 능력치를 체크하고, 그 값이 유효한지 확인
  const currentTeamAverage = currentTeamAverageStat ?? 0; // 직접 계산한 평균 능력치
  const opponentTeamAverage = opponentTeamAverageStat ?? 0; // 직접 계산한 평균 능력치

  // 15분 동안 진행되는 경기
  for (let minute = 1; minute <= maxMinutes; minute++) {
    // 매 분마다 랜덤 숫자 계산
    const currentTeamChance = Math.random() * 100; // 0 ~ 100 사이의 값 (현재 팀의 골 확률)
    const opponentTeamChance = Math.random() * 100; // 0 ~ 100 사이의 값 (상대 팀의 골 확률)

    // 현재 팀의 골 확률을 능력치 기반으로 비교
    if (currentTeamChance < currentTeamAverage) {
      goals.push({ team: "현재 팀", minute: minute }); // 골이 들어간 분과 팀
      currentTeamScore++; // 현재 팀 골 수 증가
    }

    // 상대 팀의 골 확률을 능력치 기반으로 비교
    if (opponentTeamChance < opponentTeamAverage) {
      goals.push({ team: "상대 팀", minute: minute });
      opponentTeamScore++; // 상대 팀 골 수 증가
    }
  }

  // 게임 결과 결정 (스코어 계산)
  let gameResult = "";
  if (currentTeamScore > opponentTeamScore) {
    gameResult = "승리";
  } else if (currentTeamScore < opponentTeamScore) {
    gameResult = "패배";
  } else {
    gameResult = "무승부";
  }

  return {
    gameResult,
    currentTeamScore,
    opponentTeamScore,
    goals,
  };
}

export function calculateMMR(
  currentRank,
  opponentRank,
  currentWon,
  currentMMR,
  opponentMMR
) {
  let currentMMRChange = 0;
  let opponentMMRChange = 0;

  const rankDifference = currentRank - opponentRank; // 랭킹 차이 계산

  // 랭킹 차이에 따른 MMR 변동 계산
  if (rankDifference === 1) {
    if (currentWon) {
      currentMMRChange = 15;
      opponentMMRChange = -10;
    } else {
      currentMMRChange = -10;
      opponentMMRChange = 15;
    }
  } else if (rankDifference === 2) {
    if (currentWon) {
      currentMMRChange = 20;
      opponentMMRChange = -5;
    } else {
      currentMMRChange = -5;
      opponentMMRChange = 20;
    }
  } else if (rankDifference === -1) {
    if (currentWon) {
      currentMMRChange = 10;
      opponentMMRChange = -15;
    } else {
      currentMMRChange = -15;
      opponentMMRChange = 10;
    }
  } else if (rankDifference === -2) {
    if (currentWon) {
      currentMMRChange = 5;
      opponentMMRChange = -20;
    } else {
      currentMMRChange = -20;
      opponentMMRChange = 5;
    }
  } else if (rankDifference === 0) {
    if (currentWon) {
      currentMMRChange = 10;
      opponentMMRChange = -5;
    } else {
      currentMMRChange = -5;
      opponentMMRChange = 10;
    }
  }

  return { currentMMRChange, opponentMMRChange };
}