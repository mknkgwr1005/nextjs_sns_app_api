const express = require("express");
const app = express();
const cors = require("cors");

const authRoute = require("./routers/auth");
const postsRoute = require("./routers/posts");
const userRoute = require("./routers/user");

require("dotenv").config();

const PORT = 5000;

const allowedOrigins = [
  "http://localhost:3000",
  "https://nextjs-sns-app.vercel.app",
  "https://nextjs-sns-app-api-wnvl.onrender.com",
];

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("🌐 CORS Request Origin:", origin); // ← デバッグ用ログ
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoute);
app.use("/api/posts", postsRoute);
app.use("/api/users", userRoute);

app.listen(PORT, () => console.log(`server is running on Port ${PORT}`));
