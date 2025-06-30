import jwt from "jsonwebtoken";
import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import User from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import { cookieOptions } from "../utils/features.js";
import { adminSecretKey } from "../index.js";

const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;

  
  const isMatched = secretKey === adminSecretKey;

  if (!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);

  return (
    res
      .status(200)
      .cookie("pakau-admin-token", token, {
        ...cookieOptions,
        maxAge: 1000 * 60 * 15,
      }).json({
      success: true,
      message: "authenticated Successfully, welcom boss",
    })
  );
});


const adminLogout = TryCatch(async (req, res, next) => {
  

  return (
    res
      .status(200)
      .cookie("pakau-admin-token", {
        ...cookieOptions,
        maxAge: 1000 * 60 * 15,
      }).json({
      success: true,
      message: "Logged Out Successfully",
    })
  );
});

const getAdminData = TryCatch(async(req, res, next) => {
    return res.status(200).json({
      admin: true
    })
})

const allUsers = TryCatch(async (req, res) => {
  const users = await User.find({});

  const transfromedUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);

      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );

  return res.status(200).json({
    status: "success",
    users: transfromedUsers,
  });
});

const allChats = TryCatch(async (req, res) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChat = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });
      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        member: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );

  return res.status(200).json({
    status: "success",
    chats: transformedChat,
  });
});

const allMessages = TryCatch(async (req, res) => {
  const messsages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformMessages = messsages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    })
  );
  return res.status(200).json({
    success: true,
    messsages: transformMessages,
  });
});

// const getDashboardStats = TryCatch(async (req, res) => {
//   console.log("22");
  
//   const [groupsCount, usersCount, messagesCount, totalChatsCount] =
//     await Promise.all([
//       Chat.countDocuments({ groupChat: true }),
//       User.countDocuments(),
//       Message.countDocuments(),
//       Chat.countDocuments(),
//     ]);

//   const today = new Date();

//   const last7Days = new Date();

//   last7Days.setDate(last7Days.getDate() - 7);

//   const last7DaysMessages = await Message.find({
//     createdAt: {
//       $gt: last7Days,
//       $lte: today,
//     },
//   }).select("createdAt");

//   const messages = new Array(9).fill(0);
//   const dayInMiliSecound = 1000 * 60 * 60 * 24;
//   last7DaysMessages.forEach((message) => {
//     const indexApprox =
//       (today.getTime - message.createdAt.getTime()) / dayInMiliSecound;

//     const index = Math.floor(indexApprox);

//     messages[10 - index]++;
//   });

//   console.log("messages", messages, last7DaysMessages);
  

//   const stats = {
//     groupsCount,
//     usersCount,
//     messagesCount,
//     totalChatsCount,
//     messagesChart: messages,
//   };

//   console.log("22", stats, );
  

//   return res.status(200).json({
//     success: true,
//     stats,
//   });
// });


const getDashboardStats = TryCatch(async (req, res) => {
  // Fetch counts in parallel
  const [groupsCount, usersCount, messagesCount, totalChatsCount] = await Promise.all([
    Chat.countDocuments({ groupChat: true }),
    User.countDocuments(),
    Message.countDocuments(),
    Chat.countDocuments(),
  ]);

  // Define date range
  const today = new Date();
  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 6); // 7 days including today (0 to 6)

  // Query messages from the last 7 days
  const last7DaysMessages = await Message.find({
    createdAt: {
      $gte: last7Days, // Greater than or equal to 7 days ago
      $lte: today, // Less than or equal to today
    },
  }).select('createdAt');

  // Initialize array for 7 days (0 = 6 days ago, 6 = today)
  const messagesChart = new Array(7).fill(0);
  const dayInMilliseconds = 1000 * 60 * 60 * 24; // One day in milliseconds

  // Bucket messages into days
  last7DaysMessages.forEach((message) => {
    const timeDiff = today.getTime() - message.createdAt.getTime();
    const daysAgo = Math.floor(timeDiff / dayInMilliseconds);
    if (daysAgo >= 0 && daysAgo < 7) {
      // Increment the count for the corresponding day
      messagesChart[6 - daysAgo]++; // Reverse to have today at index 6
    }
  });

  // Prepare response
  const stats = {
    groupsCount,
    usersCount,
    messagesCount,
    totalChatsCount,
    messagesChart,
  };

  // Debug log
  console.log('Stats:', stats);
  console.log('Last 7 Days Messages:', last7DaysMessages.length);

  return res.status(200).json({
    success: true,
    stats,
  });
});

export { allUsers, allChats, allMessages, getDashboardStats, adminLogin, adminLogout, getAdminData };
