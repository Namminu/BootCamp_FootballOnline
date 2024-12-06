import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma/index.js";
import { Prisma } from "@prisma/client";

const router = express.Router();

// 선수 강화 API (JWT 인증)
router.patch("/players/enhance", authMiddleware, async (req, res, next) => {
  try {
    const account = req.account;
    const { targetPlayer_id, meterial_id } = req.body;

    // body 검사
    if(typeof(+targetPlayer_id)!=='number')
      return res.status(400).json({ Message: "강화선수 id가 정수가 아닙니다." });
    if(typeof(+meterial_id)!=='number')
      return res.status(400).json({ Message: "재료선수 id가 정수가 아닙니다." }); 

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

    // 강화 비용
    const cost = 1000 * Math.pow(2, targetPlayer.enhanced);

    // 강화 비용 보유 여부 검사
    if (account.money < cost) {
      return res.status(400).json({ Message: `보유 금액이 부족합니다.`, '필요 금액:':cost, "보유 금액":account.money });
    }

    // 강화 선수 최대 강화인지 확인
    if(targetPlayer.enhanced===10)
      return res.status(400).json({ message: "이미 최대 강화 단계입니다."});

    // 강화할 선수와 재료 선수가 동일한 선수, 강화 단계인지 확인
    if(targetPlayer.enhanced!==meterial.enhanced||(targetPlayer.player_id!==meterial.player_id))
      return res
        .status(400)
        .json({ message: "동일한 강화 단계 선수만 재료로 사용 가능합니다." });

    // 강화 확률
    const enhanceRate = 100 - 10 * targetPlayer.enhanced;
    const randomNum = Math.random()*100;

    let enhancedPlayer;
    const result = await prisma.$transaction(
      async (tx) => {
        // 비용 차감
        await tx.accounts.update({
          where: { account_id: account.account_id },
          data: {
            money: account.money - cost,
          },
        });

        // 재료 삭제
        await tx.myPlayers.delete({
          where: {
            myPlayer_id: +meterial_id,
          }
        })

        // 강화성공시 강화단계 상승
        if(randomNum<enhanceRate){
          enhancedPlayer = await tx.myPlayers.update({
            data: { 
              enhanced: targetPlayer.enhanced+1 },
            where: {
              myPlayer_id: +targetPlayer_id,
            }
          })
          return "강화성공!";
        }else
          return "강화실패...";
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );

    const enhancePlayerPrototype = await prisma.players.findFirst({
      where: { player_id : enhancedPlayer.player_id }
    })
    const { player_id, player_name, ...stats } = enhancePlayerPrototype;
    const avg = Math.round(Object.values(stats).reduce((a, b)=>a+b)/Object.values(stats).length)+enhancedPlayer.enhanced;

    const data = { id : enhancedPlayer.myPlayer_id ,name : `+${enhancedPlayer.enhanced} ${player_name}` , avg }

    return res.status(200).json({ result, data, '남은 잔액':`${account.money - cost}` });
  } catch (err) {
    next(err);
  }
});

export default router;
