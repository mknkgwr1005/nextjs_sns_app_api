const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const isAuthenticated = require("../middlewares/isAuthenticated");

const prisma = new PrismaClient();

// ポスト投稿
router.post("/post", isAuthenticated, async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: "投稿内容がありません" });
  }

  try {
    const newPost = await prisma.post.create({
      data: {
        content,
        authorId: req.userId,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
      },
    });

    return res.status(201).json(newPost);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

// リプライ投稿
router.post("/reply/:parentId", isAuthenticated, async (req, res) => {
  const { content } = req.body;
  const parentId = parseInt(req.params.parentId);

  if (!content) {
    return res.status(400).json({ message: "投稿内容がありません" });
  }

  try {
    const newPost = await prisma.post.create({
      data: {
        content,
        authorId: req.userId,
        parentId: parentId,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
      },
    });

    return res.status(201).json(newPost);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

//最新のポスト取得
router.get("/get_latest_post", async (req, res) => {
  try {
    const latestPosts = await prisma.post.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        replies: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    return res.json(latestPosts);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

// フォロー中のユーザーのポストのみ取得
router.get("/get_following_post", isAuthenticated, async (req, res) => {
  const userId = req.userId;
  try {
    const followingList = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const ids = followingList.map((f) => f.followingId);

    // 1回のクエリでまとめて取得
    const latestPosts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        authorId: { in: ids },
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        replies: {
          include: {
            author: {
              include: {
                profile: true,
              },
            },
          },
        }, 
      },
      take: 10, // ← 全体から10件だけ取得（必要に応じて調整）
    });
    return res.json(latestPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

// ユーザーのポストを取得
router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const userPosts = await prisma.post.findMany({
      where: { authorId: parseInt(userId) },
      orderBy: { createdAt: "desc" },
      include: { author: true },
    });

    return res.status(200).json(userPosts);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "サーバーエラーです" });
  }
});

module.exports = router;
