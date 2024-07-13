import jwt from "jsonwebtoken";

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: 3600 * 24 * 60 * 60,
  });

  //set jwt as http-only cookie

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "production",
    sameSite: "strict",
    maxAge: 3600 * 24 * 60 * 60,
  });
};

export default generateToken;
