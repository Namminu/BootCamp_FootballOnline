import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function (req, res, next) {
    try {
        const authorization = req.headers.authorization;
        if(!authorization)
            throw new Error('토큰이 존재하지 않습니다.');
        const token = req.headers.authorization.split(' ')[1];
        
        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        const account_id = decodedToken.account_id;

        const account = await prisma.accounts.findFirst({
            where: { account_id: account_id },
        });
        if (!account) {
            res.clearCookie('authorization');
            throw new Error('토큰 사용자가 존재하지 않습니다.');
        }

        req.account = account;
        next();
    } catch (error) {
        res.clearCookie('authorization');

        switch (error.name) {
            case 'TokenExpiredError':
                return res
                    .status(401)
                    .json({ message: '토큰이 만료되었습니다.' });
            case 'JsonWebTokenError':
                return res
                    .status(401)
                    .json({ message: '토큰이 조작되었습니다.' });
            default:
                return res.status(401).json({
                    message: error.message ?? '비정상적인 요청입니다.',
                });
        }
    }
}