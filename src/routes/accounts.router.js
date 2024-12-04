import express from "express";
import { prisma } from "../utils/prisma/index.js";
<<<<<<< Updated upstream
import Joi from "joi";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = express.Router();

const schema = Joi.object({
  email: Joi.string() // 문자열
    .email() // 이메일 형식
    .required(), // 반드시 존재해야함

  password: Joi.string()
    .alphanum() // 영어와 숫자만 사용할것
    .min(6) // 최소6글자
    .required(), // 반드시 존재해야함

  account_name: Joi.string()
    .alphanum() // 영어와 숫자만 사용할것
    .min(6) // 최소6글자
    .required(), // 반드시 존재해야함
});

=======
import jwt from "jsonwebtoken";
import Joi from "joi";
import bcrypt from "bcrypt";
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// 회원가입 (기본키 , 아이디[이메일]{필수} , 아이디 , 비번 ,닉네임 중복 x
// 비밀번호{필수} , 닉네임{필수} , 보유재화{필수} , mmr?) , 아이디 비번은 영어 숫자만

>>>>>>> Stashed changes
// 회원가입
router.post("/sign-up", async (req, res) => {
  try {
    const { email, password, account_name } = req.body;
    const money = 10000;
    const mmr = 1000;

<<<<<<< Updated upstream
    // 요청 바디 유효성 검사
    const { error } = schema.validate({ email, password, account_name });

    if (error) {
      return res
        .status(400)
        .json({
          message: "아이디, 비밀번호, 닉네임이 규칙에 맞게 작성되지 않았습니다",
        });
    }

    // 이메일 중복 확인
=======
    const { error } = schema.validate({ email, password, account_name });

    if (error) {
      return res.status(400).json({
        message: "아이디,비밀번호,닉네임이 규칙에 맞게 작성되지 않았습니다",
      });
    }

>>>>>>> Stashed changes
    const email_exists = await prisma.accounts.findUnique({
      where: { email },
    });

    if (email_exists) {
      return res
        .status(400)
<<<<<<< Updated upstream
        .json({ message: "해당 이메일은 이미 사용 중입니다." });
    }
=======
        .json({ message: "해당 이메일은 누군가 사용 중입니다." });
    }

    const password_exists = await prisma.accounts.findMany({
      where: { password },
    });

    if (password_exists.length > 0) {
      return res
        .status(400)
        .json({ message: "해당 비밀번호는 누군가 사용 중입니다." });
    }

    const accountname_exists = await prisma.accounts.findUnique({
      where: { account_name },
    });

    if (accountname_exists) {
      return res
        .status(400)
        .json({ message: "해당 닉네임은 누군가 사용 중입니다." });
    }

    const salt = 10;
    const crypt_password = await bcrypt.hash(password, salt);
>>>>>>> Stashed changes

    // 계정명 중복 확인
    const accountname_exists = await prisma.accounts.findUnique({
      where: { account_name },
    });

    if (accountname_exists) {
      return res
        .status(400)
        .json({ message: "해당 닉네임은 이미 사용 중입니다." });
    }

    // bcrypt 를 이용해 비밀번호 암호화
    const saltRounds = 10; // saltRounds 변수명 수정
    const crypt_password = await bcrypt.hash(password, saltRounds);

    // 새로운 사용자 계정 생성
    const result = await prisma.accounts.create({
      data: {
        email,
        password: crypt_password,
        account_name,
        money,
        mmr,
      },
    });

    return res.status(201).json({
      message: "가입에 성공했습니다. 환영합니다!",
      data: result,
    });
  } catch (error) {
<<<<<<< Updated upstream
    console.error(error); // 서버 로그로 에러 출력
    return res
      .status(500)
      .json({ message: "회원가입 중 오류가 발생했습니다." });
=======
    return res.status(500).json({ message: "회원가입 에러가 발생했습니다" });
>>>>>>> Stashed changes
  }
});

// 로그인
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.accounts.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: "존재하지 않는 이메일입니다." });
    }

<<<<<<< Updated upstream
    const password_vaild = await bcrypt.compare(password, user.password);

    if (!password_vaild) {
      return res.status(400).json({ message: "비밀번호가 틀렸습니다" });
    }

    // JWT 토큰 생성
=======
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "비밀번호가 올바르지 않습니다." });
    }

>>>>>>> Stashed changes
    const token = jwt.sign(
      {
        account_id: user.account_id,
        email: user.email,
      },
<<<<<<< Updated upstream
      "SecretKey", // 암호화 서명
      { expiresIn: "1h" } // 만료시간 1시간
=======
      process.env.JWT_KEY,
      { expiresIn: "1h" }
>>>>>>> Stashed changes
    );

    // 사용자에게 JWT 토큰이 들어간 쿠키를 보냄
    res.cookie("authorization", `Bearer ${token}`, {
      httpOnly: true, // 자바스크립트로 쿠키 수정불가
      sameSite: "strict", // 동일한 사이트만 가능
      maxAge: 3600000, // 만료시간 1시간
    });

    return res.status(200).json({
      message: "로그인 성공!",
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "로그인 에러가 발생했습니다" });
  }
});

export default router;
