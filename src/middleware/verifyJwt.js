import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const verifyAccessToken = async (req, res, next) => {
  const token = req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
      select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true }
    })

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: "unauthorized" });
  }
};
