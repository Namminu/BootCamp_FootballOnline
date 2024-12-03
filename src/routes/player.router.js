import express from 'express';
import { prisma } from '../utils/prisma/index.js';

const router = express.Router();

// 선수 목록 조회
router.get('/players', async (req, res, next) => {
    const players = await prisma.Players.findMany({
        select: {
            player_name: true,
        }
    })
    return res.status(200).json({ players: players });
});

// 선수 상세 조회
router.get('/players/:playerId', async (req, res, next) => {
    const { playerId } = req.params;

    const player = await prisma.Players.findMany({
        where: { player_id: +playerId },
        select: {
            player_name: true,
            player_speed: true,
            player_finish: true,
            player_power: true,
            player_defense: true,
            player_stamina: true,
        }
    })
    if (!player) {
        return res.status(404).json({ msg: '존재하지 않는 선수입니다.' });
    }
    return res.status(200).json({ players: player });
})

export default router;