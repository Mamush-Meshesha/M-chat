import { FC } from "react";
import { BsThreeDots } from "react-icons/bs";
import { FaPlus } from "react-icons/fa6";
import { NavLink } from "react-router-dom";

interface ChatHeaderProps {}

const ContactHeader: FC<ChatHeaderProps> = () => {
  return (
    <div className="p-5">
      <div id="chat">
        <div className="flex justify-between items-center py-4 ">
          <h1 className="text-xl">contacts</h1>
          <FaPlus className="bg-[#92ffb3] w-5 h-5 text-xl text-white rounded-md  " />
        </div>
        <div>
          <input
            type="search"
            placeholder="search contact"
            className="h-11 bg-[#F6F6F9] outline-none rounded-md px-3 "
          />
        </div>
        <div className="py-11">
          <div>
            <h1 className="text-[#807E99]  "></h1>
            <div className="py-5 flex flex-col gap-5">
              <div className="flex justify-between items-center">
                <NavLink
                  to="/"
                  className="flex gap-3 items-center active:bg-[#4EAC6D] h-11 px-3 rounded-md active:text-white  "
                >
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVE13aD0sNpjODp_e3nB4SOUNWw2I_R6VpfoUfU4ZbRTIIZ2aq"
                    alt=""
                    className="w-7 h-7 rounded-full object-cover "
                  />
                  <h1 className="font-thin mb-0">Maria db</h1>
                </NavLink>
                <BsThreeDots />
              </div>
              <div className="flex justify-between items-center">
                <NavLink
                  to="/"
                  className="flex gap-3 items-center active:bg-[#4EAC6D] h-11 px-3 rounded-md active:text-white  "
                >
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVE13aD0sNpjODp_e3nB4SOUNWw2I_R6VpfoUfU4ZbRTIIZ2aq"
                    alt=""
                    className="w-7 h-7 rounded-full object-cover "
                  />
                  <h1 className="font-thin mb-0">Maria db</h1>
                </NavLink>
                <BsThreeDots />
              </div>
              <div className="flex justify-between items-center">
                <NavLink
                  to="/"
                  className="flex gap-3 items-center active:bg-[#4EAC6D] h-11 px-3 rounded-md active:text-white  "
                >
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVE13aD0sNpjODp_e3nB4SOUNWw2I_R6VpfoUfU4ZbRTIIZ2aq"
                    alt=""
                    className="w-7 h-7 rounded-full object-cover "
                  />
                  <h1 className="font-thin mb-0">Maria db</h1>
                </NavLink>
                <BsThreeDots />
              </div>
              <div className="flex justify-between items-center">
                <NavLink
                  to="/"
                  className="flex gap-3 items-center active:bg-[#4EAC6D] h-11 px-3 rounded-md active:text-white  "
                >
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVE13aD0sNpjODp_e3nB4SOUNWw2I_R6VpfoUfU4ZbRTIIZ2aq"
                    alt=""
                    className="w-7 h-7 rounded-full object-cover "
                  />
                  <h1 className="font-thin mb-0">Maria db</h1>
                </NavLink>
                <BsThreeDots />
              </div>
            </div>
            <div>
              <h1 className="text-[#807E99]  ">favorite chats</h1>
              <div className="pt-5">
                <NavLink
                  to="/"
                  className="flex gap-3 items-center active:bg-[#4EAC6D] h-11 px-3 rounded-md active:text-white  "
                >
                  <img
                    src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRVE13aD0sNpjODp_e3nB4SOUNWw2I_R6VpfoUfU4ZbRTIIZ2aq"
                    alt=""
                    className="w-7 h-7 rounded-full object-cover "
                  />
                  <h1 className="font-thin">Maria db</h1>
                </NavLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactHeader;
