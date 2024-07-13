import { FC, useEffect } from "react";
import { FaPlus } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { NavLink } from "react-router-dom";
import { fetchUserRequest } from "../slice/userSlice";
import { RootState } from "../store";

interface ChatHeaderProps {}

const ChatHeader: FC<ChatHeaderProps> = () => {
  const dispatch = useDispatch();
  const friends = useSelector((state: RootState) => state.user.user);

  useEffect(() => {
    dispatch(fetchUserRequest());
  }, [dispatch]);

  return (
    <div className="p-5">
      <div id="chat">
        <div className="flex justify-between items-center py-4 ">
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
              ? friends.map((user, index) => (
                  <div
                    key={index}
                    className="cursor-pointer hover:bg-green-400   h-10 w-full rounded-md"
                  >
                    <div className="flex gap-3 items-center px-3 h-full">
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
          <div>
            <h1 className="hover:bg-green">hello</h1>
          </div>
          <div>
            <h1 className="text-[#807E99] 111111111111111">Favorite Chats</h1>
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
