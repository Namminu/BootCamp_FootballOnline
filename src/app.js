import express from "express";
<<<<<<< Updated upstream
import cookieParser from "cookie-parser";
import AccountsRouter from "./routes/accounts.router.js";
// import AccountPlayerRouter from "./routes/account.player.router.js";
// import AccountSquadRouter from "./routes/account.squad.router.js";
import GameRouter from "./routes/game.router.js";
// import PlayerRouter from "./routes/player.router.js";
import PlayerDrawRouter from "./routes/player.draw.router.js";
import PlayerEnhanceRouter from "./routes/player.enhance.router.js";
import RankingRouter from "./routes/ranking.router.js";
import dotenv from "dotenv";
import PlayerRouter from "./routes/player.router.js";
import errorHandlerMiddleware from "./middlewares/error-handler.middleware.js";
=======
import ranking from "./routes/ranking.router.js";
import account from "./routes/accounts.router.js";
>>>>>>> Stashed changes

const app = express();
const PORT = 3018;

<<<<<<< Updated upstream
dotenv.config();
=======
app.use(express.json());
app.use("/api", ranking);
app.use("/api", account);
>>>>>>> Stashed changes

app.use(express.json());
app.use(cookieParser());
app.use("/api", [
AccountsRouter,
//   AccountPlayerRouter,
//   AccountSquadRouter,
 GameRouter,
//   PlayerRouter,
   PlayerDrawRouter,
   PlayerEnhanceRouter,
   RankingRouter,
   PlayerRouter,
]);
app.use(errorHandlerMiddleware);

// 서버 시작
app.listen(PORT, () => {
  console.log(`${PORT} 포트로 서버가 열렸어요!`);
});

