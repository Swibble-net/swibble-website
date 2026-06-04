import Link from "next/link";
import Image from "next/image";
import BurgerMenu from "../BurgerMenu/BurgerMenu";
import Logo from "@/public/logo/SwibbleLogo.svg";
import LogoText from "@/public/logo/SwibbleTextLogo.svg";
import { NAV_LINKS } from "@/lib/navLinks";
import { useEffect, useState } from "react";
import { useScrollPosition } from "@/hooks/useScrollPostion";
import { RxHamburgerMenu } from "react-icons/rx";
import { IoClose } from "react-icons/io5";

const navLinkClass =
  "text-sm font-medium text-[#556987] tracking-normal hover:text-[#B718EC] hover:tracking-[1px] transition-all duration-300 ease-in-out";

const Header = () => {
  const [menu, setMenu] = useState<boolean>(false);

  const handleOnClick = (): void => {
    setMenu(!menu);
  };

  const scrollPosition = useScrollPosition();

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  return (
    <>
      <header
        className={`w-full fixed z-50 top-0 flex justify-between items-center bg-[#FDF5FF] px-4 py-7 transition-all ease-in-out ${
          scrollPosition > 0 && menu === false ? "shadow-lg" : "shadow-none"
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
        <nav className="hidden lg:flex items-center gap-8" aria-label="Hauptnavigation">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={navLinkClass}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden lg:block">
          <a href={"https://meet.swibble.net"}>
            <button className="text-center w-full bg-[#B718EC] text-[#F0FDF4] py-3 px-5 rounded-2xl hover:scale-95 transition duration-200">
              Termin vereinbaren
            </button>
          </a>
        </div>
        <div className="relative z-60 block lg:hidden">
          <button
            type="button"
            aria-label={menu ? "Menü schließen" : "Menü öffnen"}
            aria-expanded={menu}
            onClick={handleOnClick}
            className="flex items-center justify-center p-1"
          >
            {menu ? (
              <IoClose className="h-7 w-7 text-black" />
            ) : (
              <RxHamburgerMenu className="h-7 w-7 text-black" />
            )}
          </button>
        </div>
      </header>
      <BurgerMenu menu={menu} handleOnClick={handleOnClick} />
    </>
  );
};

export default Header;
