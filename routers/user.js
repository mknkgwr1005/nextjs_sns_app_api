const router = require("express").Router();
const { PrismaClient } = require("@prisma/client");
const isAuthenticated = require("../middlewares/isAuthenticated");

const prisma = new PrismaClient();

// ユーザーを見つける
router.get("/find", isAuthenticated, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    if (!user) {
      return res
        .status(404)
        .json({ message: "ユーザーが見つかりませんでした" });
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
  const { followingUserId } = req.body;
  const loginUserId = req.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: loginUserId },
    });
    const targetUser = await prisma.user.findUnique({
      where: { id: followingUserId },
    });

    if (!user || !targetUser) {
      return res
        .status(404)
        .json({ message: "ユーザーが見つかりませんでした。" });
    }

    // すでにフォローしているか確認（必要に応じて）
    const alreadyFollow = await prisma.follow.findFirst({
      where: {
        followerId: loginUserId,
        followingId: followingUserId,
      },
    });
    if (alreadyFollow) {
      return res.status(200).json({ message: "既にフォローしています。" });
    }

    // ✅ フォロー関係を作成
    await prisma.follow.create({
      data: {
        follower: { connect: { id: loginUserId } },
        following: { connect: { id: followingUserId } },
      },
    });

    res.status(200).json({ message: "フォローしました。" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// フォロー解除
router.post("/unfollow", isAuthenticated, async (req, res) => {
  const { followingUserId } = req.body;
  const loginUserId = req.userId;

  try {
    // 対象ユーザーが存在するか確認
    const targetUser = await prisma.user.findUnique({
      where: { id: followingUserId },
    });

    if (!targetUser) {
      return res
        .status(404)
        .json({ message: "対象ユーザーが見つかりません。" });
    }

    // フォロー関係を確認
    const followRelation = await prisma.follow.findFirst({
      where: {
        followerId: loginUserId,
        followingId: followingUserId,
      },
    });

    if (!followRelation) {
      return res.status(200).json({ message: "フォローしていません。" });
    }

    // フォロー解除
    await prisma.follow.delete({
      where: { id: followRelation.id },
    });

    return res.status(200).json({ message: "フォロー解除しました。" });
  } catch (error) {
    console.error("フォロー解除エラー:", error);
    return res.status(500).json({ message: "サーバーエラー" });
  }
});

/**
 * フォロー中かどうかを確認
 * @param {number} userId - ユーザーID
 */
router.get(
  "/is-following/:followerId/:followingId",
  isAuthenticated,
  async (req, res) => {
    const { followerId, followingId } = req.params;

    try {
      const follow = await prisma.follow.findFirst({
        where: {
          followerId: parseInt(followerId),
          followingId: parseInt(followingId),
        },
      });

      res.status(200).json({ isFollowing: !!follow });
    } catch (error) {
      console.error("フォロー判定エラー:", error);
      res.status(500).json({ message: "サーバーエラー" });
    }
  }
);

module.exports = router;
