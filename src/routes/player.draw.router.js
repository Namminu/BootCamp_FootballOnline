import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import { prisma } from "../utils/prisma/index.js";
import { Prisma } from "@prisma/client";

const router = express.Router();

// 선수 뽑기 API (JWT 인증)
router.post("/players/draw", authMiddleware, async (req, res, next) => {
  try {
    const account = req.account;
    const cost = 1000;

    //캐시 보유 1000원 이상인지 검사
    if (account.money < cost) {
      return res.status(400).json({ Message: "보유 캐쉬가 부족합니다." });
    }

    // 선수 뽑기 로직
    let existingPlayer;
    const players = await prisma.players.findMany({});
    let randomPlayer;
    do {
      // 선수 테이블에서 랜덤 선수 가져오기
      const randomNum = Math.floor(Math.random() * players.length);
      randomPlayer = players[randomNum];
      
      if (!randomPlayer) {
        return res.status(404).json({ Message: "존재하지 않는 선수입니다." });
      }

      // 캐릭터 보유 선수중 뽑힌 캐릭터가 있는지
      existingPlayer = await prisma.myPlayers.findFirst({
        where: {
          player_id: randomPlayer.player_id,
        },
      });
      // 중복이면 50% 확률로 다시 뽑게 하기
    } while (existingPlayer && Math.random() * 2 < 1);

    // 캐쉬 차감 및 보유 선수 업데이트 (트랜잭션)
    const newPlayer = await prisma.$transaction(
      async (tx) => {
        //캐쉬 차감
        await tx.accounts.update({
          where: { account_id: account.account_id },
          data: {
            money: account.money - cost,
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
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    if(newPlayer){
      const name = randomPlayer.player_name;
      const { player_id, player_name, ...stats } = randomPlayer;
      const avg = Math.round(Object.values(stats).reduce((a, b)=>a+b)/Object.values(stats).length);
      return res.status(200).json({ newPlayer : { name, avg }, message: `남은 잔액 : ${account.money-cost}` });
    }else return res.status(500).json({ message: "선수 뽑기 오류"});

  } catch (err) {
    next(err);
  }
});

// 10 연속 선수 뽑기 API (JWT 인증)
router.post("/players/draw10", authMiddleware, async (req, res, next) => {
  try {
    const account = req.account;
    const cost = 10000;
    const repeatNum = 10;

    //캐시 보유 9000원 이상인지 검사
    if (account.money < cost) {
      return res.status(400).json({ Message: "보유 캐쉬가 부족합니다." });
    }

    let drawnPlayers = [];

    for(let i=0; i<repeatNum; i++){
      // 선수 뽑기 로직
      let existingPlayer;
      const players = await prisma.players.findMany({});
      let randomPlayer;
      do {
        // 선수 테이블에서 랜덤 선수 가져오기
        const randomNum = Math.floor(Math.random() * players.length);
        randomPlayer = players[randomNum];
        
        if (!randomPlayer) {
          return res.status(404).json({ Message: "존재하지 않는 선수입니다." });
        }

        // 캐릭터 보유 선수중 뽑힌 캐릭터가 있는지
        existingPlayer = await prisma.myPlayers.findFirst({
          where: {
            player_id: randomPlayer.player_id,
          },
        });
        // 중복이면 50% 확률로 다시 뽑게 하기
      } while (existingPlayer && Math.random() * 2 < 1);
      // 10뽑기 풀에 랜덤선수 한 명 추가
      drawnPlayers.push(randomPlayer);
    }

    // 캐쉬 차감 및 보유 선수 업데이트
    const result = await prisma.$transaction(
      async (tx) => {
        //캐쉬 차감
        await tx.accounts.update({
          where: { account_id: account.account_id },
          data: {
            money: account.money - cost,
          },
        });

        for(let i=0; i<repeatNum; i++){
          //선수 등록하기
          const newPlayer = await tx.myPlayers.create({
            data: {
              account_id: account.account_id,
              player_id: drawnPlayers[i].player_id,
              enhanced: 0,
            },
          });
        }

        return 1;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
    if(result){
      const newPlayers = drawnPlayers.map(newPlayer => {
        const { player_id, player_name, ...stats } = newPlayer;
        const avg = Math.round(Object.values(stats).reduce((a, b)=>a+b)/Object.values(stats).length);
        return { name: player_name, avg };
      });

      return res.status(200).json({ newPlayers, message: `남은 잔액 : ${account.money-cost}` });
    }else return res.status(500).json({ message: "선수 뽑기 오류"});

  } catch (err) {
    next(err);
  }
});

export default router;
