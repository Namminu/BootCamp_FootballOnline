import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma/index.js";

export default async function (req, res, next) {
  try {
    // Authorization 헤더에서 토큰 추출
    const authorization = req.headers.authorization;
    if (!authorization) {
      throw new Error("토큰이 존재하지 않습니다.");
    }

    // "Bearer <token>" 형식에서 토큰만 추출
    const [ type, token ] = authorization.split(" ");

    // JWT 토큰 검증
    if(type!==("Bearer"))
        throw new Error("Bearer 토큰 타입이 아닙니다."); 

    // JWT 토큰 검증
    const decodedToken = jwt.verify(token, process.env.JWT_KEY);
    const account_id = decodedToken.account_id;

    // 토큰을 통해 account_id를 찾고 사용자 정보 조회
    const account = await prisma.accounts.findFirst({
      where: { account_id: account_id },
    });

    if (!account) {
      throw new Error("토큰 사용자가 존재하지 않습니다.");
    }

    // 인증된 사용자 정보를 req.account에 저장
    req.account = account;

    // 다음 미들웨어로 넘어감
    next();
  } catch (error) {
    // 오류 처리
    switch (error.name) {
      case "TokenExpiredError":
        return res.status(401).json({ message: "토큰이 만료되었습니다." });
      case "JsonWebTokenError":
        return res.status(401).json({ message: "토큰이 조작되었습니다." });
      default:
        return res.status(401).json({
          message: error.message ?? "비정상적인 요청입니다.",
        });
    }
  }
}
