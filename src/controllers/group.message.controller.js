import mongoose from "mongoose";
import Group from "../models/group.asign.model.js";
import GroupChat from "../models/group.message.model.js";

export const sendMessage = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { text, image } = req.body;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(400).json({
        status: "error",
        message: "Group does not exists",
      });
    }
    if (!group.members.includes(req.user._id)) {
      return res.status(400).json({
        status: "error",
        message: "Cannot send messages in group without joining it",
      });
    }
    const senderId = req.user._id;
    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "BaatCheet/Group/Chat",
      });
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = new GroupChat({
      senderId,
      groupId,
      text,
      image: imageUrl,
    });

    await newMessage.save();
    const data = newMessage.populate("senderId","fullName profilePic")

    // const receiverSocketId = getReceiverSocketId(receiverId);
    // if (receiverSocketId) {
    //   io.to(receiverSocketId).emit("newMessage", newMessage);
    // }
    return res.status(200).json({
      status: "success",
      message: "Message saved successfully",
      data,
    });
  } catch (error) {
    console.log("Error in sendMessage", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(400).json({
        status: "error",
        message: "Group does not exist",
      });
    }
    if (!group.members.includes(req.user._id)) {
      return res.status(400).json({
        status: "error",
        message: "Cannot get the messages of group that are not joined",
      });
    }
    const messages = await GroupChat.find({ groupId }).populate(
      "senderId",
      "fullName profilePic"
    );

    if (!messages) {
      return res.status(404).json({
        status: "error",
        message: "No Messages in group yet",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Group messages fethced successfully",
      data: messages,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
