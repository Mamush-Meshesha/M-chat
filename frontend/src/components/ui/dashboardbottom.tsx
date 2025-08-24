/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useState, useEffect, useRef } from "react";
import { BsThreeDots } from "react-icons/bs";
import { IoSend } from "react-icons/io5";
import { MdOutlineEmojiEmotions, MdOutlineKeyboardVoice } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store/index";
import { addMessage, setNewMessage } from "../../slice/userSlice";
import { Socket } from "socket.io-client";

interface DashboardbottomProps {
  scrollRef: React.RefObject<HTMLDivElement>;
  socket: Socket | null;
}

const Dashboardbottom: FC<DashboardbottomProps> = ({ socket }) => {
  const dispatch = useDispatch();
  const newMessage = useSelector((state: RootState) => state.user.newMessage);
  const currentUserChat = useSelector(
    (state: RootState) => state.user.currentUser
  );
  const authUser = useSelector((state: RootState) => state.auth.user);
  const name = authUser?.name || "User";
  const _id = authUser?._id || "";

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setNewMessage(e.target.value));

    // Handle typing indicators
    if (socket && currentUserChat) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit("typing", {
          senderId: _id,
          senderName: name,
          receiverId: currentUserChat._id,
        });
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (socket && currentUserChat) {
          socket.emit("stopTyping", {
            senderId: _id,
            senderName: name,
            receiverId: currentUserChat._id,
          });
        }
      }, 1000) as unknown as number;
    }
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserChat) return;

    console.log("Sending message:", {
      message: newMessage,
      senderId: _id,
      senderName: name,
      receiverId: currentUserChat._id,
    });

    // Create message object for immediate display
    const messageData = {
      _id: `temp_${Date.now()}`,
      senderId: _id,
      senderName: name,
      resiverId: currentUserChat._id,
      message: {
        text: newMessage,
      },
      createdAt: new Date().toISOString(),
    };

    // Immediately add message to Redux store for instant display
    dispatch(addMessage(messageData));

    // Send message through socket for real-time
    if (socket && currentUserChat) {
      const socketData = {
        senderId: _id,
        senderName: name,
        receiverId: currentUserChat._id,
        message: newMessage,
      };

      console.log("Emitting socket message:", socketData);
      socket.emit("sendMessage", socketData);
    }

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    if (socket && currentUserChat) {
      socket.emit("stopTyping", {
        senderId: _id,
        senderName: name,
        receiverId: currentUserChat._id,
      });
    }
  };

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
      <form onSubmit={sendMessage} className="flex items-center gap-2 sm:gap-3">
        {/* Emoji Button */}
        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          title="Emoji"
        >
          <MdOutlineEmojiEmotions className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Voice Message Button */}
        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          title="Voice Message"
        >
          <MdOutlineKeyboardVoice className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Message Input */}
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={newMessage}
            onChange={handleInput}
            placeholder="Type a message..."
            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base"
            disabled={!currentUserChat}
          />
        </div>

        {/* More Options */}
        <button
          type="button"
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          title="More Options"
        >
          <BsThreeDots className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!newMessage.trim() || !currentUserChat}
          className="p-2 sm:p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm"
          title="Send Message"
        >
          <IoSend className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </form>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="mt-2 text-xs text-gray-500 text-center">Typing...</div>
      )}
    </div>
  );
};

export default Dashboardbottom;
