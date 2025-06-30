import { userSocketIds } from "../index.js";

export const getOtherMember = (members, userId) =>
  members.find((member) => member._id.toString() !== userId.toString());



export const getSockets = (users = []) => {
  const socket = users.map((user) => userSocketIds.get(user.toString()));
  return socket
}

export const getBase64 = (file) => {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
};

