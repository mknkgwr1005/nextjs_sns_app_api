const express = require("express");
const app = express();
const authRoute = require("./routers/auth");
const postsRoute = require("./routers/posts");
const userRoute = require("./routers/user");
const cors = require("cors");

require("dotenv").config();

const PORT = 5000;

// URLにアクセスすると、HELLOを返す
// app.get("/", (req, res) => {
//   res.send("<h1>Hello</h1>");
// });

app.use(cors());
app.use(express.json());

//endpointの作成
app.use("/api/auth", authRoute);
app.use("/api/posts", postsRoute);
app.use("/api/users", userRoute);

app.listen(PORT, () => console.log(`server is running on Port ${PORT}`));
