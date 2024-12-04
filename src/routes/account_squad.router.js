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
router.post('/squad/:playerId', middleware, async (req, res, next) => {
    try {

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "서버 에러 발생",
            errCode: err.message
        });
    }
});

// 스쿼드 삭제 API
router.delete('/squad/:playerId', middleware, async (req, res, next) => {
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