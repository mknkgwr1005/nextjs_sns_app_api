const express = require("express");
const app = express();
const cors = require("cors");

const authRoute = require("./routers/auth");
const postsRoute = require("./routers/posts");
const userRoute = require("./routers/user");

require("dotenv").config();

const PORT = 5000;

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://nextjs-sns-app.vercel.app",
        "https://nextjs-sns-app-api-wnvl.onrender.com",
      ];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// endpointの作成
app.use("/api/auth", authRoute);
app.use("/api/posts", postsRoute);
app.use("/api/users", userRoute);

app.listen(PORT, () => console.log(`server is running on Port ${PORT}`));
