import SEO from "@/components/SEO";
import { useRouter } from "next/router";
import { useEffect } from "react";

const Card = () => {
  const router = useRouter();
  useEffect(() => {
    router.push(`/`);
  }, [router]);
  return (
    <>
      <SEO
        title="Visitenkarte – Swibble"
        description="Swibble Visitenkarte – Weiterleitung zur Startseite."
        canonical="/card"
      />
    <div className="w-full h-96 flex justify-center items-center text-[#b718ec] text-2xl">
      <h1>Die Seite immernoch in der Bearbeitung</h1>
    </div>
    </>
  );
};

export default Card;
