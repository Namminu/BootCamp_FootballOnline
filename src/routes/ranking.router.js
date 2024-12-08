import express from "express";
import { prisma } from "../utils/prisma/index.js";

const router = express.Router();

// 전체 랭킹 보기 API
router.get("/ranking", async (req, res, next) => {
  try {
    // 1. 상위 100명만 조회 (limit 100 고정)
    const rankings = await prisma.accounts.findMany({
      where: {
        squad: {
          // squad_player1, squad_player2, squad_player3 중 하나라도 null이 아닌 경우
          AND: [
            { squad_player1: { not: null } },
            { squad_player2: { not: null } },
            { squad_player3: { not: null } },
          ],
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
      take: 100, // 상위 100명만 조회
    });

    // 2. 데이터가 없으면 빈 배열을 반환하거나 적절한 메시지 반환
    if (rankings.length === 0) {
      return res.status(400).json({ message: "스쿼드가 없는 사용자들은 랭킹에 포함되지 않습니다." });
    }

    // 3. 랭킹 순서를 추가하기 위해 각 계정에 순위를 매깁니다.
    const rankedAccounts = rankings.map((account, index) => ({
      rank: index + 1, // 1부터 시작하는 랭킹
      account_id: account.account_id,
      account_name: account.account_name,
      mmr: account.mmr,
    }));

    // 4. 랭킹 반환
    return res.status(200).json(rankedAccounts);
  } catch (error) {
    next(error); // 에러 핸들러로 에러 전달
  }
});

export default router;