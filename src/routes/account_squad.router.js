import express from 'express';
import { prisma } from '../../utils/prisma/index.js'
import authMiddleware from "../middlewares/auth.middleware.js"

const router = express.Router();

// 스쿼드 조회 API
router.get('/squad/:targetId', authMiddleware, async (req, res, next) => {
    try {
        // JWT 를 통해 받은 로그인 한 계정의 ID값
        const myAccountId = req.account.accountId;
        // 로그인이 되어 있지 않을 경우 처리
        if (!myAccountId) return res.status(401).json({ message: "로그인이 필요합니다." });

        // 찾으려는 계정의 ID값
        const targetId = +req.params.accountId;
        const target = await prisma.accounts.findUnique({ where: { account_id: targetId } });
        // 찾는 계정이 존재하지 않을 경우 처리
        if (!target) return res.status(404).json({ message: "존재하지 않는 계정입니다." });

        // 내 스쿼드가 아닌 경우
        if (myAccountId !== target.account_id) {
            const squad = await prisma.squad.findUnique({
                where: { account_id: targetId },
                include: {
                    player1: { include: { players: true } },
                    player2: { include: { players: true } },
                    player3: { include: { players: true } },
                }
            });

            // 스쿼드가 존재 하지 않을 경우 처리
            if (!squad) return res.status(404).json({ message: "해당 계정은 스쿼드를 보유하고 있지 않습니다." });

            // 스쿼드 데이터 매핑
            const playerSlots = [squad.player1, squad.player2, squad.player3];
            const squadList = playerSlots.map((slot, idx) => {
                if (!slot) return null;
                return {
                    [`Player${idx + 1}`]: slot.players.player_name,
                    "강화 단계": slot.enhanced
                }
            }).filter(Boolean);

            return res.status(200).json({ [`${target.account_name} 님의 스쿼드 `]: squadList });
        }
        // 내 스쿼드인 경우
        else {
            const squad = await prisma.squad.findUnique({
                where: { account_id: targetId },
                include: {
                    player1: { include: { players: true } },
                    player2: { include: { players: true } },
                    player3: { include: { players: true } },
                }
            });

            // 스쿼드가 존재 하지 않을 경우 처리
            if (!squad) return res.status(404).json({ message: "현재 스쿼드를 보유하고 있지 않습니다." });

            // 스쿼드 데이터 매핑
            const playerSlots = [squad.player1, squad.player2, squad.player3];
            const squadList = playerSlots.map((slot, idx) => {
                if (!slot) return null;
                return {
                    [`Player${idx + 1}`]: slot.players.player_name,
                    "강화 단계": slot.enhanced
                }
            }).filter(Boolean);

            return res.status(200).json({ [`나의 스쿼드 `]: squadList });
        }

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "서버 에러 발생",
            errCode: err.message
        });
    }
});

// 스쿼드 추가 API
router.post('/squad/:playerId/setup', authMiddleware, async (req, res, next) => {
    try {
        if (!req.account) return res.status(401).json({ message: "로그인이 필요합니다." });
        const accountId = +req.account.accountId;
        // accountId 기반으로 MyPlayers 테이블에서 보유 선수 > 0 인지 탐색
        // 보유 선수 >= 3 이면 return 예외 처리

        // 보유한 선수가 없을 경우 return 예외 처리

        // 있을 경우 params 로 전달한 스쿼드에 추가하려는 선수 할당
        const playerId = +req.params.playerId;
        // 선수 id를 다시 MyPlayers 테이블에서 탐색, 보유한 선수인지 조회
        //if(!playerId) return res.status(404).json({message : "현재 해당 선수를 보유하고 있지 않습니다."});

        // 있을 경우 Squad 테이블로 전달 : player1, 2, 3 순으로 순차 전달해야됨

        // 이후 종료
        const message = `${playerId.player_name} 선수를 스쿼드에 등록했습니다`;
        return res.status(200).json(message);
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "서버 에러 발생",
            errCode: err.message
        });
    }
});

// 스쿼드 삭제 API
router.delete('/squad/:playerId/setdown', authMiddleware, async (req, res, next) => {
    try {

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "서버 에러 발생",
            errCode: err.message
        });
    }
});


export default router;