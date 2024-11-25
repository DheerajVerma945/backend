import { generateMailToken, generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import validator from "validator";
import cloudinary from "../lib/cloudinary.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body;

  try {
    if (!fullName || !email || !password) {
      return res
        .status(400)
        .json({ status: "error", message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        status: "error",
        message: "Enter a valid email",
      });
    }

    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a strong password",
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ status: "error", message: "Email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: hashPassword,
      fullName,
    });

    await newUser.save();
    generateToken(newUser._id, res);
    return res.status(201).json({
      status: "success",
      message: "Successfully created user account",
      data: newUser,
    });
  } catch (error) {
    console.log("Error in signup controller", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!validator.isEmail(email)) {
      return res
        .status(400)
        .json({ status: "error", message: "Enter a valid email" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid credentials" });
    }

    const isValidPass = await bcrypt.compare(password, user.password);
    if (!isValidPass) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid credentials" });
    }

    generateToken(user._id, res);
    return res.status(200).json({
      status: "success",
      message: "Logged in successfully",
      data: user,
    });
  } catch (error) {
    console.log("Error in login controller", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", {
      maxAge: 0,
    });
    return res
      .status(200)
      .json({ status: "success", message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error);
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { profilePic } = req.body;
    const userId = req.user._id;

    if (!profilePic) {
      return res
        .status(400)
        .json({ status: "error", message: "Profile pic is requried" });
    }
    const response = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: response.secure_url },
      { new: true }
    );
    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    console.log("Error in updating profile", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const userAuth = (req, res) => {
  try {
    return res.status(200).json({
      status: "success",
      message: "Profile fetched succesfully",
      data: req.user,
    });
  } catch (error) {
    console.log("Error in checking user profile", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { currPass, newPass } = req.body;
    if (!currPass || !newPass) {
      return res.status(400).json({
        status: "error",
        message: "Both existing and new password fields are required",
      });
    }
    const user = req.user;
    const passMatch = await bcrypt.compare(currPass, user.password);
    if (!passMatch) {
      return res.status(400).json({
        status: "error",
        message: "Wrong existing password",
      });
    }

    if (!validator.isStrongPassword(newPass)) {
      return res.status(400).json({
        status: "error",
        message: "Enter a strong new password",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newPassHash = await bcrypt.hash(newPass, salt);
    user.password = newPassHash;
    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Password updated successfully",
      data: user,
    });
  } catch (error) {
    console.log("Error in updating password", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const sendMail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        status: "error",
        message: "Enter a valid email address",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "No account exists with this email",
      });
    }

    const token = await generateMailToken();
    const resetLink = `${process.env.BASE_URL}/reset-password/verify?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
    const mailOptions = {
      from: process.env.EMAIL,
      to: email,
      subject: "Reset Your Password",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://res.cloudinary.com/dzitsseoz/image/upload/v1732540497/Screenshot_2024-11-25_184428_vbmvpm.png" alt="BaatCheet Logo" style="width: 150px;"/>
          </div>
          <h2 style="color: #444;">Hi ${user.fullName},</h2>
          <p>We received a request to reset your password. If this was you, click the button below to reset your password:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetLink}" style="text-decoration: none; background-color: #007BFF; color: white; padding: 10px 20px; border-radius: 5px; display: inline-block; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p>If you did not request this, you can safely ignore this email.</p>
          <p style="margin-top: 20px;">Thank you,<br>BaatCheet Team</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 12px; color: #888;">If you have any questions, feel free to <a href="mailto:dheerajverma82664442@gmail.com" style="color: #007BFF;">contact us</a>.</p>
        </div>
      `,
    };

    const mail = await transporter.sendMail(mailOptions);
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.log("Error sending mail ->", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

export const verifyMailTokenAndChangePass = async (req, res) => {
  const { token, email, newPass } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    if (
      !user.resetPasswordToken ||
      !user.resetPasswordExpires ||
      token !== user.resetPasswordToken
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid token",
      });
    }

    if (Date.now() >= user.resetPasswordExpires) {
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      return res.status(400).json({
        status: "error",
        message: "Link expired",
      });
    }
    if (!validator.isStrongPassword(newPass)) {
      return res.status(400).json({
        status: "error",
        message: "Enter a strong new password",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const newPassHash = await bcrypt.hash(newPass, salt);
    user.password = newPassHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while resetting the password",
    });
  }
};
