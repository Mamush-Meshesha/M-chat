import { FC } from "react";
import { FaX } from "react-icons/fa6";

interface AddmodalProps {
  onClose?: () => void;
}

const Addmodal: FC<AddmodalProps> = ({ onClose }) => {
  return (
    <div>
      <div className="w-[100vw] h-[100vh] bg-[#868686] bg-opacity-65 absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center   ">
        <div className="w-[480px] h-auto bg-white rounded-md border  ">
          <div className="flex justify-between items-center h-14 bg-[#4EAC6D] px-4 rounded-t-md  ">
            <h1>Create contact</h1>
            <button onClick={onClose}>
              <FaX />
            </button>
          </div>
          <div className="flex flex-col gap-6 py-5 px-6">
            <div className="flex flex-col gap-3">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                placeholder="Email address"
                className="h-11 border outline-none rounded-md px-3"
              />
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                placeholder="name here"
                className="h-11 border outline-none rounded-md px-3"
              />
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="email">Invitation message</label>
              <textarea
                placeholder="invitation messages...."
                className="border outline-none rounded-md px-3 min-h-36"
              ></textarea>
            </div>
          </div>
          <div className="border-t ">
            <div className="py-3 flex justify-end gap-6 px-6">
              <button className=" ">close</button>
              <button className="bg-[#4EAC6D] h-11 rounded-md px-4  text-white">
                invite
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Addmodal;
