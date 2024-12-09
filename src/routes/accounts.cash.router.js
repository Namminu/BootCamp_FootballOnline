import { prisma } from "../utils/prisma/index.js";
import  express from "express"
import authMiddleware from "../middlewares/auth.middleware.js" 


const router = express.Router()


// 캐시구매
router.get('/cash' , authMiddleware, async(req , res) => {
    try{
      const {buy_cash} = req.body
      
      if(+buy_cash < 1){
        return res.status(400).json({message: "올바른 캐시값을 입력해 주세요"})
      }

      const {account_name , money } = req.account
      const result_money = money + buy_cash

      await prisma.accounts.update({
        where: {account_name : account_name},
        data: { money : result_money}
      })
      
  
      return res.status(201).
      json({message: "충전에 성공했습니다",
            cash: result_money 
      })
  
  
    }
    catch(err){
      next(err)
    }
  })

export default router;
