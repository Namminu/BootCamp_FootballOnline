import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma/index.js";
import { Prisma } from "@prisma/client";

const router = express.Router();

// 선수 뽑기 API (JWT 인증)
router.post("/players/draw", authMiddleware, async (req, res, next) => {
  try {
    const account = req.account;
    const drawPrice = 1000;

    //캐시 보유 1000원 이상인지 검사
    if (account.cash < drawPrice) {
      return res.status(400).json({ Message: "보유 캐쉬가 부족합니다." });
    }

    const randomtierList = [tier0, tier1, tier2, tier3, tier4, tier5];

    //랜덤 등급
    const randomNumRarity = Math.random();

    let rarity = 0;
    for (const element in randomtierList) {
      let currentrandomNum = 0;
      for (let i = 0; i <= element; i++) {
        currentrandomNum += randomtierList[i];
      }
      if (randomNumRarity < currentrandomNum) {
        rarity = +element;
        break;
      }
    }

    do {
      //선수 테이블에서 랜덤 선수 가져오기
      const players = await prisma.players.findMany({});
      const randomNum = Math.floor(Math.random() * players.length); //랜덤으로 뽑을 리스트 idex 뽑기
      const randomPlayer = players[randomNum]; //당첨 선수 정보

      //
      if (!randomPlayer) {
        return res.status(400).json({ Message: "존재하지 않는 선수입니다." });
      }

      //캐릭터 보유 선수중 뽑힌 캐릭터가 있는지
      let existingPlayer = await prisma.myPlayers.findFirst({
        where: {
          player_id: randomPlayer.player_id,
        },
      });
      // 중복이면 50% 확률로 다시 뽑게 하기
    } while (existingPlayer && Math.random() * 2 < 1);

    const newPlayer = await prisma.$transaction(
      async (tx) => {
        //캐쉬 차감
        await tx.accounts.update({
          where: { account_id: account.account_id },
          data: {
            money: account.money - drawPrice,
          },
        });

        //선수 등록하기
        const newPlayer = await tx.myPlayers.create({
          data: {
            account_id: account.account_id,
            player_id: randomPlayer.player_id,
            enhanced: 0,
          },
        });

        return newPlayer;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, // 격리 레벨
      }
    );

    return res.status(200).json({ newPlayer, message: `남은 잔액 : ${account.money}` });
  } catch (err) {
    next(err);
  }
});

export default router;
