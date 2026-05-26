import Link from "next/link";

export default function Menu({ handleOnClick }: any) {
  return (
    <>
      <div className="flex flex-col text-sm text-[#556987] gap-y-6 my-6 font-medium">
        <Link
          href={"/blog"}
          onClick={handleOnClick}
          className="tracking-normal hover:tracking-[1px] transition-all duration-500 ease-in-out"
        >
          Blog
        </Link>
        <Link
          href={"/impressum"}
          onClick={handleOnClick}
          className="tracking-normal hover:tracking-[1px] transition-all duration-500 ease-in-out"
        >
          Impressum
        </Link>
        <a href={"https://meet.swibble.net"} onClick={handleOnClick}>
          <button className="text-center w-full bg-[#B718EC] text-[#F0FDF4] rounded-lg py-3 hover:scale-95 transition duration-200">
            Termin vereinbaren
          </button>
        </a>
      </div>
    </>
  );
}
