const User = require('../models/User');

const rememberFriend = async (userId, friendUserId) => {
  if (!userId || !friendUserId) return;
  if (userId.toString() === friendUserId.toString()) return;

  await User.updateOne(
    { _id: userId },
    { $addToSet: { friends: friendUserId } }
  );
};

const rememberFriendByEmail = async (userId, email) => {
  if (!userId || !email?.trim()) return;

  const friend = await User.findOne({ email: email.trim().toLowerCase() });
  if (!friend) return;

  await rememberFriend(userId, friend._id);
};

const rememberFriendsMutual = async (userIdA, userIdB) => {
  await Promise.all([
    rememberFriend(userIdA, userIdB),
    rememberFriend(userIdB, userIdA)
  ]);
};

module.exports = {
  rememberFriend,
  rememberFriendByEmail,
  rememberFriendsMutual
};
