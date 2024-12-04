import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js'; // 인증 미들웨어

const router = express.Router();

// 게임 로비 기능: 인증된 사용자만 접근 가능
router.get("/lobby", authMiddleware, async (req, res, next) => {
  try {
    const currentAccountId = req.account.account_id; // 인증된 계정의 ID

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
      account_name: account.account_name,
      mmr: account.mmr,
    }));

    // 4. 매칭 가능한 계정 찾기 (랭킹 +-2 범위)
    const matchedAccounts = [];
    const currentRank =
      rankings.findIndex((account) => account.account_id === currentAccountId) +
      1; // 현재 인증된 계정의 랭킹 (클라이언트에서 전달받은 rank)

    // 랭킹 +-2 범위 내의 계정을 필터링
    for (let i = 0; i < rankedAccounts.length; i++) {
      const account = rankedAccounts[i];

      // 현재 계정과 비교하여 +-2 랭킹 차이 내의 유저만 추가
      if (Math.abs(account.rank - currentRank) <= 2) {
        matchedAccounts.push(account);
      }
    }

    // 5. 매칭된 계정들이 없으면 알림
    if (matchedAccounts.length === 0) {
      return res.status(200).json({
        message: "현재 랭킹 차이가 너무 커서 매칭할 수 있는 유저가 없습니다.",
      });
    }

    // 6. 매칭 가능한 유저들을 반환
    return res.status(200).json({
      message: "매칭 가능한 계정들",
      data: matchedAccounts,
    });
  } catch (error) {
    next(error); // 에러 핸들러로 에러 전달
  }
});

// 골을 넣을지 여부 결정 함수
function canScore(squadAvg) {
  const randomGoalChance = Math.floor(Math.random() * 100) + 1; // 1에서 100 사이의 정수 랜덤 생성
  const adjustedChance = Math.min(squadAvg, 90); // 능력치가 너무 높으면 골 확률을 90%로 제한
  return randomGoalChance <= adjustedChance; // 골이 들어갈 확률을 결정
}

// 스쿼드 평균 능력치 계산 함수
async function calculateSquadAverage(squadId) {
  const squad = await prisma.squad.findUnique({
    where: { squad_id: squadId },
    include: {
      players1: { include: { players: true } },
      players2: { include: { players: true } },
      players3: { include: { players: true } },
    },
  });

  const players = [
    ...squad.players1.players,
    ...squad.players2.players,
    ...squad.players3.players,
  ];

  let totalAvg = 0;

  players.forEach(player => {
    const playerStats = [
      player.player_speed,
      player.player_finish,
      player.player_power,
      player.player_defense,
      player.player_stamina,
    ];

    const playerAvg =
      playerStats.reduce((sum, stat) => sum + stat, 0) / playerStats.length;
    totalAvg += playerAvg;
  });

  const squadAvg = totalAvg / players.length;
  return squadAvg;
}

// MMR 변화 계산 함수
function calculateMMRChange(rankingDiff, teamGoals, opponentGoals) {
  let mmrChange = 0;

  if (teamGoals > opponentGoals) {
    if (rankingDiff > 0) {
      mmrChange = 20 - rankingDiff * 5; // 상대가 낮으면 많이 오름
    } else {
      mmrChange = 10; // 승리할 때 기본적으로 10점 증가
    }
  } else if (teamGoals < opponentGoals) {
    if (rankingDiff > 0) {
      mmrChange = -10; // 높은 랭킹에서는 많이 떨어짐
    } else {
      mmrChange = -20 + rankingDiff * 5; // 상대가 낮으면 적게 떨어짐
    }
  }

  return mmrChange;
}

// 게임 결과 계산 및 MMR 업데이트 함수
async function startGame(team1SquadId, team2SquadId) {
  try {
    const team1Avg = await calculateSquadAverage(team1SquadId);
    const team2Avg = await calculateSquadAverage(team2SquadId);

    let team1Goals = 0;
    let team2Goals = 0;

    const goalLog = [];

    // 고정된 15분 동안 경기를 진행
    for (let minute = 1; minute <= 15; minute++) {
      if (canScore(team1Avg)) {
        team1Goals++;
        goalLog.push({ team: '팀 1', minute, goal: true });
      }

      if (canScore(team2Avg)) {
        team2Goals++;
        goalLog.push({ team: '팀 2', minute, goal: true });
      }
    }

    goalLog.sort((a, b) => a.minute - b.minute);

    return { team1Goals, team2Goals, goalLog };
  } catch (error) {
    console.error('게임 진행 중 에러 발생:', error);
    throw new Error('게임 진행에 문제가 발생했습니다.');
  }
}

// 게임 라우트: 상대 유저와 경기 시작
router.post("/start-game/:accountId", authMiddleware, async (req, res) => {
  const { accountId } = req.params; // 상대 계정의 accountId

  try {
    const currentAccountId = req.account.account_id; // 현재 인증된 계정의 ID

    // 1. 현재 계정이 스쿼드를 가지고 있는지 확인
    const currentAccountSquad = await prisma.squad.findUnique({
      where: { account_id: currentAccountId },
    });

    if (!currentAccountSquad) {
      return res.status(400).json({
        message: "Squad를 짜야 게임을 할 수 있습니다.",
      });
    }

    // 2. 상대 계정이 존재하는지 확인
    const opponentAccount = await prisma.accounts.findUnique({
      where: { account_id: parseInt(accountId) },
    });

    if (!opponentAccount) {
      return res.status(404).json({ message: "상대 계정을 찾을 수 없습니다." });
    }

    // 3. 로비에서 랭킹 정보를 가져옵니다.
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

    // 4. 현재 계정의 랭킹을 찾아서 차이 계산
    const currentAccountRanking =
      rankings.findIndex((account) => account.account_id === currentAccountId) +
      1; // 1부터 시작하는 랭킹
    const opponentAccountRanking =
      rankings.findIndex(
        (account) => account.account_id === parseInt(accountId)
      ) + 1; // 1부터 시작하는 랭킹

    // 5. 랭킹 차이 계산
    const rankingDiff = Math.abs(
      currentAccountRanking - opponentAccountRanking
    );

    // 6. 게임 결과 및 MMR 업데이트
    const gameResult = await startGame(currentAccountSquad.squad_id, opponentAccount.squad_id);
    const team1MMRChange = calculateMMRChange(rankingDiff, gameResult.team1Goals, gameResult.team2Goals);
    const team2MMRChange = calculateMMRChange(rankingDiff, gameResult.team2Goals, gameResult.team1Goals);

    // 7. MMR 업데이트
    await prisma.accounts.update({
      where: { account_id: currentAccountId },
      data: { mmr: { increment: team1MMRChange } },
    });

    await prisma.accounts.update({
      where: { account_id: parseInt(accountId) },
      data: { mmr: { increment: team2MMRChange } },
    });

    return res.status(200).json({
      message: `게임 결과: ${gameResult.team1Goals}:${gameResult.team2Goals}`,
      mmrChange: { team1: team1MMRChange, team2: team2MMRChange },
    });

  } catch (error) {
    console.error("게임 시작 중 오류:", error);
    return res.status(500).json({ message: "게임을 시작하는 중에 오류가 발생했습니다." });
  }
});

export default router;
