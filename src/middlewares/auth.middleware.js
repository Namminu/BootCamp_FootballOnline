import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function (req, res, next) {
    try {
        const { authorization } = req.headers;
        if (!authorization)
            throw new Error('요청한 사용자의 토큰이 존재하지 않습니다.');

        const [tokenType, token] = authorization.split(' ');
        if (tokenType !== 'Bearer')
            throw new Error(`토큰 타입이 ${tokenType} 형식이옵니다. 아닙니다.`);

        const decodedToken = jwt.verify(token, process.env.JWT_KEY);
        const accountId = decodedToken.accountId;

        const account = await prisma.accounts.findFirst({
            where: { account_id: accountId },
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
