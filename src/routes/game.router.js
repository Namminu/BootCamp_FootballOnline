import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js'; // 인증 미들웨어

const router = express.Router();

// 게임 로비 기능: 인증된 사용자만 접근 가능
router.get('/lobby', authMiddleware, async (req, res, next) => {
  try {
    // 인증된 사용자 정보에서 userId 추출
    const currentUser = req.account;
    const userId = currentUser.account_id; // 인증된 사용자의 userId
    const userMMR = currentUser.mmr; // 인증된 사용자의 MMR

    // 1. 인증된 사용자의 MMR을 기준으로 +-2 범위 내의 사용자들 조회
    const rankings = await prisma.accounts.findMany({
      where: {
        mmr: {
          gte: userMMR - 2, // userMMR - 2
          lte: userMMR + 2, // userMMR + 2
        },
      },
      select: {
        account_id: true,
        account_name: true, // 계정 닉네임
        mmr: true, // MMR
      },
      orderBy: {
        mmr: 'desc', // MMR 내림차순 정렬
      },
    });

    // 2. 데이터가 없으면 빈 배열을 반환하거나 적절한 메시지 반환
    if (rankings.length === 0) {
      return res.status(200).json({ message: "해당 범위 내의 사용자가 없습니다." });
    }

    // 3. 필터링된 사용자들에게 랭킹 순서를 매깁니다.
    const rankedAccounts = rankings.map((account, index) => ({
      rank: index + 1, // 1부터 시작하는 랭킹
      account_name: account.account_name,
      mmr: account.mmr,
    }));

    // 4. 게임 로비에 참여할 수 있는 사용자들만 반환
    return res.status(200).json({
      message: "게임 로비 참여 가능 사용자들",
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

  players.forEach(player => {
    const playerStats = [
      player.player_speed,
      player.player_finish,
      player.player_power,
      player.player_defense,
      player.player_stamina
    ];

    const playerAvg = playerStats.reduce((sum, stat) => sum + stat, 0) / playerStats.length;
    totalAvg += playerAvg;
  });

  const squadAvg = totalAvg / players.length;
  return squadAvg;
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
router.post('/start-game/:userid', authMiddleware, async (req, res) => {
  const { userid } = req.params; // 상대 유저의 userId

  try {
    const currentUserId = req.account.account_id; // 현재 인증된 사용자의 ID

    // 상대 유저의 정보를 확인 (id가 실제로 존재하는지 체크)
    const opponent = await prisma.accounts.findUnique({
      where: { account_id: parseInt(userid) },
    });

    if (!opponent) {
      return res.status(404).json({ message: '상대 유저를 찾을 수 없습니다.' });
    }

    // 현재 유저와 상대 유저의 랭킹 확인
    const currentUser = await prisma.accounts.findUnique({
      where: { account_id: currentUserId },
    });

    const opponentRanking = opponent.ranking;
    const currentUserRanking = currentUser.ranking;

    // 랭킹 차이 계산
    const rankingDiff = Math.abs(currentUserRanking - opponentRanking);

    // 랭킹 차이가 너무 크면 게임을 진행할 수 없도록 함
    if (rankingDiff > 2) {
      return res.status(400).json({
        message: '현재 사용자와 상대의 랭킹 차이가 너무 커서 경기를 진행할 수 없습니다.',
      });
    }

    // 상대팀과 내 팀의 스쿼드 정보 가져오기
    const team1 = await prisma.squad.findUnique({
      where: { squad_id: currentUser.squad_id },
      include: { accounts: true },
    });

    const team2 = await prisma.squad.findUnique({
      where: { squad_id: opponent.squad_id },
      include: { accounts: true },
    });

    // 팀 이름을 account_name으로 설정
    const team1Name = team1.accounts.account_name;
    const team2Name = team2.accounts.account_name;

    // 경기를 시작하고 결과 반환
    const gameResult = await startGame(team1.squad_id, team2.squad_id);

    // 골 로그에 팀 이름을 account_name으로 추가
    const goalLog = gameResult.goalLog.map(log => ({
      team: log.team === '팀 1' ? team1Name : team2Name,
      minute: log.minute,
      goal: log.goal,
    }));

    // 게임 결과를 "사용자A 5:3 사용자B" 형식으로 리턴
    return res.status(200).json({
      message: `${team1Name} ${gameResult.team1Goals}:${gameResult.team2Goals} ${team2Name}`,
      goalLog: goalLog.map(log => `${log.team}가 ${log.minute}분에 골을 넣었습니다.`),
    });
  } catch (error) {
    console.error('게임 시작 중 오류:', error);
    return res.status(500).json({ message: '게임을 시작하는 중에 오류가 발생했습니다.' });
  }
});

export default router;
