import express from "express";
import { prisma } from "../utils/prisma/index.js";

const router = express.Router();

// 전체 랭킹 보기 API
router.get("/ranking", async (req, res, next) => {
  try {
    // 1. 전체 계정들을 MMR 기준으로 내림차순으로 조회
    const rankings = await prisma.accounts.findMany({
      select: {
        account_id: true,
        account_name: true, // 계정 닉네임
        mmr: true, // MMR
      },
      orderBy: {
        mmr: "desc", // MMR 내림차순 정렬
      },
    });

    // 2. 데이터가 없으면 빈 배열을 반환하거나 적절한 메시지 반환
    if (rankings.length === 0) {
      return res.status(200).json({ message: "랭킹 데이터가 없습니다." });
    }

    // 3. 랭킹 순서를 추가하기 위해 각 계정에 순위를 매깁니다.
    const rankedAccounts = rankings.map((account, index) => ({
      rank: index + 1, // 1부터 시작하는 랭킹
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
