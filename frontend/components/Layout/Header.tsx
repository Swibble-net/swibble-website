import Link from "next/link";
import Image from "next/image";
import BurgerMenu from "../BurgerMenu/BurgerMenu";
import Logo from "@/public/logo/SwibbleLogo.svg";
import LogoText from "@/public/logo/SwibbleTextLogo.svg";
import { useState } from "react";

const Header = () => {
  const [menu, setMenu] = useState(false);

  const handleOnClick = () => {
    setMenu(!menu);
  };

  return (
    <header
      className={`w-full flex justify-between items-center ${
        menu ? "bg-[#F5FFFE]" : "bg-[#FDF5FF]"
      } px-4 py-7 transition-colors ease-in-out`}
    >
      <Link href={"/"}>
        <div className="w-full flex items-center">
          <Image src={Logo} alt="logo" width={35} height={35} />
          <Image src={LogoText} alt="logo" width={90} height={30} />
        </div>
      </Link>
      <div className="lg:hidden">
        <BurgerMenu menu={menu} handleOnClick={handleOnClick} />
      </div>
    </header>
  );
};

export default Header;
