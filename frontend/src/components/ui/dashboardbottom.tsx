import { FC } from "react";
import { BsThreeDots } from "react-icons/bs";
import { IoSend } from "react-icons/io5";
import { MdOutlineEmojiEmotions, MdOutlineKeyboardVoice } from "react-icons/md";

interface DashboardbottomProps {}
const Dashboardbottom: FC<DashboardbottomProps> = () => {
  return (
    <div className="bg-[#E5DDD5] h-20 w-[80%] ml-[20%] border-t  absolute bottom-0 left-0 right-0 ">
      <div className="flex gap-7  px-10 items-center h-full w-full">
        <BsThreeDots className="text-2xl text-[#66615e] " />
        <MdOutlineEmojiEmotions className="text-2xl text-[#66615e] " />
        <div className="w-[85%] ">
          <input
            type="text"
            placeholder="Type your message"
            className="w-full outline-none h-11 border rounded-md px-3 "
          />
        </div>
        <MdOutlineKeyboardVoice className="text-2xl text-[#66615e] " />
        <IoSend className="bg-[#4EAC6D] h-9 px-6 rounded-md  text-6xl text-white " />
      </div>
    </div>
  );
};

export default Dashboardbottom;
