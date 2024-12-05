import express from "express";
import { prisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js"; // 인증 미들웨어
import {
  calculateSquadAverageStats,
  playGame,
  calculateMMR,
} from "./gameLogic.router.js";

const router = express.Router();

router.get("/lobby", authMiddleware, async (req, res, next) => {
  try {
    const { account_id: currentAccountId } = req.account;

    // 1. 현재 계정의 스쿼드 데이터 가져오기
    const currentAccount = await prisma.accounts.findUnique({
      where: { account_id: currentAccountId },
      select: {
        squad: true, // squad 정보를 가져옵니다.
      },
    });
    
    const { squad } = currentAccount;
    if (!squad || !squad.squad_player1 || !squad.squad_player2 || !squad.squad_player3) {
      return res.status(400).json({ message: "스쿼드가 완전하지 않습니다." });
    }

    // 2. 스쿼드가 완전하다면, 매칭 가능한 유저들을 찾아서 반환
    const rankings = await prisma.accounts.findMany({
      where: {
        squad: {
          AND: [
            { squad_player1: { not: null } },
            { squad_player2: { not: null } },
            { squad_player3: { not: null } },
          ],
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

    // 3. 데이터가 없으면 "등록된 유저가 없다"는 메시지 반환
    if (rankings.length === 0) {
      return res.status(200).json({ message: "현재 게임을 시작할 수 있는 유저가 없습니다." });
    }

    // 4. 각 계정에 랭킹 순서를 부여
    const rankedAccounts = rankings.map((account, index) => ({
      rank: index + 1, // 1부터 시작하는 랭킹
      account_id: account.account_id,
      account_name: account.account_name,
      mmr: account.mmr,
    }));

    // 5. 현재 계정의 랭킹 계산
    const currentRank =
      rankedAccounts.findIndex(
        (account) => account.account_id === currentAccountId
      ) + 1;

    // 6. 매칭 가능한 계정 찾기 (자기 자신을 제외한 랭킹 ±2 범위)
    const matchedAccounts = rankedAccounts.filter((account) => {
      const rankDifference = Math.abs(account.rank - currentRank);
      return account.account_id !== currentAccountId && rankDifference <= 2;
    });

    // 7. 매칭된 계정들이 없으면 알림
    if (matchedAccounts.length === 0) {
      return res.status(200).json({
        message: "현재 랭킹 차이가 너무 커서 매칭할 수 있는 유저가 없습니다.",
      });
    }

    // 8. 매칭 가능한 유저들을 반환
    return res.status(200).json({
      message: "매칭 가능한 계정들",
      data: matchedAccounts,
    });
  } catch (error) {
    console.error("Error during lobby processing:", error);
    next(error); // 에러 핸들러로 에러 전달
  }
});

// 게임  기능: 인증된 사용자만 접근 가능
router.post("/game", authMiddleware, async (req, res, next) => {
  const currentAccountId = req.account.account_id;
  const { opponentAccountId } = req.body;

  try {
    // 1. 상대 계정 유효성 체크
    if (!opponentAccountId) {
      return res
        .status(400)
        .json({ message: "상대 계정 ID가 제공되지 않았습니다." });
    }

    if (currentAccountId === opponentAccountId) {
      return res
        .status(400)
        .json({ message: "자기 자신과는 게임을 진행할 수 없습니다." });
    }

    // 2. 계정 데이터 가져오기
    const rankings = await prisma.accounts.findMany({
      where: {
        squad: {
          AND: [
            { squad_player1: { not: +null } },
            { squad_player2: { not: +null } },
            { squad_player3: { not: +null } },
          ],
        },
      },
      select: {
        account_id: true,
        account_name: true,
        mmr: true,
      },
      orderBy: {
        mmr: "desc",
      },
    });

    if (rankings.length === 0) {
      return res.status(400).json({ message: "등록된 유저가 없습니다." });
    }

    // 3. 현재 계정과 상대 계정의 랭킹 계산
    const currentRank =
      rankings.findIndex((account) => account.account_id === currentAccountId) +
      1;
    const opponentRank =
      rankings.findIndex(
        (account) => account.account_id === opponentAccountId
      ) + 1;
    const rankDifference = Math.abs(currentRank - opponentRank);

    if (rankDifference > 2) {
      return res.status(400).json({ message: "매칭 가능한 상대가 아닙니다." });
    }

    // 4. 각 팀의 평균 능력치 계산
    let currentTeamData;
    try {
      currentTeamData = await calculateSquadAverageStats(currentAccountId);
    } catch (error) {
      // 404 에러 반환 (스쿼드가 없거나 멤버가 부족한 경우)
      return res
        .status(404)
        .json({ message: "나의 스쿼드가 완전하지 않습니다" });
    }

    let opponentTeamData;
    try {
      opponentTeamData = await calculateSquadAverageStats(opponentAccountId);
    } catch (error) {
      // 404 에러 반환 (상대 스쿼드가 없거나 멤버가 부족한 경우)
      return res
        .status(404)
        .json({ message: "상대의 스쿼드가 완전하지 않거나 없는 상대입니다" });
    }

    // 5. 게임 진행
    const gameResultData = playGame(
      currentTeamData.squadAverage,
      opponentTeamData.squadAverage,
      currentTeamData.accountName,
      opponentTeamData.accountName
    );

    const { gameResult, currentTeamScore, opponentTeamScore, goals } =
      gameResultData;

    // 6. 트랜잭션 시작
    const transactionResult = await prisma.$transaction(async (prisma) => {
      let currentMMRChange = 0;
      let opponentMMRChange = 0;

      if (gameResult === "승리") {
        const result = await calculateMMR(
          currentRank,
          opponentRank,
          true,
          currentAccountId,
          opponentAccountId
        );
        currentMMRChange = result.currentMMRChange;
        opponentMMRChange = result.opponentMMRChange;

        await prisma.accounts.update({
          where: { account_id: currentAccountId },
          data: { mmr: { increment: currentMMRChange } },
        });

        await prisma.accounts.update({
          where: { account_id: opponentAccountId },
          data: { mmr: { increment: opponentMMRChange } },
        });
      } else if (gameResult === "패배") {
        const result = await calculateMMR(
          currentRank,
          opponentRank,
          false,
          currentAccountId,
          opponentAccountId
        );
        currentMMRChange = result.currentMMRChange;
        opponentMMRChange = result.opponentMMRChange;

        await prisma.accounts.update({
          where: { account_id: currentAccountId },
          data: { mmr: { increment: currentMMRChange } },
        });

        await prisma.accounts.update({
          where: { account_id: opponentAccountId },
          data: { mmr: { increment: opponentMMRChange } },
        });
      }

      return { gameResult, currentMMRChange, opponentMMRChange };
    });

    return res.status(200).json({
      message: `게임 결과: ${gameResult}`,
      currentTeamScore,
      opponentTeamScore,
      goals,
      currentMMRChange: transactionResult.currentMMRChange,
      opponentMMRChange: transactionResult.opponentMMRChange,
    });
  } catch (error) {
    console.error("Error during game processing:", error);
    next(error);
  }
});

export default router;
