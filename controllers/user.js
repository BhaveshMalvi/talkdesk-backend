import { compare } from "bcrypt";
import User from "../models/user.js";
import { Chat } from "../models/chat.js";
import { Request } from "../models/request.js";
import { cookieOptions, emitEvent, sendToken, uploadFilesToCloudnary } from "../utils/features.js";
import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";



const newUser = TryCatch(async (req, res, next) => {
  const { name, username, password, bio } = req.body;
  console.table([name, username, password, bio]);
  

  const file = req.file


  if (!file) return next(new ErrorHandler("Please Upload Avatar"))

    const result = await uploadFilesToCloudnary([file]);

    const avatar = {
      public_id: result[0].public_id,
      url: result[0].url,
    }

  const user = await User.create({
    name,
    bio,
    username,
    password,
    avatar,
  });

  sendToken(res, user, 201, "User created");
})

const login = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");

  if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

  const isMatch = await compare(password, user.password);

  if (!isMatch)
    return next(new ErrorHandler("Invalid Username or Password", 404));

  sendToken(res, user, 200, `Welcome Back ${user.name}`);
});

const getMyProfile = TryCatch(async (req, res, next) => {
  const user = await User.findById(req.user);

  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    user,
  });
});

const logout = TryCatch(async (req, res) => {
  return res
    .status(200)
    .cookie("pakau-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

const searchUser = TryCatch(async (req, res) => {
  const { name = "" } = req.query;
  // console.log("name", name);
  
  // finding all my chats
  const myChats = await Chat.find({ groupChat: false, members: req.user });
  
  // extracting All users from my chats means friends or people I have chatted with
  const allUsersFromMyChats = myChats.flatMap((chat) => chat?.members);
// console.log("allUsersFromMyChats=============", allUsersFromMyChats);

  // finding all users except me and my friends
  const allUsersExceptMeAndFriends = await User.find({
    _id: { $nin: allUsersFromMyChats },
    name: { $regex: name, $options: "i" }
  });

  // console.log("allUsersExceptMeAndFriends================", allUsersExceptMeAndFriends);
  

  // modifing the response
  const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
    _id,
    name,
    avatar: avatar.url,
  }));

  // console.log("first", myChats, users, req.user);
  return res.status(200).json({
    success: true,
    users,
  });
});



// const searchUser = TryCatch(async (req, res) => {
//   const { name = "" } = req.query;
//   const myUserId = req.user.toString(); // current user's ID
//   // Step 1: Find one-to-one chats where the current user is a member
//   const myChats = await Chat.find({ groupChat: false, members: myUserId });
//   // Step 2: Extract all members (chat partners), excluding self
//   const friendIdSet = new Set();

//   myChats.forEach(chat => {
//     chat.members.forEach(memberId => {
//       const idStr = memberId.toString();
//       if (idStr !== myUserId) {
//         friendIdSet.add(idStr);
//       }
//     });
//   });

//   // Step 3: Add current user to exclusion list
//   friendIdSet.add(myUserId);

//   const excludeArray = Array.from(friendIdSet).map(id => id);

//   // Step 4: Query users by name (case-insensitive), excluding self and chat friends
//   const matchingUsers = await User.find({
//     _id: { $nin: excludeArray },
//     name: { $regex: name, $options: "i" },
//   });

//   // Step 5: Format response
//   const users = matchingUsers.map(({ _id, name, avatar }) => ({
//     _id,
//     name,
//     avatar: avatar?.url || null,
//   }));

//   return res.status(200).json({
//     success: true,
//     users,
//   });
// });





const sendFriendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;


  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });

  if (request) return next(new ErrorHandler("Request already sent", 400));

  await Request.create({
    sender: req.user,
    receiver: userId,
  });

  emitEvent(req, NEW_REQUEST, [userId]);

  return res.status(200).json({
    success: true,
    message: "Friend Request Sent",
  });
});

const acceptFrinedRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request not found", 404));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("you are not authorized to accept this request", 401)
    );

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend  Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      name: `${request.sender.name} - ${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id,
  });
});

const getMyNotifications = TryCatch(async (req, res) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allRequest = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  return res.status(200).json({
    success: true,
    allRequest,
  });
});

const getMyFriends = TryCatch(async (req, res) => {
  console.log('first', req.query)
  
  const {chatId} = req.query;
  


  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  console.log('chats', chats)
  const friends =  chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);

    if (!otherUser) {
      return null; // Skip this chat if there's no valid other user
    }
    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  }).filter(friend => friend !== null);

  console.log('friends', friends)

  
  if (chatId) {
    const chat = await Chat.findById(chatId);
    const availableFrineds = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );
    return res.status(200).json({
      success: true,
      friends: availableFrineds,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }

});

export {
  login,
  newUser,
  getMyProfile,
  logout,
  searchUser,
  sendFriendRequest,
  acceptFrinedRequest,
  getMyNotifications,
  getMyFriends,
};
