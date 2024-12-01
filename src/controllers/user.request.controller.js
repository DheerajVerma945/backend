import User from "../models/user.model.js";
import UserRequest from "../models/user.request.model.js";

export const sendRequest = async (req, res) => {
  try {
    const currUser = req.user;
    const { userId } = req.body;
    if (userId.toString() === currUser._id.toString()) {
      return res.status(400).json({
        status: "error",
        message: "Cannot send request to yourself",
      });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found to send connection request",
      });
    }
    const existingRequest = await UserRequest.findOne({
      $or: [
        { senderId: currUser._id, receiverId: userId },
        { senderId: userId, receiverId: currUser._id },
      ],
    });
    if (existingRequest) {
      return res.status(400).json({
        status: "error",
        message: "Request already exists",
      });
    }
    const newRequest = new UserRequest({
      senderId: currUser._id,
      receiverId: userId,
    });
    await newRequest.save();
    return res.status(201).json({
      status: "success",
      message: "Connection request sent successfully",
      data: newRequest,
    });
  } catch (error) {
    console.log(
      "Error while sending user connection request->",
      error?.message
    );
    return res.status(450).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const getRequests = async (req, res) => {
  try {
    const userId = req.user._id;

    const requests = await UserRequest.find({
      receiverId: userId,
      status: "pending",
    }).populate("senderId", "fullName profilePic");

    if (!requests || requests.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No requests at the moment",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Requests fethced successfully",
      data: requests,
    });
  } catch (error) {
    console.log("Error while fetching user requests ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const reviewRequest = async (req, res) => {
  try {
    const { status } = req.params;
    const { reqId } = req.body;
    const validStatuses = ["accepted", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status value",
      });
    }
    const request = await UserRequest.findById(reqId).populate(
      "senderId",
      "fullName profilePic"
    );

    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Request not found with this id",
      });
    }
    request.status = status;
    await request.save();
    return res.status(200).json({
      status: "success",
      message: `Request ${status} successsfully`,
      data: request,
    });
  } catch (error) {
    console.log("Error in reviewing user request ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal serrver error",
    });
  }
};

export const removeConnection = async (req, res) => {
  try {
    const { userId } = req.body;
    const currUserId = req.user._id;

    const request = await UserRequest.findOneAndDelete({
      $or: [
        { senderId: userId, receiverId: currUserId },
        { senderId: currUserId, receiverId: userId },
      ],
      status: "accepted",
    });
    if (!request) {
      return res.status(400).json({
        status: "error",
        message: "User connection not found to remove",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "Connection removed successfully",
    });
  } catch (error) {
    console.log("Error in removing user connection->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal serrver error",
    });
  }
};

export const getConnections = async (req, res) => {
  try {
    const userId = req.user._id;
    const connections = await UserRequest.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      status: "accepted",
    })
      .populate("senderId", "fullName profilePic")
      .populate("receiverId", "fullName profilePic");

    if (!connections || connections.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No connections at the moment",
      });
    }

    const data = connections.map((req) =>
      req.senderId._id === userId ? req.receiverId : req.senderId
    );

    return res.status(200).json({
      status: "success",
      message: "Connections fetched successfully",
      data,
    });
  } catch (error) {
    console.log("Error in getting the user connections ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "Internal serrver error",
    });
  }
};

export const exploreUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    const existingEngagement = await UserRequest.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    const hiddenUsers =
      existingEngagement?.reduce((acc, req) => {
        acc.push(
          req.senderId.toString() === userId ? req.receiverId : req.senderId
        );
        return acc;
      }, []) || [];

    const newUsers = await User.find({
      _id: { $nin: [...hiddenUsers, userId] },
    }).select("fullName profilePic");

    if (!newUsers.length) {
      return res.status(404).json({
        status: "error",
        message: "No users available to explore at the moment",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "New users fetched",
      data: newUsers,
    });
  } catch (error) {
    console.error("Error in exploring user ->", error.message);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const searchUser = async (req, res) => {
  try {
    const { username } = req.params;
    if (username === req.user.username) {
      return res.status(400).json({
        status: "error",
        message: "You cannot search yourself.",
      });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({
        status: "error",
        message: "User not found, please provide correct username",
      });
    }
    return res.status(200).json({
      status: "success",
      message: "User fetched successfully",
      data: user,
    });
  } catch (error) {
    console.log("Error in searching user with username ->", error?.message);
    return res.status(500).json({
      status: "error",
      message: "internal server error",
    });
  }
};
