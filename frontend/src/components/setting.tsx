import { FC } from "react";
import { CgProfile } from "react-icons/cg";
import { IoColorPaletteOutline } from "react-icons/io5";
import { MdOutlineKeyboardArrowDown } from "react-icons/md";
import { SiGnuprivacyguard } from "react-icons/si";

interface ChatHeaderProps {}

const SettingHeader: FC<ChatHeaderProps> = () => {
  return (
    <div className="" id="setting">
      <div>
        <div
          className="w-full h-44 relative"
          style={{
            backgroundImage: `url("./profile.jpg")`,
            objectFit: "cover",
          }}
        >
          <div className="flex justify-center absolute w-full bottom-[-64px] ">
            <div className="w-32 h-32 rounded-full  border-[10px] shrink-0 bg-[#cac6c6]  "></div>
          </div>
        </div>
        {/* name */}
        <div className="pt-20 flex justify-center border-b pb-10">
          <div>
            <h1 className="text-2xl ">Mamush Meshesha</h1>
            <div className="flex justify-center items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#66d65e] "></div>
              <span className="text-xs">Active</span>
            </div>
          </div>
        </div>
        {/* profile information */}
        <div className="flex justify-between px-5 items-center py-6 border-b">
          <div className="flex gap-3 items-center">
            <CgProfile />
            <span>Profile information</span>
          </div>
          <div>
            <MdOutlineKeyboardArrowDown />
          </div>
        </div>
        {/* end of profile info */}
        {/* profile information */}
        <div className="flex justify-between px-5 items-center py-6 border-b">
          <div className="flex gap-3 items-center">
            <IoColorPaletteOutline />
            <span>Themes</span>
          </div>
          <div>
            <MdOutlineKeyboardArrowDown />
          </div>
        </div>
        {/* end of profile info */}
        {/* profile information */}
        <div className="flex justify-between px-5 items-center py-6 border-b">
          <div className="flex gap-3 items-center">
            <SiGnuprivacyguard />
            <span>Privacy</span>
          </div>
          <div>
            <MdOutlineKeyboardArrowDown />
          </div>
        </div>
        {/* end of profile info */}
      </div>
    </div>
  );
};

export default SettingHeader;
