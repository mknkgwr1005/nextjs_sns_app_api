const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const isAuthenticated = require("../middlewares/isAuthenticated");

const prisma = new PrismaClient();

// ユーザーを見つける
router.get("/find", isAuthenticated, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user) {
      res.status(404).json({ message: "ユーザーが見つかりませんでした" });
    }

    res.status(200).json({
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ユーザーのプロフィールを取得
router.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const profile = await prisma.profile.findUnique({
      where: {
        userId: parseInt(userId),
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });
    if (!profile) {
      return res
        .status(404)
        .json({ message: "プロフィールが見つかりませんでした。" });
    }

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json(error.message);
  }
});

// ユーザーのフォローフォロワー数を確認
router.get("/follow_count/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
      include: {
        following: true,
        followers: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "ユーザーが見つかりませんでした。" });
    }

    res.status(200).json({
      followingCount: user.following.length,
      followersCount: user.followers.length,
    });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

// ユーザーのフォロー
router.post("/follow", isAuthenticated, async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !targetUser) {
      return res
        .status(404)
        .json({ message: "ユーザーが見つかりませんでした。" });
    }

    // 既にフォローしている場合は何もしない
    if (user.following.some((u) => u.id === targetUser.id)) {
      return res.status(200).json({ message: "既にフォローしています。" });
    }

    // フォローを追加
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        following: {
          connect: { id: userId },
        },
      },
    });

    res.status(200).json({ message: "フォローしました。" });
  } catch (error) {
    res.status(500).json(error.message);
  }
});

// フォロー解除
router.post("/unfollow", isAuthenticated, async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || !targetUser) {
      return res
        .status(404)
        .json({ message: "ユーザーが見つかりませんでした。" });
    }

    // まだフォローしていない場合は何もしない
    if (!user.following.some((u) => u.id === targetUser.id)) {
      return res.status(200).json({ message: "フォローしていません。" });
    }

    // フォロー解除
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        following: {
          disconnect: { id: userId },
        },
      },
    });

    res.status(200).json({ message: "フォロー解除しました。" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * フォロー中かどうかを確認
 * @param {number} userId - ユーザーID
 */
router.get("/is_following/:userId", isAuthenticated, async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: { following: true },
    });

    if (!user) {
      return res
        .status(404)
        .json({ message: "ユーザーが見つかりませんでした。" });
    }

    const isFollowing = user.following.some((u) => u.id === parseInt(userId));

    res.status(200).json({ isFollowing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
