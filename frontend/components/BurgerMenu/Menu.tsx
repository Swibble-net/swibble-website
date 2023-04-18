import Link from "next/link";

export default function Menu({ handleOnClick }: any) {
  return (
    <>
      <div className="flex flex-col text-sm text-[#556987] gap-y-6 my-6 font-medium">
        <Link href={"/kontant"} onClick={handleOnClick}>
          Kontakt
        </Link>
        <Link href={"/"} onClick={handleOnClick}>
          Impressum
        </Link>
        <Link href={"/"} onClick={handleOnClick}>
          <button className="text-center w-full bg-[#B718EC] text-[#F0FDF4] rounded-lg py-3">
            Termin vereinbaren
          </button>
        </Link>
      </div>
    </>
  );
}
