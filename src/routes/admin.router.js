import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

const activeTokens = {};

router.post("/admin", (req, res, next) => {
    const { username, password } = req.body;

    if (username === process.env.ADMIN_ID && password === process.env.ADMIN_PW) {
        // 이전 토큰 무효화
        if (activeTokens[username]) {
            delete activeTokens[username];
        }

        // JWT 발급
        const token = jwt.sign({ username }, process.env.JWT_KEY, {
            expiresIn: process.env.JWT_EXPIRES,
        });
        activeTokens[username] = token;

        res.cookie("adminToken", token);
        return res.json({ message: "Login successful" });
    }

    return res.status(401).json({ message: "Invalid credentials" });
});

// 관리자 페이지
router.get("/admin", (req, res, next) => {
    const token = req.cookies.adminToken;

    if (!token) {
        return res.status(403).json({ message: "Token required" });
    }

    jwt.verify(token, process.env.JWT_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid or expired token" });
        }

        if (activeTokens[user.username] !== token) {
            return res.status(403).json({ message: "Token is invalid (logged out elsewhere)" });
        }
        return res.json({ message: `Welcome to the admin page, ${user.username}!` });
    });
});

export default router;