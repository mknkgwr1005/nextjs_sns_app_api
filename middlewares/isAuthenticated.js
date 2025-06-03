const jwt = require("jsonwebtoken");

function isAuthenticated(req, res, next) {
  const token = req.headers.authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "権限がありません。" });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      console.log("err");
      return res.status(401).json({ message: "権限がありません。" });
    }

    req.userId = decoded?.id;
    // tokenを取得できたら、isAuthenticatedを使ったところ以降の処理を行う
    next();
  });
}

module.exports = isAuthenticated;
