import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import validator from "validator";

// create user
const createUser = async (req, res) => {
  try {
    const { email, name, avatarUrl, password } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (password.length < 8) {
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name.trim(),
        avatarUrl,
        password: hashedPassword,
      },
      select: { id: true, email: true, name: true }, 
    });

    res.status(201).json({ message: "User created successfully", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = jwt.sign(
      { email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { email },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await prisma.user.update({
      where: { email },
      data: { refreshToken },
    });

    const cookieOptions = {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      secure: false,
      sameSite: "lax",
    };

     res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// logout user
const logoutUser = async (req, res) => {
  try {
    if (!req.user || !req.user.email) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await prisma.user.update({
      where: { email: req.user.email },
      data: { refreshToken: null },
    });

    res
      .status(200)
      .clearCookie("accessToken")
      .clearCookie("refreshToken")
      .json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// refresh access token
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    const user = await prisma.user.findUnique({ where: { email: decoded.email } });

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    return res
      .status(200)
      .cookie("accessToken", newAccessToken, cookieOptions)
      .json({ accessToken: newAccessToken });
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

// get user
const getUser = async (req, res) => {

  const user =  await prisma.user.findUnique({where : { email : req.user.email } , select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true }})

  if(!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.status(200).json({ user: user });
}

// forgot password
const forgotPassword = async (req, res) => {

  try {
    const oldPassword = req.body.oldPassword;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;

    if(password.trim() !== confirmPassword.trim()) {
      return res.status(401).json({ message: "New password and confirm password did not match" });
    }

    if(password.length < 8) {
      return res.status(401).json({ message: "Password must be at least 8 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { password : true} });
  
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Old password did not match" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashedPassword } });

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}


export { createUser, loginUser, logoutUser, refreshAccessToken, getUser, forgotPassword };
