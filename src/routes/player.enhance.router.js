import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma/index.js";
import { Prisma } from "@prisma/client";

const router = express.Router();

// 선수 강화 API (JWT 인증)
router.post("/players/draw", authMiddleware, async (req, res, next) => {
  try {
    const account = req.account;
    const { targetPlayer_id, meterial_id } = req.body;

    // 강화 대상 보유 여부 확인
    let targetPlayer = await prisma.myPlayers.findFirst({
      where: {
        myPlayer_id: targetPlayer_id,
        account_id: account.account_id,
      },
    });
    if (!targetPlayer)
      return res
        .status(404)
        .json({ message: "강화할 선수를 보유하지 않았습니다." });

    // 강화 대상 보유 여부 확인
    let meterial = await prisma.myPlayers.findFirst({
      where: {
        myPlayer_id: meterial_id,
        account_id: account.account_id,
      },
    });
    if (!meterial)
      return res
        .status(404)
        .json({ message: "재료 선수를 보유하지 않았습니다." });

    // 최대 10강
    if (targetPlayer.enhanced === 10)
      return res.status(204).json({ message: "이미 최대 강화단계입니다." });

    // 강화 비용
    const cost = 1000 * Math.pow(2, targetPlayer.enhanced);

    // 강화 확률 100, 90, 80, ...
    const enhanceRate = 100 - 10 * targetPlayer.enhanced;
    const randomNum = Math.random()*100;
    if(randomNum<enhanceRate){
    // 강화 성공시
    // 보유 재료 선수 delete, 보유 선수의 enhanced를 1 증가,
    }

    // 강화 실패시
    // 확률에 따라
    // 보유 재료 선수 delete or 보유 재료 선수 보존

    const enhancedPlayer = await prisma.$transaction(
      async (tx) => {
        if(randomNum<enhanceRate){
          await prisma.myPlayers.update({
            where: {
              enhanced: targetPlayer.enhanced+1,
            }
          })
        }
        // 재료 delete
        await prisma.myPlayers.delete({
          where: {
            myPlayer_id: meterial_id,
          }
        })

        return enhancedPlayer;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    return res.status(200).json({ result: "강화성공", enhancedPlayer });
  } catch (err) {
    next(err);
  }
});

export default router;
