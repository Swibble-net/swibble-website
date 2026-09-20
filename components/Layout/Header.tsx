import CtaLink from "@/components/CtaLink";
import Link from "next/link";
import Image from "next/image";
import BurgerMenu from "../BurgerMenu/BurgerMenu";
import NavDropdown from "./NavDropdown";
import Logo from "@/public/logo/SwibbleLogo.svg";
import LogoText from "@/public/logo/SwibbleWordmark.svg";
import { NAV_LINKS } from "@/lib/navLinks";
import { CTA_LABEL } from "@/lib/cta";
import { useEffect, useState } from "react";
import { useScrollPosition } from "@/hooks/useScrollPostion";
import { RxHamburgerMenu } from "react-icons/rx";
import { IoClose } from "react-icons/io5";

const navLinkClass =
  "text-sm font-medium text-[#556987] hover:text-[#B718EC] transition-colors duration-300 ease-in-out";

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
              <Image src={Logo} alt="Swibble Logo" width={35} height={35} />
              <Image src={LogoText} alt="" width={100} height={30} />
            </div>
          </Link>
        </div>
        <nav className="hidden lg:flex items-center gap-8" aria-label="Hauptnavigation">
          {NAV_LINKS.map((item) =>
            item.children ? (
              <NavDropdown key={item.href} item={item} className={navLinkClass} />
            ) : (
              <Link key={item.href} href={item.href} className={navLinkClass}>
                {item.label}
              </Link>
            ),
          )}
        </nav>
        <div className="hidden lg:block">
          <CtaLink
            className="inline-block text-center bg-[#B718EC] text-[#F0FDF4] py-3 px-5 rounded-2xl hover:scale-95 transition duration-200"
          >
            {CTA_LABEL}
          </CtaLink>
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
