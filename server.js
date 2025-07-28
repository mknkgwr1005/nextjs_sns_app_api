const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");

const authRoute = require("./routers/auth");
const postsRoute = require("./routers/posts");
const userRoute = require("./routers/user");

require("dotenv").config();

const PORT = 3001;

const allowedOrigins = [
  "http://localhost:3000",
  "https://nextjs-sns-app.vercel.app",
  "https://nextjs-sns-app-api-wnvl.onrender.com",
];

// ping監視
app.get("/api/health", (req, res) => {
  res.status(200).send("OK");
});

// CORS設定
app.use(
  cors({
    origin: (origin, callback) => {
      console.log("🌐 CORS Request Origin:", origin); // ← デバッグ用ログ
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        (origin && origin.endsWith(".vercel.app"))
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 🔧 JSONボディのサイズ上限を10MBに設定
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api/posts", postsRoute);
app.use("/api/users", userRoute);

app.listen(PORT, () => console.log(`server is running on Port ${PORT}`));
