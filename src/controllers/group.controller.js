import cloudinary from "../lib/cloudinary.js";
import Group from "../models/group.asign.model.js";
import GroupChat from "../models/group.message.model.js";
import User from "../models/user.model.js";
import mongoose from "mongoose";

export const createGroup = async (req, res) => {
  try {
    const { name } = req.body;
    const admin = req.user;
    const members = req.user._id;
    const user = await User.findById(admin._id);
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User should be registered to create a group",
      });
    }

    const newGroup = new Group({
      name,
      members,
      admin: members,
    });

    admin.groups = admin.groups
      ? [...admin.groups, newGroup._id]
      : [newGroup._id];
    await admin.save();
    await newGroup.save();
    const data = await newGroup.populate("members", "fullName profilePic");

    return res.status(201).json({
      status: "success",
      message: "Group created successfully",
      data,
    });
  } catch (error) {
    console.log("Error in creating group ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const addMember = async (req, res) => {
  try {
    const { userId: memberToAdd, groupId } = req.body;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }
    if (memberToAdd.toString() === req.user._id.toString()) {
      return res.status(400).json({
        status: "error",
        message:
          "Cannot add yourself to the group,instead you can create new  group",
      });
    }
    const user = await User.findById(memberToAdd);
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "Invalid User id - User not found",
      });
    }
    if (user.privacy === true) {
      return res.status(400).json({
        status: "error",
        message: "Cannot add private users to the group",
      });
    }
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id - Group not found",
      });
    }
    if (group.admin.toString() !== req.user._id.toString() && group.visibility === "private") {
      return res.status(400).json({
        status: "error",
        message: "only Admins can add the members to private group",
      });
    }
    if (group.members.includes(memberToAdd)) {
      return res.status(400).json({
        status: "error",
        message: "Already a group member",
      });
    }
    group.members = [...group.members, memberToAdd];
    user.groups = user.groups ? [...user.groups, groupId] : [groupId];
    await user.save();
    await group.save();
    const data = await newGroup.populate("members", "fullName profilePic");

    return res.status(200).json({
      status: "success",
      message: "User added successfully",
      data,
    });
  } catch (error) {
    console.log("Error in adding member ->", error?.message);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const getGroups = async (req, res) => {
  try {
    const groupIds = req.user.groups;

    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No groups found",
      });
    }

    const groups = await Group.find({
      _id: { $in: groupIds },
    }).populate("members", "fullName profilePic");

    return res.status(200).json({
      status: "success",
      message: "Groups fetched successfully",
      data: groups,
    });
  } catch (error) {
    console.log("Error in finding groups ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { userId: memberToRemove, groupId } = req.body;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }
    if (memberToRemove.toString() === req.user._id.toString()) {
      return res.status(400).json({
        status: "error",
        message:
          "Cannot remove yourself from the group,instead you can delete the group",
      });
    }
    const user = await User.findById(memberToRemove);
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(400).json({
        status: "error",
        message: "Group does not exist or wrong groupId",
      });
    }
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found to remove from group",
      });
    }
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        status: "error",
        message: "only Admins can remove the members",
      });
    }
    if (user.groups.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "User is not joined in  group",
      });
    }
    if (!group.members.includes(memberToRemove)) {
      return res.status(400).json({
        status: "error",
        message: "User is not in the group, can't remove",
      });
    }

    user.groups = user.groups.filter(
      (group) => group._id.toString() !== groupId.toString()
    );
    group.members = group.members.filter(
      (id) => id.toString() !== memberToRemove.toString()
    );

    await user.save();
    await group.save();
    const data = await newGroup.populate("members", "fullName profilePic");
    return res.status(200).json({
      status: "success",
      message: "Member successfully removed from group",
      data,
    });
  } catch (error) {
    console.log("Error while removing the member ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const exitGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }

    const group = await Group.findById(groupId).populate(
      "members",
      "_id groups"
    );
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found to exit",
      });
    }

    const user = req.user;

    if (
      !user.groups.includes(groupId) &&
      !group.members.some(
        (member) => member._id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(400).json({
        status: "error",
        message: "Must be added in group to leave it",
      });
    }

    if (group.admin.toString() === req.user._id.toString()) {
      return res.status(400).json({
        status: "error",
        message: "Admin cannot leave the group, they can delete instead.",
      });
    }

    group.members = group.members.filter(
      (member) => member._id.toString() !== req.user._id.toString()
    );
    user.groups = user.groups.filter(
      (group) => group._id.toString() !== groupId
    );

    await group.save();
    await user.save();
    const data = await user
      .populate("groups", "name photo")
      .populate("groups.members", "fullName profilePic");

    return res.status(200).json({
      status: "success",
      message: "Group exited successfully",
      data,
    });
  } catch (error) {
    console.log("Error while exiting the group ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const joinGroup = async (req, res) => {
  try {
    const { groupId } = req.body;
    const user = req.user;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }
    if (user.groups.includes(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Already joined the group",
      });
    }
    const group = await Group.findById(groupId);
    if (group.members.includes(user._id)) {
      return res.status(400).json({
        status: "error",
        message: "Already joined the group",
      });
    }
    if (!group) {
      return res.status(400).json({
        status: "error",
        message: "Group not found",
      });
    }
    if (group.visibility === "private") {
      return res.status(400).json({
        status: "error",
        message: "Group is private, Cannot join without invite",
      });
    }
    group.members = [...group.members, user._id];
    user.groups = user.groups ? [...user.groups, groupId] : [groupId];

    await user.save();
    await group.save();
    const data = await user
      .populate("groups", "name photo")
      .populate("groups.members", "fullName profilePic");

    return res.status(200).json({
      status: "success",
      message: "Group joined successfully",
      data,
    });
  } catch (error) {
    console.log("Error in joining group ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.body;

    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }

    const group = await Group.findById(groupId).populate(
      "members",
      "_id groups"
    );

    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found to delete",
      });
    }

    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        status: "error",
        message: "Only the admin can delete the group",
      });
    }

    for (const member of group.members) {
      member.groups = member.groups.filter(
        (group) => group.toString() !== groupId
      );
      await member.save();
    }

    await GroupChat.deleteMany({ groupId });

    await Group.findByIdAndDelete(groupId);

    return res.status(200).json({
      status: "success",
      message: "Group deleted successfully",
    });
  } catch (error) {
    console.log("Error while deleting the group ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { newName, newPhoto, groupId, description, visibility } = req.body;
    if (!mongoose.isValidObjectId(groupId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid group id",
      });
    }
    const group = await Group.findById(groupId).populate("members","fullName profilePic");
    if (!group) {
      return res.status(404).json({
        status: "error",
        message: "Group not found",
      });
    }
    if (group.admin.toString() !== req.user._id.toString()) {
      return res.status(400).json({
        status: "error",
        message: "Only admin can edit the group info",
      });
    }
    if (visibility) {
      if (visibility === "private" || visibility === "public") {
        group.visibility = visibility;
      }
    }
    if (newName) {
      group.name = newName;
    }
    if (description) {
      group.description = description;
    }
    let imageUrl;
    if (newPhoto) {
      const uploadResponse = await cloudinary.uploader.upload(newPhoto, {
        folder: "BaatCheet/Group/Dp",
      });
      imageUrl = uploadResponse.secure_url;
      group.photo = imageUrl;
    }
    if (!newName && !description && !newPhoto && !visibility) {
      return res.status(400).json({
        status: "error",
        message: "At least on feild is required",
      });
    }
    await group.save();
    return res.status(200).json({
      status: "success",
      message: "Group info updated successfully",
      data: group,
    });
  } catch (error) {
    console.log("Error in updating group ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const getNewGroups = async (req, res) => {
  try {
    const groups = await Group.find({ _id: { $nin: req.user.groups } });
    if (!groups) {
      return res.status(404).json({
        status: "error",
        message: "No groups at the moment",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Groups fetched successfully",
      data: groups,
    });
  } catch (error) {
    console.log("Error in explorin new groups ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};
