import { FC } from "react";
import { FaRegMessage } from "react-icons/fa6";

interface ResetProps {}
const ResetComp: FC<ResetProps> = () => {
  return (
    <div className="bg-[#4EAC6D] min-h-screen p-10 overflow-hidden ">
      <div className="flex justify-between gap-20">
        <div className="leading-10">
          <div className="flex gap-3">
            <FaRegMessage className="text-white text-3xl " />
            <h1 className="text-2xl font-medium text-white">Let's Chat!</h1>
          </div>
          <h1 className="capitalize text-[#9ED5B2] ">
            come and enjoy with friends
          </h1>
          <div className="absolute bottom-0 pb-[6rem] pl-[20rem] ">
            <img
              src="./Animation.gif"
              alt="gif"
              className="w-[300px] h-[200px] object-center "
            />
          </div>
        </div>
        <div className="bg-[#fff] w-[70%]  h-[91vh] rounded-2xl ">
          <div className="flex items-center justify-center  h-full ">
            <div className="w-[100%]">
              <div className="flex items-center justify-center   ">
                <div>
                  <h1 className="text-3xl capitalize text-center ">
                    Reset password
                  </h1>
                  <p className="text-[#b7beba] font-raleway text-center pt-2 ">
                    Are you sure you want to reset your password?{" "}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center  pt-10">
                <div className="flex flex-col w-[40%] ">
                  <div className="pt-3 flex flex-col">
                    <label htmlFor="username">Email</label>
                    <input
                      type="email"
                      placeholder="eg, user@gmail.com"
                      className="outline-none border h-11 rounded-md px-3 py-2 "
                    />
                  </div>

                  <div className="pt-10">
                    <button className="bg-[#4EAC6D] text-center w-full h-11 rounded-md ">
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetComp;
