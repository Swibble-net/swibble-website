import HeroVisual from "@/components/HeroVisual";
import { CTA_LABEL, CTA_URL } from "@/lib/cta";

const LandingPart = () => {
  return (
    <section className="relative w-full flex flex-col justify-between gap-12 py-10 mb-28 lg:flex-row lg:justify-around lg:items-center lg:mb-24 lg:py-28">
      <div
        aria-hidden
        className="bg-[#FDF5FF] bg-cover absolute top-0 bottom-0 right-0 left-0 -z-10 w-screen -mt-20 -mx-4 lg:-mx-20"
      ></div>
      <div className="flex flex-col gap-5">
        <h1 className="text-[#000D36] font-bold text-3xl leading-tight lg:text-5xl lg:leading-[1.15]">
          Social Media, Live-Events, Design & Software
        </h1>
        <p className="text-[#000D36] text-base font-normal lg:text-lg">
          Egal ob Start-up oder langjährig etabliert: Swibble bringt deine
          Marke mit viralem Content, Live-Events, Design und individueller
          Software auf das nächste Level.
        </p>
        <a
          href={CTA_URL}
          className="w-fit text-center text-base font-medium bg-[#B718EC] text-[#F0FDF4] py-3 px-6 rounded-2xl hover:scale-95 transition duration-200"
        >
          {CTA_LABEL}
        </a>
      </div>
      <div className="w-full flex justify-center">
        <HeroVisual
          alt="Fynn Frings mit professioneller Kamera vor farbigem Hintergrund"
          sizes="(max-width: 1024px) min(100vw - 2rem, 509px), min(50vw, 640px)"
          className="max-w-[509px] lg:max-w-[560px] xl:max-w-[640px]"
        />
      </div>
      <div
        aria-hidden
        className="absolute -bottom-12 left-0 overflow-hidden leading-[0] -mx-4 lg:-mx-20 lg:-bottom-20 w-screen"
      >
        <svg
          className="relative block rotate-180 w-[137%] h-12 lg:h-20"
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
    </section>
  );
};

export default LandingPart;
