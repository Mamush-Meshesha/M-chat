import { FC } from "react";
import { FaRegMessage } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

interface LogoutProps {}
const LogoutComp: FC<LogoutProps> = () => {
  const navigate = useNavigate();
  const handleRedirect = () => {
    navigate("/login");
  };
  return (
    <div className="bg-[#4EAC6D] min-h-screen p-10 overflow-hidden ">
      <div className="md:flex md:justify-between gap-20">
        <div className="leading-10">
          <div className="flex gap-3">
            <FaRegMessage className="text-white text-3xl " />
            <h1 className="text-2xl font-medium text-white">Let's Chat!</h1>
          </div>
          <h1 className="capitalize text-[#9ED5B2] ">
            come and enjoy with friends
          </h1>
          <div className="hidden md:flex absolute bottom-0 pb-[6rem] pl-[20rem] ">
            <img
              src="./Animation.gif"
              alt="gif"
              className="w-[300px] h-[200px] object-center "
            />
          </div>
        </div>
        <div className="bg-[#fff] md:w-[70%]  md:h-[91vh] rounded-2xl py-10 md:py-0 ">
          <div className="flex justify-center items-center h-full">
            <div className="md:w-[40%] flex justify-center">
              <div>
                <div className="w-[150px] h-[150px]  rounded-full bg-[#6c9b7c] opacity-80 flex justify-center items-center ">
                  <img
                    src="https://imgv3.fotor.com/images/blog-cover-image/10-profile-picture-ideas-to-make-you-stand-out.jpg"
                    alt="alt"
                    className=" w-[70%] h-[70%] object-cover rounded-full  "
                  />
                </div>
                <div className="leading-8 pt-6">
                  <h1>Your are logged-out!</h1>
                  <p>We'll miss you 🥺🥺🥺</p>
                </div>
                <div className="pt-5">
                  <button
                    onClick={handleRedirect}
                    className="bg-[#4EAC6D] text-center w-full h-11 rounded-md "
                  >
                    Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutComp;
