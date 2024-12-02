import express from "express"
import {PrismaClient} from "@prisma/client"
import Joi from "joi"
import bcrypt from "bcrypt"

const prisma = new PrismaClient({
    log: ['query' , 'info' , 'warn' , 'error'],

    errorFormat: 'pretty'
})

const router = express.Router()


const schema = Joi.object({
    email: Joi.string()
        .email
        .required(),

    password: Joi.string()
        .alphanum()
        .min(6)
        .required(),

    account_name: Joi.string()
        .alphanum()
        .min(6)
        .required()
})




// 회원가입 (기본키 , 아이디[이메일]{필수} , 아이디 , 비번 ,닉네임 중복 x
// 비밀번호{필수} , 닉네임{필수} , 보유재화{필수} , mmr?) , 아이디 비번은 영어 숫자만


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
      
      const password_exists = await prisma.accounts.findMany({
        where: { password },
      });
      
      if (password_exists.length > 0) {
        return res.status(400).json({ message: "해당 비밀번호는 누군가 사용 중입니다." });
      }
      
      const accountname_exists = await prisma.accounts.findUnique({
        where: { account_name },
      });
      
      if (accountname_exists) {
        return res.status(400).json({ message: "해당 닉네임은 누군가 사용 중입니다." });
      }
      
    const salt = 10
    const crypt_password = await bcrypt.hash(password,salt)


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
import jwt from 'jsonwebtoken';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const user = await prisma.accounts.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ message: '존재하지 않는 이메일입니다.' });
    }

    
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: '비밀번호가 올바르지 않습니다.' });
    }

    
    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
      },
      'SecretKey', 
      { expiresIn: '1h' } 
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
  