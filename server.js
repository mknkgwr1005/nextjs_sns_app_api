const express = require("express");
const app = express();
const cors = require("cors");

const authRoute = require("./routers/auth");
const postsRoute = require("./routers/posts");
const userRoute = require("./routers/user");

require("dotenv").config();

const PORT = 5000;

// 🔽 Vercel の URL からのアクセスのみ許可
app.use(
  cors({
    origin: ["https://nextjs-sns-app.vercel.app", "http://localhost:3000"],
    credentials: true,
  })
);

app.use(express.json());

// endpointの作成
app.use("/api/auth", authRoute);
app.use("/api/posts", postsRoute);
app.use("/api/users", userRoute);

app.listen(PORT, () => console.log(`server is running on Port ${PORT}`));
