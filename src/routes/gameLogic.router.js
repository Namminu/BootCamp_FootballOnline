import { prisma } from "../utils/prisma/index.js";

export async function calculateSquadAverageStats(accountId) {
  // 1. 해당 계정이 속한 스쿼드 찾기
  const account = await prisma.accounts.findUnique({
    where: { account_id: accountId },
    select: {
      account_name: true, // 계정의 이름 추가
      squad: true, // 계정의 스쿼드
    },
  });

  // 스쿼드가 없으면 null 반환
  if (!account || !account.squad) {
    return null;
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
  const playerIds = [
    squadMembers.squad_player1,
    squadMembers.squad_player2,
    squadMembers.squad_player3,
  ];

  // 선수 능력치 계산 함수
  const calculatePlayerAverage = (player) => {
    if (!player) {
      throw new Error("선수 데이터를 찾을 수 없습니다.");
    }
    return (
      (player.player_speed +
        player.player_finish +
        player.player_power +
        player.player_defense +
        player.player_stamina) /
      5
    );
  };

  // 병렬로 선수들의 능력치 데이터를 가져오기
  const players = await Promise.all(
    playerIds.map((playerId) =>
      prisma.players.findUnique({
        where: { player_id: playerId },
        select: {
          player_speed: true,
          player_finish: true,
          player_power: true,
          player_defense: true,
          player_stamina: true,
        },
      })
    )
  );

  // 각 선수의 평균 능력치 계산
  const playerAverages = players.map((player) =>
    calculatePlayerAverage(player)
  );

  // 4. 팀 평균 능력치 계산
  const squadAverage =
    playerAverages.reduce((sum, avg) => sum + avg, 0) / playerAverages.length;

  return { squadAverage, accountName: account.account_name };
}

export function playGame(
  currentTeamAverageStat,
  opponentTeamAverageStat,
  currentTeamName,
  opponentTeamName
) {
  const goals = []; // 각 팀의 골 기록을 담을 배열
  const maxMinutes = 15; // 게임 시간 15분
  let currentTeamScore = 0;
  let opponentTeamScore = 0;

  // 각 팀의 평균 능력치를 체크하고
  const currentTeamAverage = currentTeamAverageStat; // 직접 계산한 평균 능력치
  const opponentTeamAverage = opponentTeamAverageStat; // 직접 계산한 평균 능력치

  // 15분 동안 진행되는 경기
  for (let minute = 1; minute <= maxMinutes; minute++) {
    // 매 분마다 랜덤 숫자 계산
    const currentTeamChance = Math.random() * 200; //
    const opponentTeamChance = Math.random() * 200; //

    // 현재 팀의 골 확률을 능력치 기반으로 비교
    if (currentTeamChance < currentTeamAverage) {
      goals.push(`${currentTeamName} 팀이 ${minute}분에 골을 넣었습니다.`);
      currentTeamScore++; // 현재 팀 골 수 증가
    }

    // 상대 팀의 골 확률을 능력치 기반으로 비교
    if (opponentTeamChance < opponentTeamAverage) {
      goals.push(`${opponentTeamName} 팀이 ${minute}분에 골을 넣었습니다.`);
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

//mmr
export async function calculateMMR(
  currentRank,
  opponentRank,
  currentWon,
  currentAccountId,
  opponentAccountId
) {
  let currentMMRChange = 0;
  let opponentMMRChange = 0;

  const rankDifference = currentRank - opponentRank; // 랭킹 차이 계산

  // 각 랭킹 차이에 따른 MMR 변동값 정의
  const mmrChanges = {
    1: { win: 15, loss: -10 }, // 승리 +15, 패배 -10
    2: { win: 20, loss: -5 }, // 승리 +20, 패배 -5
    "-1": { win: 10, loss: -15 }, // 승리 +10, 패배 -15
    "-2": { win: 5, loss: -20 }, // 승리 +5, 패배 -20
    0: { win: 10, loss: -5 }, // 동일 랭크일 경우
  };

  // MMR 변동값을 가져오기 (기본값은 0으로 설정)
  const change = mmrChanges[rankDifference] || { win: 0, loss: 0 };

  // MMR 변동 계산
  if (currentWon === true) {
    currentMMRChange = change.win;
    opponentMMRChange = change.win * -1;
  } else if (currentWon === false) {
    currentMMRChange = change.loss;
    opponentMMRChange = change.loss * -1;
  }

  // 현재 계정과 상대 계정의 MMR을 업데이트
  const currentAccount = await prisma.accounts.findUnique({
    where: { account_id: currentAccountId },
  });
  const opponentAccount = await prisma.accounts.findUnique({
    where: { account_id: opponentAccountId },
  });

  const updatedCurrentAccount = await prisma.accounts.update({
    where: { account_id: currentAccountId },
    data: { mmr: currentAccount.mmr + currentMMRChange },
  });

  const updatedOpponentAccount = await prisma.accounts.update({
    where: { account_id: opponentAccountId },
    data: { mmr: opponentAccount.mmr + opponentMMRChange },
  });

  return {
    updatedCurrentAccount,
    updatedOpponentAccount,
    currentMMRChange,
    opponentMMRChange,
  };
}
