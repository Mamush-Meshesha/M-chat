import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import userRoute from "./routes/userRoutes.js";
import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

dotenv.config();
const app = express();
const port = 5300;

connectDB();
// body parser
app.use(
  cors({
    origin: "http://localhost:5174",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", userRoute);

app.use(notFound);
app.use(errorHandler);
app.listen(port, () => {
  console.log(`server is running on ${port}`);
});
