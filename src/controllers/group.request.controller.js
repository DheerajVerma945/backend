import mongoose from "mongoose";
import Group from "../models/group.asign.model.js";
import User from "../models/user.model.js";
import GroupRequest from "../models/group.request.model.js";

export const sendInvite = async (req, res) => {
  try {
    const { userId: receiverId, groupId } = req.body;
    const senderId = req.user._id;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }
    const group = await Group.findById(groupId);
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(400).json({
        status: "error",
        message: "User not found to send invite",
      });
    }
    if (!group) {
      return res.status(400).json({
        status: "error",
        message: "Group not found to invite user",
      });
    }
    if (group.admin.toString() !== senderId.toString()) {
      return res.status(400).json({
        status: "error",
        message: "Only admin can send invite to users",
      });
    }
    if (group.members.includes(receiverId)) {
      return res.status(400).json({
        status: "error",
        message: "Cannot send invite to members of group",
      });
    }
    const newGroupReq = new GroupRequest({ senderId, receiverId, groupId });

    await newGroupReq.save();
    return res.status(201).json({
      status: "success",
      message: "Group invite sent successfully",
      data: newGroupReq,
    });
  } catch (error) {
    console.log("Error in inviting user to group ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const reviewInvite = async (req, res) => {
  try {
    const user = req.user;
    const { groupId, reqId } = req.body;
    const { status } = req.params;
    if (status !== "accepted" && status !== "rejected") {
      return res.status(400).json({
        status: "error",
        message: "Invalid status",
      });
    }
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }
    if (!mongoose.isValidObjectId(reqId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid request id",
      });
    }
    const group = await Group.findById(groupId);
    if (group.members.includes(user._id)) {
      return res.status(400).json({
        status: "error",
        message: "Already a member of group",
      });
    }

    const request = await GroupRequest.findById(reqId);
    if(!request){
        return res.status(400).json({
            status:"error",
            message:"No request recieved for this groupId"
        })
    }
    if (request.receiverId.toString() !== user._id) {
      return res.status(400).json({
        status: "error",
        message: "Only reciever can review the requests",
      });
    }
    if (status === "rejected") {
      request.status = "rejected";
      await request.save();
      return res.status(200).json({
        status: "success",
        message: "Rejected request successfully",
        data: request,
      });
    }
    if (status === "accepted") {
      group.members = [...group.members, user._id];
      user.groups = user.groups ? [...user.groups, groupId] : [groupId];
      request.status = "accepted";
      await user.save();
      await group.save();
      await request.save();
      return res.status(200).json({
        status: "success",
        message: "Request accepted successfully",
        data: user,
      });
    }
  } catch (error) {
    console.log("Error while reviewing the request ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
