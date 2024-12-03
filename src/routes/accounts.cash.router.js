import {PrismaClient} from "@prisma/client" 
import  express from "express"
import jwt from 'jsonwebtoken';

const router = express.Router()

const prisma = new PrismaClient({
    log: ['query' , 'info' , 'warn' , 'error'],

    errorFormat: 'pretty'
})


// 캐시구매(인증 미들웨어가 필요)
router.get('/cash/:email' , async(req , res) => {
    try{
      const {account_id} = req.user

      const {email} = req.params
      const result = await prisma.accounts.findUnique({
        where : {email : email}
      })
      
      if(!result){
        return res.status(400).json({message:"해당 아이디[이메일]은 존재하지 않습니다"})
      }
      else if(result){
        result.money += 1000
      }
  
      return res.status(201).
      json({message: "충전에 성공했습니다",
            cash: result.money 
      })
  
  
    }
    catch(error){
      return res.status(500).json({message : "캐시구메 에러가 발생했습니다"})
    }
  })