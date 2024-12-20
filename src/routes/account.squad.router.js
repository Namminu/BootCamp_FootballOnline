import express from 'express';
import { prisma } from '../utils/prisma/index.js'
import authMiddleware from "../middlewares/auth.middleware.js"

const router = express.Router();

// 스쿼드 조회 API
router.get('/squad/:targetId', authMiddleware, async (req, res, next) => {
  try {
    // JWT 를 통해 받은 로그인 한 계정의 ID값
    const myAccountId = +req.account.account_id;
    // 로그인이 되어 있지 않을 경우 처리
    if (!myAccountId) return res.status(401).json({ message: "로그인이 필요합니다." });

    // 찾으려는 계정의 account_id값
    const targetId = +req.params.targetId;
    const target = await prisma.accounts.findUnique({ where: { account_id: targetId } });
    // 찾는 계정이 존재하지 않을 경우 처리
    if (!target) return res.status(404).json({ message: "존재하지 않는 계정입니다." });

    // 내 스쿼드가 아닌 경우
    if (myAccountId !== target.account_id) {
      const squad = await prisma.squad.findFirst({
        where: { account_id: targetId },
        include: {
          players1: { include: { players: true } },
          players2: { include: { players: true } },
          players3: { include: { players: true } },
        }
      });

      // 스쿼드가 존재 하지 않을 경우 처리
      if (!squad) return res.status(404).json({ message: "해당 계정은 스쿼드를 보유하고 있지 않습니다." });

      // 스쿼드 데이터 매핑
      const playerSlots = [squad.players1, squad.players2, squad.players3];
      const squadList = playerSlots.map((slot, idx) => {
        if (!slot) return null;
        const myPlayer_id = slot.myPlayer_id;
        return {
          [`Player${idx + 1}`]: `+${slot.enhanced} ${slot.players.player_name}`,
          myPlayer_id
        };
      }).filter(Boolean);

      return res.status(200).json({ [`${target.account_name} 님의 스쿼드 `]: squadList });
    }
    // 내 스쿼드인 경우
    else {
      const squad = await prisma.squad.findFirst({
        where: { account_id: targetId },
        include: {
          players1: { include: { players: true } },
          players2: { include: { players: true } },
          players3: { include: { players: true } },
        }
      });

      // 스쿼드가 존재 하지 않을 경우 처리
      if (!squad) return res.status(404).json({ message: "현재 스쿼드를 보유하고 있지 않습니다." });

      // 스쿼드 데이터 매핑
      const playerSlots = [squad.players1, squad.players2, squad.players3];
      const squadList = playerSlots.map((slot, idx) => {
        if (!slot) return null;
        const myPlayer_id = slot.myPlayer_id;
        return {
          [`Player${idx + 1}`]: `+${slot.enhanced} ${slot.players.player_name}`,
          myPlayer_id
        };
      }).filter(Boolean);

      return res.status(200).json({ [`나의 스쿼드 `]: squadList });
    }

  } catch (err) {
    console.log(err);
    next(err);
    return res.status(500).json({
      message: "서버 에러 발생",
      errCode: err.message
    });
  }
});

