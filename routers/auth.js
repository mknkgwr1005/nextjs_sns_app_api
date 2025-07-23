const router = require("express").Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const generateIdenticon = require("../utils/generateIdenticon");

const prisma = require("../lib/prisma");
// 新規ユーザー登録
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const registeredUser = await prisma.user.findUnique({ where: { email } });

  if (!username || !email || !password) {
    return res.status(401).json({
      error: "Invalid Value",
    });
  }

  if (registeredUser) {
    return res.status(401).json({
      error: "You are already registered",
    });
  }

  // メールアドレスとパスワードのバリデーションチェック
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.match(emailPattern)) {
    return res.status(401).json({
      error: "Invalid email address",
    });
  }
  const passwordPattern = /^[\w]{8,}$/;
  if (!password.match(passwordPattern)) {
    return res.status(401).json({
      error: "Invalid password",
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const defaultIconImage = generateIdenticon(email);
  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      profile: {
        create: {
          bio: "はじめまして",
          profileImageUrl: defaultIconImage,
        },
      },
    },
    include: {
      profile: true,
    },
  });
  return res.json({ user });
});

//ユーザーログインAPI
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res
      .status(401)
      .json({ error: "your email address or password is not registered" });
  }

  const token = jwt.sign({ id: user.id }, process.env.SECRET_KEY, {
    expiresIn: "1d",
  });

  res.cookie("token", token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production", // 本番環境ではtrue
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7 * 1000, // 1週間
  });

  return res.json({ token });
});

module.exports = router;
