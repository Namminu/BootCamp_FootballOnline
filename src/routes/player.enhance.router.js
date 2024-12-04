import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma/index.js";
import { Prisma } from "@prisma/client";

const router = express.Router();

// 선수 강화 API (JWT 인증)
router.post("/players/enhance", authMiddleware, async (req, res, next) => {
  try {
    const account = req.account;
    const { targetPlayer_id, meterial_id } = req.body;

    // 강화 선수 보유 여부 확인 (JWT 인증)
    let targetPlayer = await prisma.myPlayers.findFirst({
      where: {
        myPlayer_id: +targetPlayer_id,
        account_id: account.account_id,
      },
    });
    if (!targetPlayer)
      return res
        .status(404)
        .json({ message: "강화할 선수를 보유하지 않았습니다." });

    // 강화 선수 최대 강화인지 확인
    if(targetPlayer.enhanced===10)
      return res.status(400).json({ message: "이미 최대 강화 단계입니다."});

    // 재료 선수 보유 여부 확인 (JWT 인증)
    let meterial = await prisma.myPlayers.findFirst({
      where: {
        myPlayer_id: +meterial_id,
        account_id: account.account_id,
      },
    });
    if (!meterial)
      return res
        .status(404)
        .json({ message: "재료 선수를 보유하지 않았습니다." });

    // 강화할 선수와 재료 선수 강화 단계 동일한지 확인
    if(!(targetPlayer.enhanced===meterial.enhanced))
      return res
        .status(400)
        .json({ message: "동일한 강화 단계 선수만 재료로 사용 가능합니다." });

    // 강화 비용
    const cost = 1000 * Math.pow(2, targetPlayer.enhanced);

    // 강화 확률
    const enhanceRate = 100 - 10 * targetPlayer.enhanced;
    const randomNum = Math.random()*100;

    let enhancedPlayer;
    const result = await prisma.$transaction(
      async (tx) => {
        // 재료 삭제
        await tx.myPlayers.delete({
          where: {
            myPlayer_id: +meterial_id,
          }
        })
        // 강화성공시 강화단계 상승
        if(randomNum<enhanceRate){
          enhancedPlayer = await tx.myPlayers.update({
            data: { enhanced: targetPlayer.enhanced+1 },
            where: {
              myPlayer_id: +targetPlayer_id,
            }
          })
          return "강화성공";
        }else
          return "강화실패";
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    if(!result) throw new Error('선수 강화 트랜잭션 오류');

    return res.status(200).json({ result, enhancedPlayer });
  } catch (err) {
    next(err);
  }
});

export default router;
