import express from "express";
import { prisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js"; // 인증 미들웨어

const router = express.Router();

// 게임 로비 기능: 인증된 사용자만 접근 가능
router.get("/lobby", authMiddleware, async (req, res, next) => {
  try {
    const { account_id: currentAccountId } = req.account; // 인증된 계정의 ID

    // 1. 스쿼드를 가지고 있는 계정만 조회 (스쿼드가 있는 유저만 랭킹에 포함)
    const rankings = await prisma.accounts.findMany({
      where: {
        squad: {
          isNot: null, // 스쿼드가 있는 계정만 조회
        },
      },
      select: {
        account_id: true,
        account_name: true,
        mmr: true,
      },
      orderBy: {
        mmr: "desc", // MMR 내림차순 정렬
      },
    });

    // 2. 데이터가 없으면 "등록된 유저가 없다"는 메시지 반환
    if (rankings.length === 0) {
      return res
        .status(200)
        .json({ message: "현재 게임을 시작할 수 있는 유저가 없습니다." });
    }

    // 3. 각 계정에 랭킹 순서를 부여합니다.
    const rankedAccounts = rankings.map((account, index) => ({
      rank: index + 1, // 1부터 시작하는 랭킹
      account_id: account.account_id,
      account_name: account.account_name,
      mmr: account.mmr,
    }));

    // 4. 현재 계정의 랭킹을 계산합니다.
    const currentRank =
      rankedAccounts.findIndex(
        (account) => account.account_id === currentAccountId
      ) + 1;

    // 5. 매칭 가능한 계정 찾기 (자기 자신을 제외한 랭킹 +-2 범위)
    const matchedAccounts = rankedAccounts.filter((account) => {
      const rankDifference = Math.abs(account.rank - currentRank);

      // 자기 자신을 제외하고, 랭킹 차이가 ±2 범위 내인 계정만 포함
      return account.account_id !== currentAccountId && rankDifference <= 2;
    });

    // 6. 매칭된 계정들이 없으면 알림
    if (matchedAccounts.length === 0) {
      return res.status(200).json({
        message: "현재 랭킹 차이가 너무 커서 매칭할 수 있는 유저가 없습니다.",
      });
    }

    // 7. 매칭 가능한 유저들을 반환
    return res.status(200).json({
      message: "매칭 가능한 계정들",
      data: matchedAccounts,
    });
  } catch (error) {
    next(error); // 에러 핸들러로 에러 전달
  }
});

/* 여기서 부터 게임 진행 관련 코드 */

// 팀의 평균 스텟을 계산하는 함수
async function calculateSquadAverageStats(accountId) {
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

  // 선수 1의 평균 능력치 계산
  const player1 = await prisma.players.findUnique({
    where: {
      player_id: squadMembers.squad_player1,
    },
    select: {
      player_speed: true,
      player_finish: true,
      player_power: true,
      player_defense: true,
      player_stamina: true,
    },
  });

  // 로그: 선수 1의 개별 능력치
  console.log(`선수 1 능력치:`);
  console.log(`속도: ${player1.player_speed}`);
  console.log(`완주: ${player1.player_finish}`);
  console.log(`파워: ${player1.player_power}`);
  console.log(`수비: ${player1.player_defense}`);
  console.log(`체력: ${player1.player_stamina}`);

  const player1Average =
    (player1.player_speed +
      player1.player_finish +
      player1.player_power +
      player1.player_defense +
      player1.player_stamina) /
    5;
  console.log(`선수 1 평균 능력치: ${player1Average}`); // 로그 추가
  playerAverages.push(player1Average);

  // 선수 2의 평균 능력치 계산
  const player2 = await prisma.players.findUnique({
    where: {
      player_id: squadMembers.squad_player2,
    },
    select: {
      player_speed: true,
      player_finish: true,
      player_power: true,
      player_defense: true,
      player_stamina: true,
    },
  });

  // 로그: 선수 2의 개별 능력치
  console.log(`선수 2 능력치:`);
  console.log(`속도: ${player2.player_speed}`);
  console.log(`완주: ${player2.player_finish}`);
  console.log(`파워: ${player2.player_power}`);
  console.log(`수비: ${player2.player_defense}`);
  console.log(`체력: ${player2.player_stamina}`);

  const player2Average =
    (player2.player_speed +
      player2.player_finish +
      player2.player_power +
      player2.player_defense +
      player2.player_stamina) /
    5;
  console.log(`선수 2 평균 능력치: ${player2Average}`); // 로그 추가
  playerAverages.push(player2Average);

  // 선수 3의 평균 능력치 계산
  const player3 = await prisma.players.findUnique({
    where: {
      player_id: squadMembers.squad_player3,
    },
    select: {
      player_speed: true,
      player_finish: true,
      player_power: true,
      player_defense: true,
      player_stamina: true,
    },
  });

  // 로그: 선수 3의 개별 능력치
  console.log(`선수 3 능력치:`);
  console.log(`속도: ${player3.player_speed}`);
  console.log(`완주: ${player3.player_finish}`);
  console.log(`파워: ${player3.player_power}`);
  console.log(`수비: ${player3.player_defense}`);
  console.log(`체력: ${player3.player_stamina}`);

  const player3Average =
    (player3.player_speed +
      player3.player_finish +
      player3.player_power +
      player3.player_defense +
      player3.player_stamina) /
    5;
  console.log(`선수 3 평균 능력치: ${player3Average}`); // 로그 추가
  playerAverages.push(player3Average);

  // 4. 팀 평균 능력치 계산
  const squadAverage =
    playerAverages.reduce((sum, avg) => sum + avg, 0) / playerAverages.length;

  console.log(`스쿼드 평균 능력치: ${squadAverage}`); // 로그 추가

  return squadAverage;
}

// 게임 승패 결과를 랜덤으로 처리하는 함수 (15분 동안 1분마다 동시에 골 기회)
function playGame(currentTeamAverageStat, opponentTeamAverageStat) {
  const goals = []; // 각 팀의 골 기록을 담을 배열
  const maxMinutes = 15; // 게임 시간 15분
  let currentTeamScore = 0;
  let opponentTeamScore = 0;

  // 각 팀의 평균 능력치를 체크하고, 그 값이 유효한지 확인
  const currentTeamAverage = currentTeamAverageStat ?? 0; // 직접 계산한 평균 능력치
  const opponentTeamAverage = opponentTeamAverageStat ?? 0; // 직접 계산한 평균 능력치

  console.log(`현재 팀 평균 능력치: ${currentTeamAverage.toFixed(2)}`);
  console.log(`상대 팀 평균 능력치: ${opponentTeamAverage.toFixed(2)}`);

  // 15분 동안 진행되는 경기
  for (let minute = 1; minute <= maxMinutes; minute++) {
    // 매 분마다 랜덤 숫자 계산
    const currentTeamChance = Math.random() * 100; // 0 ~ 100 사이의 값 (현재 팀의 골 확률)
    const opponentTeamChance = Math.random() * 100; // 0 ~ 100 사이의 값 (상대 팀의 골 확률)

    console.log(`분 ${minute}:`);
    console.log(
      `현재 팀의 랜덤 확률: ${currentTeamChance.toFixed(2)} vs 평균 능력치: ${currentTeamAverage.toFixed(2)}`
    );
    console.log(
      `상대 팀의 랜덤 확률: ${opponentTeamChance.toFixed(2)} vs 평균 능력치: ${opponentTeamAverage.toFixed(2)}`
    );

    // 현재 팀의 골 확률을 능력치 기반으로 비교
    if (currentTeamChance < currentTeamAverage) {
      goals.push({ team: "현재 팀", minute: minute }); // 골이 들어간 분과 팀
      currentTeamScore++; // 현재 팀 골 수 증가
      console.log(`현재 팀이 골을 넣었습니다!`);
    }

    // 상대 팀의 골 확률을 능력치 기반으로 비교
    if (opponentTeamChance < opponentTeamAverage) {
      goals.push({ team: "상대 팀", minute: minute });
      opponentTeamScore++; // 상대 팀 골 수 증가
      console.log(`상대 팀이 골을 넣었습니다!`);
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

  // 최종 게임 결과 로그 출력
  console.log(`게임 결과: ${gameResult}`);
  console.log(`현재 팀 골 수: ${currentTeamScore}`);
  console.log(`상대 팀 골 수: ${opponentTeamScore}`);

  return {
    gameResult,
    currentTeamScore,
    opponentTeamScore,
    goals,
  };
}

// MMR 변동을 계산하는 함수 (등수 차이에 따라)
function calculateMMR(
  currentRank, // 랭킹
  opponentRank, // 상대의 랭킹
  currentWon, // 게임 결과 (승리 여부)
  currentMMR, // 현재 MMR (랭킹 변화에 따른 MMR 변동을 적용)
  opponentMMR // 상대 MMR
) {
  let currentMMRChange = 0;
  let opponentMMRChange = 0;

  const rankDifference = currentRank - opponentRank; // 랭킹 차이 계산

  console.log(
    `현재 계정 랭킹: ${currentRank}, 상대 계정 랭킹: ${opponentRank}`
  );
  console.log(`랭킹 차이: ${rankDifference}`);

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
    // MMR이 같은 경우
    if (currentWon) {
      currentMMRChange = 10; // 승리한 팀에게 약간의 MMR 추가
      opponentMMRChange = -5; // 패배한 팀에게 MMR 감소
    } else {
      currentMMRChange = -5; // 패배한 팀에게 MMR 감소
      opponentMMRChange = 10; // 승리한 팀에게 MMR 추가
    }
  }

  console.log(`현재 MMR 변동: ${currentMMRChange}`);
  console.log(`상대 MMR 변동: ${opponentMMRChange}`);

  return { currentMMRChange, opponentMMRChange };
}

router.post("/game/:account_id", authMiddleware, async (req, res, next) => {
  try {
    const { account_id } = req.params; // URL 파라미터에서 account_id를 추출
    const currentAccountId = req.account.account_id; // 인증된 계정 ID

    // 1. 인증된 계정 ID와 URL 파라미터로 받은 account_id가 일치하는지 확인
    if (currentAccountId !== parseInt(account_id)) {
      return res
        .status(403)
        .json({ message: "인증된 사용자만 이 게임에 참여할 수 있습니다." });
    }

    const { opponentAccountId } = req.body; // 상대 계정 ID

    // 상대 계정 ID가 없으면 오류 반환
    if (!opponentAccountId) {
      return res
        .status(400)
        .json({ message: "상대 계정 ID가 제공되지 않았습니다." });
    }

    // 2. 모든 계정의 랭킹을 계산 (MMR 기준으로)
    const rankings = await prisma.accounts.findMany({
      where: {
        squad: { isNot: null }, // 스쿼드가 있는 계정만 조회
      },
      select: {
        account_id: true,
        account_name: true,
        mmr: true,
      },
      orderBy: {
        mmr: "desc", // MMR 내림차순 정렬
      },
    });

    // 3. 데이터가 없으면 "등록된 유저가 없다"는 메시지 반환
    if (rankings.length === 0) {
      return res
        .status(200)
        .json({ message: "현재 게임을 시작할 수 있는 유저가 없습니다." });
    }

    // 4. 현재 계정의 랭킹 계산
    const currentRank =
      rankings.findIndex((account) => account.account_id === currentAccountId) +
      1;

    // 5. 상대 계정의 랭킹 계산
    const opponentRank =
      rankings.findIndex(
        (account) => account.account_id === opponentAccountId
      ) + 1;

    // 6. 랭킹 차이가 +-2 범위 내인지 확인
    const rankDifference = Math.abs(currentRank - opponentRank);

    if (rankDifference > 2) {
      return res.status(200).json({
        message: "현재 랭킹 차이가 너무 커서 매칭할 수 있는 유저가 없습니다.",
      });
    }

    // 7. 각 팀의 평균 능력치 계산
    const currentTeamAverageStat =
      await calculateSquadAverageStats(currentAccountId);
    const opponentTeamAverageStat =
      await calculateSquadAverageStats(opponentAccountId);

    console.log(`현재 팀 평균 능력치: ${currentTeamAverageStat}`);
    console.log(`상대 팀 평균 능력치: ${opponentTeamAverageStat}`);

    // 8. 게임을 진행하여 승패 결정
    const gameResultData = playGame(
      currentTeamAverageStat,
      opponentTeamAverageStat
    );

    // 9. 게임 결과 (승리, 패배, 무승부) 처리
    const { gameResult, currentTeamScore, opponentTeamScore, goals } =
      gameResultData;

    // 10. MMR 변동 계산 (게임 결과에 따른 MMR 변동)
    const currentAccount = await prisma.accounts.findUnique({
      where: { account_id: currentAccountId },
    });
    const opponentAccount = await prisma.accounts.findUnique({
      where: { account_id: opponentAccountId },
    });

    const { currentMMRChange, opponentMMRChange } = calculateMMR(
      currentRank,
      opponentRank,
      gameResult === "승리",
      currentAccount.mmr,
      opponentAccount.mmr
    );

    // 11. MMR 업데이트
    const updatedCurrentAccount = await prisma.accounts.update({
      where: { account_id: currentAccountId },
      data: { mmr: currentAccount.mmr + currentMMRChange },
    });

    const updatedOpponentAccount = await prisma.accounts.update({
      where: { account_id: opponentAccountId },
      data: { mmr: opponentAccount.mmr + opponentMMRChange },
    });

    // 12. 게임 결과 반환
    return res.status(200).json({
      message: `게임 결과: ${gameResult}`,
      currentMMR: updatedCurrentAccount.mmr,
      opponentMMR: updatedOpponentAccount.mmr,
      currentTeamScore,
      opponentTeamScore,
      goals,
    });
  } catch (error) {
    console.error("Error during game processing:", error);
    next(error); // 에러 핸들러
  }
});

export default router;
