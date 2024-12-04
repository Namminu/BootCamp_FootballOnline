import { prisma } from "../utils/prisma/index.js";
import  express from "express"
import authMiddleware from "../middlewares/auth.middleware.js" 


const router = express.Router()


// 캐시구매
router.get('/cash/:email' , authMiddleware, async(req , res) => {
    try{
      const {account_id} = req.account
      const {email} = req.params
      const result = await prisma.accounts.findUnique({
        where : {email : email , account_id : account_id,}
        
      })
      
      if(!result){
        return res.status(400).json({message:"해당 이메일과 계정 정보가 일치하지 않습니다"})
      }
      
      result.money += 1000

      await prisma.accounts.update({
        where: { email: email , account_id : account_id},
        data: { money : result.money}
      })
      
  
      return res.status(201).
      json({message: "충전에 성공했습니다",
            cash: result.money 
      })
  
  
    }
    catch(error){
      return res.status(500).json({message : "캐시구메 에러가 발생했습니다"})
    }
  })

export default router;
