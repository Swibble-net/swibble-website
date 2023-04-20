import { RxHamburgerMenu } from "react-icons/rx";
import { IoClose } from "react-icons/io5";
import Menu from "./Menu";
import { useState } from "react";

interface IMenu {
  menu: boolean;
  handleOnClick: () => void;
}

const BurgerMenu = ({ menu, handleOnClick }: IMenu) => {
  return (
    <>
      <button onClick={handleOnClick}>
        {menu ? (
          <IoClose className="text-black w-8 h-8" />
        ) : (
          <RxHamburgerMenu className="text-black w-8 h-8" />
        )}
      </button>
      <div
        className={`fixed bg-[#FDF5FF] w-full top-0 right-0 px-4 ${
          menu ? "translate-y-1/2" : "-translate-y-[150%]"
        } transition ease-in-out shadow-lg`}
      >
        <Menu handleOnClick={handleOnClick} menu={menu} />
      </div>
    </>
  );
};

export default BurgerMenu;
