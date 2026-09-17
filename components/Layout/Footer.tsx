import Image from "next/image";
import Link from "next/link";
import SwibbleLogoText from "@/public/logo/SwibbleTextLogoWhite.svg";
import { EMAIL, PHONE_DISPLAY, PHONE_TEL } from "@/lib/cta";

const footerLinkClass =
  "hover:text-[#E7A1FF] transition-colors duration-300 ease-in-out";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto w-full bg-[#000D36] px-4 pb-7 pt-12 text-[#FAFAFA]">
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
              alt="Swibble"
              width={97}
              height={27}
            />
          </div>
        </Link>
        <div className="w-full">
          <ul className="list-none flex flex-col items-center font-light text-xs gap-y-5">
            <li>
              <a href={`tel:${PHONE_TEL}`} className={footerLinkClass}>
                {PHONE_DISPLAY}
              </a>
            </li>
            <li>
              <a href={`mailto:${EMAIL}`} className={footerLinkClass}>
                {EMAIL}
              </a>
            </li>
            <li>
              <Link href={"/impressum"} className={footerLinkClass}>
                Impressum
              </Link>
            </li>
            <li>
              <Link href={"/datenschutz"} className={footerLinkClass}>
                Datenschutz
              </Link>
            </li>
            <li>
              <p className="text-[#ADADAD]">
                © {year} Swibble UG (haftungsbeschränkt)
              </p>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
