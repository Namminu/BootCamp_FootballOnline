import express from "express"
import { prisma } from "../utils/prisma/index.js";
import Joi from "joi"
import bcrypt from "bcrypt"
import jwt from 'jsonwebtoken';


const router = express.Router()


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
        .required() // 반드시 존재해야함
})

// 회원가입
router.post('/sign-up' , async (req ,res) => {
    try{
    const {email , password , account_name} = req.body
    const money = 10000
    const mmr = 1000

    const {error} = schema.validate({email , password , account_name})
    
    if(error){
        return res.status(400).json({message: "아이디,비밀번호,닉네임이 규칙에 맞게 작성되지 않았습니다"})
    }


    const email_exists = await prisma.accounts.findUnique({
        where: { email },
      });
      
      if (email_exists) {
        return res.status(400).json({ message: "해당 이메일은 누군가 사용 중입니다." });
      }
      
   
      const accountname_exists = await prisma.accounts.findUnique({
        where: { account_name },
      });
      
      if (accountname_exists) {
        return res.status(400).json({ message: "해당 닉네임은 누군가 사용 중입니다." });
      }
     
      // bcrypt 를 이용해서 password 암호화
      const salt = 10
      const crypt_password = await bcrypt.hash(password , salt)


    const result = await prisma.accounts.create({
        data: {
            email,
            password : crypt_password,
            account_name,
            money ,
            mmr,
        }
    })

    return res.status(201).json(({
        message:"가입에 성공했습니다. 환영합니다!",
        data: result}))
    }
    catch(error){
        return res.status(500).json({message:"회원가입 에러가 발생했습니다"})
    }

})


// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const user = await prisma.accounts.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: '존재하지 않는 이메일입니다.' });
    }

    
    const password_vaild = await bcrypt.compare(password , user.password)

    if(!password_vaild){
        return res.status(400).json({message: "비밀번호가 틀렸습니다"})
    }

    // JWT 토큰 생성 
    const token = jwt.sign(
      {
        account_id: user.account_id, // 토큰 데이터
        email: user.email,
      },
      process.env.JWT_KEY, // 토큰 서명 키
      { expiresIn: '1h' }  // 토큰 설정
    );

    


    return res.status(200).json({
      message: '로그인 성공!',
      token,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: '로그인 에러가 발생했습니다' });
  }
});

export default router;