import Image from "next/image";
import Link from "next/link";
import SwibbleLogoText from "@/public/logo/SwibbleTextLogoWhite.svg";

const Footer = () => {
  return (
    <div className="w-full bg-[#000D36] sticky top-full pt-12 pb-7 px-4 text-[#FAFAFA]">
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-[0]">
        <svg
          className="relative block w-[136%] h-4 lg:h-[39px]"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            className="fill-white"
          ></path>
        </svg>
      </div>
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
