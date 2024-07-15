import asyncHandler from "../middlewares/asyncHandler.js";
import Message from "../models/messageModel.js";
//send messages

const sendMessage = asyncHandler(async (req, res) => {
  try {
    const senderId = req.user._id;
    const { senderName, resiverId, message } = req.body;
    const insertMessage = await Message.create({
      senderId: senderId,
      senderName: senderName,
      resiverId: resiverId,
      message: {
        text: message,
      },
    });

    res.status(201).json({ message: insertMessage });
  } catch (error) {
    throw new Error(error);
  }
});

//fetch message

const fetchMessage = asyncHandler(async (req, res) => {
  const myId = req.user._id.toString();
    const frId = req.params.id;
    console.log("my id", myId)
    console.log("friend id", frId)
    try {
    let getAllMessages = await Message.find({});
    getAllMessages = getAllMessages.filter(
      (mes) =>
        (mes.senderId === myId && mes.resiverId === frId) ||
        (mes.senderId === frId && mes.resiverId === myId)
    );
      console.log(getAllMessages)
      res.status(200).json(getAllMessages)
  } catch (error) {
    console.log(error);
  }
});

export { sendMessage, fetchMessage };
