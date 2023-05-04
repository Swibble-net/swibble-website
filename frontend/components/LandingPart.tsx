import Image from "next/image";
import LandingImage from "@/public/SwibbleLandingPageImage.png";

const LandingPart = () => {
  return (
    <div className="relative w-full flex flex-col justify-between gap-12 py-10 mb-28 lg:flex-row lg:justify-around lg:items-center lg:mb-24 lg:py-28">
      <div className="bg-[#FDF5FF] bg-cover absolute top-0 bottom-0 right-0 left-0 -z-10 w-screen -mt-20 -mx-4 lg:-mx-20"></div>
      <div className="flex flex-col gap-5">
        <h2 className="text-[#000D36] font-bold text-2xl">
          Biete deinen Kunden ein digitales Unternehmen
        </h2>
        <p className="text-[#000D36] text-base font-normal">
          Egal ob StartUp oder langjährig etabliert: Swibble berät und hilft
          deinem Unternehmen dabei, den nächsten Meilenstein in der digitalen
          Welt zu erreichen.
        </p>
        <a
          href={"https://meet.swibble.net"}
          className="w-fit tracking-normal hover:tracking-[1px] transition-all duration-500 ease-in-out"
        >
          <p className="text-[#B718EC]">Jetzt Erstgespräch sichern {">"}</p>
        </a>
      </div>
      <div className="w-full flex justify-center">
        <Image src={LandingImage} alt="landing_mage" width={509} height={515} />
      </div>
      <div className="absolute -bottom-20 left-0 overflow-hidden leading-[0] -mx-4 lg:-mx-20 w-screen">
        <svg
          className="relative block rotate-180 w-[137%] h-20"
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            className="fill-[#FDF5FF]"
          ></path>
        </svg>
      </div>
    </div>
  );
};

export default LandingPart;
