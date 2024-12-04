import express from "express";
import { prisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js"; // 인증 미들웨어

const router = express.Router();

// 게임 로비 기능: 인증된 사용자만 접근 가능
router.get("/lobby", authMiddleware, async (req, res, next) => {
  try {
    const currentAccount = req.account; // 인증된 계정
    const accountId = currentAccount.account_id; // 인증된 계정의 accountId
    const accountMMR = currentAccount.mmr; // 인증된 계정의 MMR

    // 1. 인증된 계정이 스쿼드를 가지고 있는지 확인
    const accountSquad = await prisma.squad.findUnique({
      where: { account_id: accountId },
    });

    if (!accountSquad) {
      return res.status(400).json({
        message: "Squad를 짜야 게임을 할 수 있습니다.",
      });
    }

    // 2. 인증된 계정의 MMR을 기준으로 +-2 범위 내의 계정들 조회 (스쿼드를 가진 계정만)
    const rankings = await prisma.accounts.findMany({
      where: {
        mmr: {
          gte: accountMMR - 2, // accountMMR - 2
          lte: accountMMR + 2, // accountMMR + 2
        },
        squad: {
          // 스쿼드를 가진 계정만 조회
          some: {},
        },
      },
      select: {
        account_id: true,
        account_name: true, // 계정 닉네임
        mmr: true, // MMR
      },
      orderBy: {
        mmr: "desc", // MMR 내림차순 정렬
      },
    });

    if (rankings.length === 0) {
      return res
        .status(200)
        .json({ message: "해당 범위 내의 계정이 없습니다." });
    }

    // 3. 필터링된 계정들에게 랭킹 순서를 매깁니다.
    const rankedAccounts = rankings.map((account, index) => ({
      rank: index + 1, // 1부터 시작하는 랭킹
      account_name: account.account_name,
      mmr: account.mmr,
    }));

    return res.status(200).json({
      message: "게임 로비 참여 가능 계정들",
      data: rankedAccounts,
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
    squad.players1.players,
    squad.players2.players,
    squad.players3.players,
  ];

  let totalAvg = 0;

  players.forEach((player) => {
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

// 게임 라우트: 상대 유저와 경기 시작
// 게임 라우트: 상대 계정과 경기 시작
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

    // 2. 상대 계정이 스쿼드를 가지고 있는지 확인
    const opponentAccount = await prisma.accounts.findUnique({
      where: { account_id: parseInt(accountId) },
    });

    if (!opponentAccount) {
      return res.status(404).json({ message: "상대 계정을 찾을 수 없습니다." });
    }

    const opponentAccountSquad = await prisma.squad.findUnique({
      where: { account_id: opponentAccount.account_id },
    });

    if (!opponentAccountSquad) {
      return res.status(400).json({
        message: "상대 계정은 Squad가 없어서 게임을 진행할 수 없습니다.",
      });
    }

    // 3. 랭킹 차이 계산
    const currentAccountRanking = currentAccountSquad.account_id;
    const opponentAccountRanking = opponentAccountSquad.account_id;
    const rankingDiff = Math.abs(
      currentAccountRanking - opponentAccountRanking
    );

    // 랭킹 차이가 너무 크면 게임을 진행할 수 없도록 함
    if (rankingDiff > 2) {
      return res.status(400).json({
        message:
          "현재 계정과 상대 계정의 랭킹 차이가 너무 커서 경기를 진행할 수 없습니다.",
      });
    }

    // 4. 상대 팀과 내 팀의 스쿼드 정보 가져오기
    const team1 = await prisma.squad.findUnique({
      where: { squad_id: currentAccountSquad.squad_id },
      include: { accounts: true },
    });

    const team2 = await prisma.squad.findUnique({
      where: { squad_id: opponentAccountSquad.squad_id },
      include: { accounts: true },
    });

    const team1Name = team1.accounts.account_name;
    const team2Name = team2.accounts.account_name;

    // 5. 경기를 시작하고 결과 반환
    const gameResult = await startGame(team1.squad_id, team2.squad_id);

    // 6. 골 로그에 팀 이름을 account_name으로 추가
    const goalLog = gameResult.goalLog.map((log) => ({
      team: log.team === "팀 1" ? team1Name : team2Name,
      minute: log.minute,
      goal: log.goal,
    }));

    // 7. MMR 변경 내용 포함하여 반환
    const team1MMRChange = calculateMMRChange(
      rankingDiff,
      gameResult.team1Goals,
      gameResult.team2Goals
    );
    const team2MMRChange = calculateMMRChange(
      rankingDiff,
      gameResult.team2Goals,
      gameResult.team1Goals
    );

    // MMR 업데이트
    await prisma.accounts.update({
      where: { account_id: team1.account_id }, // 팀 1의 계정
      data: { mmr: { increment: team1MMRChange } },
    });

    await prisma.accounts.update({
      where: { account_id: team2.account_id }, // 팀 2의 계정
      data: { mmr: { increment: team2MMRChange } },
    });

    return res.status(200).json({
      message: `${team1Name} ${gameResult.team1Goals}:${gameResult.team2Goals} ${team2Name}`,
      goalLog: goalLog.map(
        (log) => `${log.team}가 ${log.minute}분에 골을 넣었습니다.`
      ),
      mmrChange: {
        team1: team1MMRChange,
        team2: team2MMRChange,
      },
    });
  } catch (error) {
    console.error("게임 시작 중 오류:", error);
    return res
      .status(500)
      .json({ message: "게임을 시작하는 중에 오류가 발생했습니다." });
  }
});

export default router;
