import asyncHandler from "../middlewares/asyncHandler.js";
import Call from "../models/callModel.js";
import User from "../models/userModel.js";

// @desc    Get call history for a user
// @route   GET /api/calls/history
// @access  Private
const getCallHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const calls = await Call.find({
    $or: [{ caller: userId }, { receiver: userId }],
  })
    .populate("caller", "name email")
    .populate("receiver", "name email")
    .sort({ startTime: -1 })
    .limit(50);

  // Transform the data to match frontend expectations
  const transformedCalls = calls.map((call) => {
    const isCaller = call.caller._id.toString() === userId.toString();
    const otherUser = isCaller ? call.receiver : call.caller;

    return {
      id: call._id.toString(),
      name: otherUser.name,
      type: isCaller ? "outgoing" : "incoming",
      callType: call.callType,
      duration:
        call.duration > 0
          ? `${Math.floor(call.duration / 60)}:${(call.duration % 60)
              .toString()
              .padStart(2, "0")}`
          : "0:00",
      date: call.startTime.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      time: call.startTime.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
      userId: otherUser._id.toString(),
      status: call.status,
    };
  });

  res.json({
    success: true,
    calls: transformedCalls,
  });
});

// @desc    Create a new call record
// @route   POST /api/calls
// @access  Private
const createCall = asyncHandler(async (req, res) => {
  const { receiverId, type, callType } = req.body;
  const callerId = req.user._id;

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    res.status(404);
    throw new Error("Receiver not found");
  }

  const call = await Call.create({
    caller: callerId,
    receiver: receiverId,
    type,
    callType,
    startTime: new Date(),
  });

  const populatedCall = await Call.findById(call._id)
    .populate("caller", "name email")
    .populate("receiver", "name email");

  res.status(201).json({
    success: true,
    call: populatedCall,
  });
});

// @desc    Update call status (end call, mark as missed, etc.)
// @route   PUT /api/calls/:id
// @access  Private
const updateCall = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, duration } = req.body;
  const userId = req.user._id;

  const call = await Call.findById(id);
  if (!call) {
    res.status(404);
    throw new Error("Call not found");
  }

  // Check if user is part of this call
  if (
    call.caller.toString() !== userId.toString() &&
    call.receiver.toString() !== userId.toString()
  ) {
    res.status(403);
    throw new Error("Not authorized to update this call");
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (duration !== undefined) updateData.duration = duration;
  if (status === "completed" || status === "missed" || status === "rejected") {
    updateData.endTime = new Date();
  }

  const updatedCall = await Call.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("caller", "name email")
    .populate("receiver", "name email");

  res.json({
    success: true,
    call: updatedCall,
  });
});

export { getCallHistory, createCall, updateCall };