// 스쿼드 추가 API
router.post("/squad/:myPlayerId/setup", authMiddleware, async (req, res, next) => {
  try {
    // 데이터 유효성 검사
    if (!req.account) return res.status(401).json({ message: "로그인이 필요합니다." });
    const accountId = +req.account.account_id;
    const players = await prisma.myPlayers.findMany({ where: { account_id: accountId } });
    if (players.length === 0) return res.status(404).json({ message: "현재 보유한 선수가 존재하지 않습니다." });

    // params 데이터 유효성 검사
    const myPlayerId = +req.params.myPlayerId;
    const player = await prisma.myPlayers.findUnique({
      where: {
        myPlayer_id: myPlayerId,
        account_id: accountId
      }
    });
    if (!player) return res.status(404).json({ message: "현재 해당 선수를 보유하고 있지 않습니다." });

    // 스쿼드에 남는 자리가 있는지 검사
    const squad = await prisma.squad.findUnique({
      where: { account_id: accountId },
      include: {
        players1: { include: { players: true } },
        players2: { include: { players: true } },
        players3: { include: { players: true } },
      }
    });
    if (squad) {
      const alreadySquad = [squad.squad_player1, squad.squad_player2, squad.squad_player3].filter(Boolean);
      if (alreadySquad.length >= 3) return res.status(400).json({ message: "더 이상 스쿼드를 추가할 수 없습니다." });
    }

    // 스쿼드에 해당 선수가 이미 등록되어 있는지 검사
    const alreadyPlayer = await prisma.squad.findFirst({
      where: {
        account_id: accountId,
        OR: [
          { squad_player1: myPlayerId },
          { squad_player2: myPlayerId },
          { squad_player3: myPlayerId },
        ]
      }
    });
    if (alreadyPlayer) return res.status(400).json({ message: "해당 선수는 이미 등록되어 있습니다." });

    // Squad 테이블에 본인 계정 데이터가 없을 경우 새로 추가
    if (!squad) {
      await prisma.squad.create({
        data: {
          account_id: accountId,
          squad_player1: myPlayerId
        }
      });
      const rolPlayer = await prisma.players.findUnique({ where: { player_id: player.player_id } });
      const message = `${rolPlayer.player_name} 선수를 스쿼드에 등록했습니다`;
      return res.status(200).json({ message, myPlayer_id: myPlayerId });
    }

    // Squad 테이블의 빈 컬럼에 데이터 등록
    let updateData = null;
    if (!squad.squad_player1) updateData = { squad_player1: myPlayerId };
    else if (!squad.squad_player2) updateData = { squad_player2: myPlayerId };
    else if (!squad.squad_player3) updateData = { squad_player3: myPlayerId };
    else return res.status(400).json({ message: "더 이상 스쿼드를 추가할 수 없습니다." });

    await prisma.squad.update({
      where: { squad_id: squad.squad_id },
      data: updateData,
    });

    // 로직 종료
    const rolPlayer = await prisma.players.findUnique({ where: { player_id: player.player_id } });
    const message = `${rolPlayer.player_name} 선수를 스쿼드에 등록했습니다`;
    return res.status(200).json({ message, myPlayer_id: myPlayerId });
  } catch (err) {
    console.log(err);
    next(err);
    return res.status(500).json({
      message: "서버 에러 발생",
      errCode: err.message,
    });
  }
}
);

// 스쿼드 삭제 API
router.delete("/squad/:myPlayer_id/setdown", authMiddleware, async (req, res, next) => {
  try {
    // 데이터 유효성 검사
    if (!req.account) return res.status(401).json({ message: "로그인이 필요합니다." });
    const accountId = +req.account.account_id;

    const squad = await prisma.squad.findUnique({
      where: { account_id: accountId },
      select: {
        squad_id: true,
        squad_player1: true,
        squad_player2: true,
        squad_player3: true,
      },
    });
    if (!squad) return res.status(404).json({ message: "스쿼드가 등록되어 있지 않습니다." });

    // Squad 테이블에서 params 데이터 조회
    const myPlayer_id = +req.params.myPlayer_id;
    let updateData = {};
    if (squad.squad_player1 === myPlayer_id) updateData = { squad_player1: null };
    else if (squad.squad_player2 === myPlayer_id) updateData = { squad_player2: null };
    else if (squad.squad_player3 === myPlayer_id) updateData = { squad_player3: null };
    else return res.status(404).json({ message: "해당 선수가 스쿼드에 등록되어 있지 않습니다." });

    const targetPlayer = await prisma.myPlayers.findUnique({
      where: { myPlayer_id },
      select: {
        player_id: true,
        players: { select: { player_name: true } }
      }
    });
    const targetPlayerName = targetPlayer.players.player_name;
    // 조회 완료 후 데이터 삭제
    await prisma.squad.update({
      where: { account_id: accountId },
      data: updateData
    });

    // 데이터 삭제 후 현재 Squad 확인
    const curSquad = await prisma.squad.findUnique({
      where: { account_id: accountId },
      select: {
        squad_player1: true,
        squad_player2: true,
        squad_player3: true
      }
    });
    // 스쿼드에 남아있는 선수가 없다면 데이터 삭제
    if (!curSquad.squad_player1 && !curSquad.squad_player2 && !curSquad.squad_player3) {
      await prisma.squad.delete({ where: { account_id: accountId } });
    }

    // 로직 종료
    const message = `${targetPlayerName} 선수를 스쿼드에서 제외했습니다`;
    return res.status(200).json(message);
  } catch (err) {
    console.log(err);
    next(err);
    return res.status(500).json({
      message: "서버 에러 발생",
      errCode: err.message,
    });
  }
}
);

export default router;
