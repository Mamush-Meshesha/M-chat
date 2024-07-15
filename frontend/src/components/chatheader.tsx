/* eslint-disable @typescript-eslint/no-explicit-any */
import { FC, useEffect } from "react";
import { FaPlus } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { fetchMessageRequest, fetchUserRequest, setCurrentUser } from "../slice/userSlice";
import { RootState } from "../store";

interface ChatHeaderProps {}

const ChatHeader: FC<ChatHeaderProps> = () => {
  const dispatch = useDispatch();
  const friends = useSelector((state: RootState) => state.user.user);
const currentFriend =  useSelector((state:RootState) =>state.user.currentUser)
  const handleToSendMessage = (user: any) => {
    dispatch(setCurrentUser(user));
  };

  useEffect(() => {
    dispatch(fetchUserRequest());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchMessageRequest(currentFriend?._id))
  },[currentFriend?._id,dispatch])

  return (
    <div className="p-5">
      <div>
        <div className="flex justify-between items-center py-4">
          <h1 className="text-xl">Chat</h1>
          <FaPlus className="bg-[#92ffb3] w-5 h-5 text-xl text-white rounded-md" />
        </div>
        <div>
          <input
            type="search"
            placeholder="search"
            className="h-11 bg-[#F6F6F9] outline-none rounded-md px-3"
          />
        </div>
        <div className="py-5">
          <div className="py-5 flex flex-col gap-1">
            {friends && friends.length > 0
              ? friends.map((user, index: any) => (
                  <div
                    key={index}
                    onClick={() => handleToSendMessage(user)}
                    className={
                      currentFriend?._id === user._id
                        ? "bg-[#c7c7c7] rounded-sm"
                        : "hover:bg-[#b9b7b7] "
                    }
                  >
                    <div className="flex gap-3 items-center px-3  cursor-pointer hover:bg-[#e0e0e0]  active:scale-90  h-10 w-full rounded-sm">
                      <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVE13aD0sNpjODp_e3nB4SOUNWw2I_R6VpfoUfU4ZbRTIIZ2aq"
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <h1 className="font-thin mb-0">{user.name}</h1>
                    </div>
                  </div>
                ))
              : "No friends here"}
          </div>
          <div></div>
          <div>
            <h1 className="text-[#807E99]">Favorite Chats</h1>
            <div className="pt-5">
              <NavLink
                to="/"
                className="flex gap-3 items-center hover:bg-[#4EAC6D] h-11 px-3 rounded-md active:text-white"
              >
                <img
                  src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVE13aD0sNpjODp_e3nB4SOUNWw2I_R6VpfoUfU4ZbRTIIZ2aq"
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                />
                <h1 className="font-thin">Maria db</h1>
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatHeader;
