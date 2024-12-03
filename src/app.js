import express from "express";
import ranking from "./routes/ranking.router.js";

const app = express();
const PORT = 3018;

app.use(express.json());
app.use("/api", ranking);


// 서버 시작
app.listen(PORT, () => {
  console.log(`${PORT} 포트로 서버가 열렸어요!`);
});
