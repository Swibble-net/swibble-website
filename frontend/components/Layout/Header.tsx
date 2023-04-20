import Link from "next/link";
import Image from "next/image";
import BurgerMenu from "../BurgerMenu/BurgerMenu";
import Logo from "@/public/logo/SwibbleLogo.svg";
import LogoText from "@/public/logo/SwibbleTextLogo.svg";
import { useState } from "react";
import { useScrollPosition } from "@/hooks/useScrollPostion";

const Header = () => {
  const [menu, setMenu] = useState(false);

  const handleOnClick = () => {
    setMenu(!menu);
  };

  const scrollPosition = useScrollPosition();

  return (
    <header
      className={`w-full fixed top-0 flex justify-between items-center bg-[#FDF5FF] px-4 py-7 transition-all ease-in-out ${
        scrollPosition > 0 ? "shadow-lg" : "shadow-none"
      }`}
    >
      <div>
        <Link href={"/"}>
          <div className="w-full flex items-center hover:scale-95 transition duration-200">
            <Image src={Logo} alt="logo" width={35} height={35} />
            <Image src={LogoText} alt="logo" width={90} height={30} />
          </div>
        </Link>
      </div>
      <div className="hidden lg:block">
        <a href={"https://meet.swibble.net"}>
          <button className="text-center w-full bg-[#B718EC] text-[#F0FDF4] py-3 px-5 rounded-2xl hover:scale-95 transition duration-200">
            Termin vereinbaren
          </button>
        </a>
      </div>
      <div className="block lg:hidden">
        <BurgerMenu menu={menu} handleOnClick={handleOnClick} />
      </div>
    </header>
  );
};

export default Header;
