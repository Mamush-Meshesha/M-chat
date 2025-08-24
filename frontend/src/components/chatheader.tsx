/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useEffect } from "react";
import { FaPlus } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchMessageRequest,
  fetchUserRequest,
  setCurrentUser,
} from "../slice/userSlice";
import { RootState } from "../store";

interface ChatHeaderProps {
  activeUser: any[];
  unreadCounts: { [userId: string]: number };
}

const ChatHeader: FC<ChatHeaderProps> = ({ activeUser, unreadCounts }) => {
  const dispatch = useDispatch();
  const friends = useSelector((state: RootState) => state.user.user);
  const currentUser = useSelector((state: RootState) => state.user.currentUser);

  // Debug logging
  console.log("ChatHeader - Props received:", { activeUser, unreadCounts });
  console.log("ChatHeader - Redux state:", { friends, currentUser });

  const handleToSendMessage = (user: any) => {
    console.log("🔍 ChatHeader: User clicked:", user);
    console.log("🔍 ChatHeader: Dispatching setCurrentUser with:", user);
    dispatch(setCurrentUser(user));
    console.log("🔍 ChatHeader: setCurrentUser dispatched");
  };

  useEffect(() => {
    console.log("ChatHeader - Fetching users...");
    dispatch(fetchUserRequest());
  }, [dispatch]);

  useEffect(() => {
    if (currentUser?._id) {
      console.log("ChatHeader - Fetching messages for:", currentUser._id);
      dispatch(fetchMessageRequest(currentUser._id));
    }
  }, [currentUser?._id, dispatch]);

  return (
    <div className="p-3 sm:p-4 md:p-5 h-full overflow-y-auto">
      <div>
        <div className="flex justify-between items-center py-3 sm:py-4">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-800">
            Chats
          </h1>
          <button className="bg-[#4EAC6D] hover:bg-[#3d8a5a] p-2 sm:p-3 rounded-lg transition-colors duration-200">
            <FaPlus className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>

        <div className="mb-3 sm:mb-4">
          <input
            type="search"
            placeholder="Search chats..."
            className="w-full h-9 sm:h-11 bg-[#F6F6F9] outline-none rounded-lg px-3 sm:px-4 border border-gray-200 focus:border-[#4EAC6D] transition-colors duration-200 text-sm sm:text-base"
          />
        </div>

        <div className="space-y-3 sm:space-y-4">
          {/* Friends/Chats Section */}
          <div>
            <h2 className="text-xs sm:text-sm font-medium text-gray-600 mb-2 sm:mb-3 uppercase tracking-wide">
              Recent Chats
            </h2>
            <div className="space-y-1 sm:space-y-2">
              {friends && Array.isArray(friends) && friends.length > 0 ? (
                friends.map((user: any, index: number) => {
                  const unreadCount = unreadCounts[user._id] || 0;
                  const isActive =
                    activeUser &&
                    activeUser.some(
                      (active: any) => active.userId === user._id
                    );

                  console.log("Rendering user:", {
                    user,
                    unreadCount,
                    isActive,
                  });

                  return (
                    <div
                      key={index}
                      onClick={() => handleToSendMessage(user)}
                      className={`cursor-pointer transition-all duration-200 ${
                        currentUser?._id === user._id
                          ? "bg-[#4EAC6D] bg-opacity-10 border-l-4 border-[#4EAC6D]"
                          : "hover:bg-gray-100 border-l-4 border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3 relative">
                        <div className="relative">
                          <img
                            src="/profile.jpg"
                            alt={user.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-gray-200"
                          />
                          {/* Online status indicator */}
                          {isActive && (
                            <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3
                              className={`font-medium truncate text-sm sm:text-base ${
                                currentUser?._id === user._id
                                  ? "text-[#4EAC6D]"
                                  : "text-gray-800"
                              }`}
                            >
                              {user.name}
                            </h3>

                            {/* Unread message count */}
                            {unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold min-w-[16px] sm:min-w-[20px]">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            )}
                          </div>

                          <p className="text-xs sm:text-sm text-gray-500 truncate">
                            {isActive ? "Online" : "Offline"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 sm:py-8 text-gray-500">
                  <p className="text-sm sm:text-base">No friends here</p>
                  <p className="text-xs sm:text-sm">
                    Start adding friends to begin chatting!
                  </p>
                  <div className="mt-2 text-xs text-gray-400">
                    <p>Debug: friends array length: {friends?.length || 0}</p>
                    <p>
                      Debug: friends data: {JSON.stringify(friends, null, 2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Users Section */}
          <div>
            <h2 className="text-xs sm:text-sm font-medium text-gray-600 mb-2 sm:mb-3 uppercase tracking-wide">
              Active Users
            </h2>
            <div className="space-y-1 sm:space-y-2">
              {activeUser &&
              Array.isArray(activeUser) &&
              activeUser.length > 0 ? (
                activeUser.map((user: any, index: number) => (
                  <div
                    key={index}
                    onClick={() => handleToSendMessage(user.authUser)}
                    className={`cursor-pointer transition-all duration-200 hover:bg-gray-100 border-l-4 border-transparent ${
                      currentUser?._id === user.authUser?._id
                        ? "bg-[#4EAC6D] bg-opacity-10 border-l-4 border-[#4EAC6D]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3">
                      <div className="relative">
                        <img
                          src="/profile.jpg"
                          alt={user.authUser?.name || "User"}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover border-2 border-green-500"
                        />
                        <span className="absolute -bottom-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className={`font-medium truncate text-sm sm:text-base ${
                            currentUser?._id === user.authUser?._id
                              ? "text-[#4EAC6D]"
                              : "text-gray-800"
                          }`}
                        >
                          {user.authUser?.name || "Unknown User"}
                        </h3>
                        <p className="text-xs sm:text-sm text-green-600">
                          ● Online
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-3 sm:py-4 text-gray-500">
                  <p className="text-xs sm:text-sm">No friends online</p>
                  <div className="mt-1 text-xs text-gray-400">
                    <p>
                      Debug: activeUser array length: {activeUser?.length || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
