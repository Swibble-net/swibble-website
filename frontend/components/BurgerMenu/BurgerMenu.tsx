// Importing necessary React components
import { RxHamburgerMenu } from "react-icons/rx";
import { IoClose } from "react-icons/io5";
import Menu from "./Menu";

// Defining the expected props for the component
interface IMenu {
  menu: boolean; // boolean flag to identify menu state (open/closed)
  handleOnClick: () => void; // function to handle click events on menu button
}

// Defining the main component
const BurgerMenu = ({ menu, handleOnClick }: IMenu) => {
  return (
    <>
      {/* The hamburger button that toggles the menu */}
      <button onClick={handleOnClick}>
        {menu ? (
          <IoClose className="text-black w-8 h-8" />
        ) : (
          <RxHamburgerMenu className="text-black w-8 h-8" />
        )}
      </button>

      {/* The menu component */}
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
