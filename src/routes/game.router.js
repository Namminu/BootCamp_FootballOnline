import express from "express";
import { prisma } from "../utils/prisma/index.js";
import authMiddleware from "../middlewares/auth.middleware.js"; // 인증 미들웨어
import {
  calculateSquadAverageStats,
  playGame,
  calculateMMR,
} from "./gameLogic.router.js";

const router = express.Router();

// 게임 로비 기능: 인증된 사용자만 접근 가능
router.post("/game", authMiddleware, async (req, res, next) => {
  try {
    const currentAccountId = req.account.account_id; // 인증된 계정 ID
    const { opponentAccountId } = req.body; // 상대 계정 ID

    // 상대 계정 ID가 없으면 오류 반환
    if (!opponentAccountId) {
      return res
        .status(400)
        .json({ message: "상대 계정 ID가 제공되지 않았습니다." });
    }

    // 1. 자기 자신과 게임을 진행할 수 없도록 검사
    if (currentAccountId === opponentAccountId) {
      return res
        .status(400)
        .json({ message: "자기 자신과는 게임을 진행할 수 없습니다." });
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
        .status(400)
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
      return res.status(400).json({
        message: "현재 랭킹 차이가 너무 커서 매칭할 수 있는 유저가 아닙니다.",
      });
    }

    // 7. 각 팀의 평균 능력치 계산
    const currentTeamData = await calculateSquadAverageStats(currentAccountId);
    const opponentTeamData =
      await calculateSquadAverageStats(opponentAccountId);

    console.log(`현재 팀 평균 능력치: ${currentTeamData.squadAverage}`);
    console.log(`상대 팀 평균 능력치: ${opponentTeamData.squadAverage}`);

    // 8. 게임을 진행하여 승패 결정
    const gameResultData = playGame(
      currentTeamData.squadAverage,
      opponentTeamData.squadAverage,
      currentTeamData.accountName,
      opponentTeamData.accountName
    );

    // 9. 게임 결과 (승리, 패배, 무승부) 처리
    const { gameResult, currentTeamScore, opponentTeamScore, goals } =
      gameResultData;

    // 10. MMR 변동 계산 및 계정 업데이트
    let currentMMRChange = 0;
    let opponentMMRChange = 0;
    let updatedCurrentAccount = null;
    let updatedOpponentAccount = null;

    if (gameResult === "승리") {
      const result = await calculateMMR(
        currentRank,
        opponentRank,
        true, // 승리 처리
        currentAccountId,
        opponentAccountId
      );
      updatedCurrentAccount = result.updatedCurrentAccount;
      updatedOpponentAccount = result.updatedOpponentAccount;
      currentMMRChange = result.currentMMRChange;
      opponentMMRChange = result.opponentMMRChange;
    } else if (gameResult === "패배") {
      const result = await calculateMMR(
        currentRank,
        opponentRank,
        false, // 패배 처리
        currentAccountId,
        opponentAccountId
      );
      updatedCurrentAccount = result.updatedCurrentAccount;
      updatedOpponentAccount = result.updatedOpponentAccount;
      currentMMRChange = result.currentMMRChange;
      opponentMMRChange = result.opponentMMRChange;
    } else if (gameResult === "무승부") {
      // 무승부인 경우 MMR 변화 없음
      currentMMRChange = 0;
      opponentMMRChange = 0;
    }

    // 11. 게임 결과 반환
    return res.status(200).json({
      message: `게임 결과: ${gameResult}`,
      currentMMR: updatedCurrentAccount.mmr,
      opponentMMR: updatedOpponentAccount.mmr,
      currentTeamScore,
      opponentTeamScore,
      goals,
      rankDifference, // 랭킹 차이 추가
      currentMMRChange, // 현재 팀의 MMR 변화량
      opponentMMRChange, // 상대 팀의 MMR 변화량
    });
  } catch (error) {
    console.error("Error during game processing:", error);
    next(error); // 에러 핸들러
  }
});

export default router;
