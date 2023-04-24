import Image from "next/image";
import LandingImage from "@/public/SwibbleLandingPageImage.png";

const LandingPart = () => {
  return (
    <div className="relative w-full flex flex-col justify-between gap-12 lg:flex-row lg:justify-around lg:items-center">
      <div className="bg-[#FDF5FF] bg-cover absolute top-0 bottom-0 right-0 left-0 -z-10 w-screen -mx-4 lg:-mx-20"></div>
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
          className="tracking-normal hover:tracking-[1px] transition-all duration-500 ease-in-out"
        >
          <p className="text-[#B718EC]">Jetzt Erstgespräch sichern {">"}</p>
        </a>
      </div>
      <div className="w-full flex justify-center">
        <Image src={LandingImage} alt="landing_mage" width={509} height={515} />
      </div>
    </div>
  );
};

export default LandingPart;
