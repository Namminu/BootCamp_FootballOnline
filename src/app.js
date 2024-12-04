import express from "express";
import cookieParser from "cookie-parser";
// import AccountsRouter from "./routes/accounts.router.js";
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

const app = express();
const PORT = 3018;

dotenv.config();

app.use(express.json());
app.use(cookieParser());
app.use("/api", [
//   AccountsRouter,
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

