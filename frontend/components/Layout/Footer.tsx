import Image from "next/image";
import Link from "next/link";
import SwibbleLogoText from "@/public/logo/SwibbleTextLogoWhite.svg";

const Footer = () => {
  return (
    <div className="w-full bg-[#000D36] sticky top-full pt-12 pb-7 px-4 text-[#FAFAFA]">
      <div className="flex flex-col items-center gap-8 w-full">
        <Link href={"/"}>
          <div className="flex flex-row gap-7  hover:scale-95 transition duration-200">
            <Image
              src={SwibbleLogoText}
              alt="instagram"
              width={97}
              height={27}
            />
          </div>
        </Link>
        <div className="w-full">
          <ul className="list-none flex flex-col items-center font-light text-xs gap-y-5">
            <Link href={"/impressum"}>
              <li className="tracking-normal hover:tracking-[1px] transition-all duration-500 ease-in-out">
                Impressum
              </li>
            </Link>
            <li>
              <p className="text-[#ADADAD]">All Rights Reserved @2022</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Footer;
