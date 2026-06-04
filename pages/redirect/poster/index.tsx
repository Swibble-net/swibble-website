import SEO from "@/components/SEO";
import { useRouter } from "next/router";
import { useEffect } from "react";

const Poster = () => {
  const router = useRouter();
  useEffect(() => {
    router.push("/");
  }, [router]);
  return (
    <SEO
      title="Poster – Swibble"
      description="Swibble Poster – Weiterleitung zur Startseite."
      canonical="/redirect/poster"
    />
  );
};

export default Poster;
