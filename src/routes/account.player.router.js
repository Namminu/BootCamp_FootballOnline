import express from 'express';
import { prisma } from '../utils/prisma/index.js'
import authMiddleware from "../middlewares/auth.middleware.js"

const router = express.Router();

// 보유 선수 조회 API
router.get('/players/getPlayer', authMiddleware, async (req, res, next) => {
    try {
        const accountId = +req.account.accountId;
        if (!accountId) res.status(404).json({ message: "해당 계정이 존재하지 않습니다." });
        // MyPlayers 테이블과 Players 테이블 Join 데이터 할당
        const players = await prisma.myPlayers.findMany({
            where: { account_id: accountId },
            include: {
                players: true
            }
        });
        // 보유한 선수가 없을 경우
        if (!players || players.length === 0) {
            return res.status(404).json({ message: "보유한 선수가 존재하지 않습니다." });
        }
        // 보유 선수 데이터 매핑
        const playerList = players.map(player => ({
            "선수 이름": player.players.player_name,
            "강화 단계": player.enhanced
        }));

        return res.status(200).json({ "myPlayers": playerList });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "서버 에러 발생",
            errCode: err.message
        });
    }
});

export default router;