import { prisma } from "../utils/prisma/index.js";
import  express from "express"
import authMiddleware from "../middlewares/auth.middleware.js" 


const router = express.Router()


// 캐시구매
router.get('/cash' , authMiddleware, async(req , res) => {
    try{
      const {account_name , buy_cash} = req.body
      const result = await prisma.accounts.findUnique({
        where : {account_name : account_name}
        
      })
      
      if(!result){
        return res.status(400).json({message:"해당 계정이름을 찾을수 없습니다"})
      }
      
      result.money += +buy_cash

      await prisma.accounts.update({
        where: {account_name : account_name},
        data: { money : result.money}
      })
      
  
      return res.status(201).
      json({message: "충전에 성공했습니다",
            cash: result.money 
      })
  
  
    }
    catch(error){
      return res.status(500).json({message : "캐시구매 에러가 발생했습니다"})
    }
  })

export default router;
