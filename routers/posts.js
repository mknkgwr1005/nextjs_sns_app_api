const router = require("express").Router();
const isAuthenticated = require("../middlewares/isAuthenticated");

const prisma = require("../lib/prisma");

// ポスト投稿
router.post("/post", isAuthenticated, async (req, res) => {
  const { content, mediaUrl } = req.body;

  if (!content) {
    return res.status(400).json({ message: "投稿内容がありません" });
  }

  try {
    const newPost = await prisma.post.create({
      data: {
        content,
        mediaUrl,
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

// 親ポスト取得
router.get("/get_parent_post/:parentId", isAuthenticated, async (req, res) => {
  const parentId = parseInt(req.params.parentId);

  try {
    const parentPost = await prisma.post.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                profileImageUrl: true,
              },
            },
          },
        },
      },
    });
    return res.status(201).json(parentPost);
  } catch (error) {
    console.error(error);
  }
});

//最新のポスト取得
router.get("/get_latest_post", isAuthenticated, async (req, res) => {
  const { postLength } = req.params;

  try {
    const latestPosts = await prisma.post.findMany({
      where: {
        parentId: null,
      },
      take: postLength,
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
        _count: { select: { replies: true, likes: true, reposts: true } },
      },
    });

    const reposts = await prisma.repost.findMany({
      take: postLength,
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
  const { postLength } = req.params;
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
      take: postLength,
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
    });

    const reposts = await prisma.repost.findMany({
      take: postLength,
      where: {
        userId: { in: ids },
      },
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
      take: 10,
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
    // いいねの確認
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: userId,
          postId: postId,
        },
      },
    });

    // いいね解除
    if (existingLike) {
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId: userId,
            postId: postId,
          },
        },
      });
      return res
        .status(200)
        .json({ message: "いいね解除しました", isLiked: false });
    }

    // いいねをつける
    const newLike = await prisma.like.create({
      data: {
        postId: postId,
        userId: userId,
      },
    });

    return res.status(201).json({ newLike, isLiked: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

// ユーザーのポストをリポストをする
router.post("/add_repost", async (req, res) => {
  const { postId, userId } = req.body;

  try {
    // すでにリポストしていないか確認
    const existing = await prisma.repost.findUnique({
      where: {
        userId_postId: {
          userId: userId,
          postId: postId,
        },
      },
    });

    if (existing) {
      await prisma.repost.delete({
        where: {
          userId_postId: {
            userId: userId,
            postId: postId,
          },
        },
      });
      return res
        .status(409)
        .json({ message: "リポストを解除しました", isReposted: false });
    }

    // 新規リポスト
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
      isReposted: true,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "サーバーエラーです" });
  }
});

// ポストのステータスを表示
router.post("/get_post_status", async (req, res) => {
  const { postIds, userId } = req.body;

  // 1. いいね情報をまとめて取得
  const existingLikes = await prisma.like.findMany({
    where: {
      userId: Number(userId),
      postId: { in: postIds.map(Number) },
    },
  });

  // 2. リポスト情報をまとめて取得
  const existingReposts = await prisma.repost.findMany({
    where: {
      userId: Number(userId),
      postId: { in: postIds.map(Number) },
    },
  });

  // 3. 各ポストのステータスをまとめて取得
  const statuses = await prisma.post.findMany({
    where: {
      id: { in: postIds.map(Number) },
    },
    include: {
      replies: true,
      likes: true,
      reposts: true,
    },
  });

  return res.status(200).json({
    likes: existingLikes,
    reposts: existingReposts,
    statuses: statuses,
  });
});

router.delete("/delete_post", isAuthenticated, async (req, res) => {
  const { postId, userId, content } = req.query;

  try {
    const targetPost = await prisma.post.delete({
      where: { id: parseInt(postId), authorId: userId, content: content },
    });

    return res.status(201).json(targetPost);
  } catch (error) {
    console.error(error);
    return res.status(401).json("ポストを削除できませんでした");
  }
});

module.exports = router;
