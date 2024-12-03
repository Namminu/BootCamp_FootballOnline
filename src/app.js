import express from "express";
import cookieParser from "cookie-parser";
// import AccountsRouter from "./routes/accounts.router.js";
// import AccountPlayerRouter from "./routes/account.player.router.js";
// import AccountSquadRouter from "./routes/account.squad.router.js";
// import GameRouter from "./routes/game.router.js";
// import PlayerRouter from "./routes/player.router.js";
import PlayerDrawRouter from "./routes/player.draw.router.js";
// import PlayerEnhanceRouter from "./routes/player.enhance.router.js";
// import RankingRouter from "./routes/ranking.router.js";
//import dotenv from "dotenv";
//import errorHandlingMiddleware from "./middlewares/error-handling.middleware.js";

const app = express();
const PORT = 3018;

app.use(express.json());
app.use(cookieParser());
//app.use(errorHandlingMiddleware);
app.use("/api", [
//   AccountsRouter,
//   AccountPlayerRouter,
//   AccountSquadRouter,
//   GameRouter,
//   PlayerRouter,
   PlayerDrawRouter,
//   PlayerEnhanceRouter,
   RankingRouter,
]);

//dotenv.config();

app.get("/", (req, res) => {
  //const { authorization: token } = req.headers;

  res.send("풋살 온라인 게임 서버 서비스입니다.");
});

app.listen(PORT, () => {
  console.log(PORT, "포트로 서버가 열렸어요!");


// 서버 시작
app.listen(PORT, () => {
  console.log(`${PORT} 포트로 서버가 열렸어요!`);
});
