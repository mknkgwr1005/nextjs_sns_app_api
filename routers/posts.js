const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
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

    const formattedPost = {
      type: "post",
      createdAt: newPost.createdAt,
      post: newPost,
    };

    return res.status(201).json(formattedPost);
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

    const formattedPost = {
      type: "post",
      createdAt: newPost.createdAt,
      post: newPost,
    };

    return res.status(201).json(formattedPost);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

//最新のポスト取得
router.get("/get_latest_post", isAuthenticated, async (req, res) => {
  try {
    const latestPosts = await prisma.post.findMany({
      where: {
        parentId: null,
      },
      include: {
        likes: true,
        replies: {
          include: {
            likes: true,
            author: {
              include: {
                profile: true,
              },
            },
          },
        },
        author: {
          include: {
            profile: true,
          },
        },
      },
      take: 30,
    });

    const reposts = await prisma.repost.findMany({
      include: {
        user: { include: { profile: true } }, // ← リポストした人
        post: {
          include: {
            author: { include: { profile: true } },
            likes: true,
            replies: {
              include: {
                likes: true,
                author: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 30,
    });

    const formattedPosts = latestPosts.map((p) => ({
      type: "post",
      createdAt: p.createdAt,
      post: p,
    }));

    const formattedReposts = reposts.map((r) => ({
      type: "repost",
      createdAt: r.createdAt,
      post: r.post,
      repostedBy: r.user,
    }));

    const timeline = [...formattedPosts, ...formattedReposts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json(timeline);
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

    let ids = followingList.map((f) => f.followingId);
    ids.push(userId);

    // 1回のクエリでまとめて取得
    const latestPosts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        parentId: null,
        authorId: { in: ids },
      },
      include: {
        likes: true,
        replies: true,
        author: {
          include: {
            profile: true,
          },
        },
        replies: {
          include: {
            likes: true,
            author: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      take: 30,
    });

    const reposts = await prisma.repost.findMany({
      include: {
        user: { include: { profile: true } }, // ← リポストした人
        post: {
          include: {
            author: { include: { profile: true } },
            likes: true,
            replies: {
              include: {
                likes: true,
                author: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 30,
    });

    const formattedPosts = latestPosts.map((p) => ({
      type: "post",
      createdAt: p.createdAt,
      post: p,
    }));

    const formattedReposts = reposts.map((r) => ({
      type: "repost",
      createdAt: r.createdAt,
      post: r.post,
      repostedBy: r.user,
    }));

    const timeline = [...formattedPosts, ...formattedReposts].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.json(timeline);
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

// ユーザーのポストにいいねをする
router.post("/add_like", async (req, res) => {
  const { postId, userId } = req.body;

  try {
    const newLike = await prisma.like.create({
      data: {
        postId: postId,
        userId: userId,
      },
    });

    return res.status(201).json(newLike);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

// ユーザーのポストをリポストをする
router.post("/add_repost", async (req, res) => {
  const { postId, userId } = req.body;

  try {
    const repost = await prisma.repost.create({
      data: {
        userId: userId,
        postId: postId,
      },
    });

    const repostWithUser = await prisma.repost.findUnique({
      where: { id: repost.id },
      include: {
        user: { include: { profile: true } },
        post: {
          include: {
            author: { include: { profile: true } },
            likes: true,
            replies: {
              include: {
                likes: true,
                author: { include: { profile: true } },
              },
            },
          },
        },
      },
    });
    return res.status(201).json({
      type: "repost",
      createdAt: repostWithUser.createdAt,
      post: repostWithUser.post,
      repostedBy: repostWithUser.user,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

// ポストのステータスを表示
router.post("/get_post_status", async (req, res) => {
  const { postId, userId } = req.body;

  const existingLike = await prisma.like.findUnique({
    where: {
      userId_postId: {
        userId: Number(userId),
        postId: Number(postId),
      },
    },
  });

  const existingRepost = await prisma.repost.findUnique({
    where: {
      userId_postId: {
        userId: Number(userId),
        postId: Number(postId),
      },
    },
  });

  const status = await prisma.post.findUnique({
    where: {
      id: postId,
    },
    include: {
      replies: true,
      likes: true,
      reposts: true,
    },
  });

  return res.status(200).json({
    isLiked: !!existingLike,
    isReposted: !!existingRepost,
    status: status,
  });
});

module.exports = router;
