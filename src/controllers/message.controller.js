import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId } from "../lib/socket.js";
import { io } from "../lib/socket.js";
import mongoose from "mongoose";

export const getMessages = async (req, res) => {
  try {
    const { id: freindId } = req.params;
    const myId = req.user._id;
    if (myId.equals(freindId)) {
      return res.status(400).json({
        status: "error",
        message: "Sender and reciever id cannot be same",
      });
    }

    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: freindId },
        { senderId: freindId, receiverId: myId },
      ],
    });
    if (!messages || messages.length === 0) {
      return res.status(404).json({
        status: "blank",
        message: "No messages found",
      });
    }
    await Message.updateMany(
      {
        receiverId: myId,
        isRead: false,
      },
      { isRead: true }
    );
    return res.status(200).json({
      status: "success",
      message: "Messages fetched successfully",
      data: messages,
    });
  } catch (error) {
    console.log("Error in getMessages controller", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    if (req.user._id.equals(receiverId)) {
      return res.status(400).json({
        status: "error",
        message: "Sender and reciever id cannot be same",
      });
    }
    const receiver = await User.findById(receiverId).select(
      "-password -resetPasswordToken -resetPasswordExpires"
    );
    if (!receiver) {
      return res.status(400).json({
        status: "error",
        message: "Receiver id is invalid",
      });
    }
    const senderId = req.user._id;
    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image, {
        folder: "BaatCheet/ChatPhotos",
      });
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }
    return res.status(200).json({
      status: "success",
      message: "Message saved successfully",
      data: newMessage,
    });
  } catch (error) {
    console.log("Error in sendMessage", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const { senderId } = req.params;
    const user = req.user;

    if (!mongoose.isValidObjectId(senderId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid sender id",
      });
    }
    const unreadCount = await Message.countDocuments({
      senderId,
      receiverId: user._id,
      isRead: false,
    });
    return res.status(200).json({
      status: "success",
      message: "Unread count fetched successfully",
      data: unreadCount,
    });
  } catch (error) {
    console.log("Error in getting unreadMessageCOunt ->", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
