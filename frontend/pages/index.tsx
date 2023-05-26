import Comapnies from "@/components/Companies";
import Contact from "@/components/Contact";
import Introduction from "@/components/Introduction";
import LandingPart from "@/components/LandingPart";
import Projects from "@/components/Projects";
import Tasks from "@/components/Tasks";

export default function Home() {
  return (
    <>
      <LandingPart />
      <Introduction />
      <Tasks />
      <Projects />
      <Comapnies />
      <Contact />
    </>
  );
}
