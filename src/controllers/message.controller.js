import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";

export const getUserForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({
      _id: { $ne: loggedInUserId },
    }).select("-password resetPasswordToken resetPasswordExpires");
    return res.status(200).json({
      status: "success",
      message: "Users fetched successfully",
      data: filteredUsers,
    });
  } catch (error) {
    console.log("Error in getUserForSideBar", error);
    return res.status(500).json({
      status: "error",
      message: "Internal Server error",
    });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { id: freindId } = req.params;
    const myId = req.user._id;

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
    const senderId = req.user._id;
    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }
    const newMessage = new Message({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    await newMessage.save();
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
