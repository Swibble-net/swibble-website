import Introduction from "@/components/Introduction";
import LandingPart from "@/components/LandingPart";
import Projects from "@/components/Projects";
import Tasks from "@/components/Tasks";
import ListOfCompanies from "@/components/ListOfCompanies";
import ContactForm from "@/components/ContactForm";

export default function Home() {
  return (
    <>
      <LandingPart />
      <Introduction />
      <Tasks />
      <Projects />
      <ListOfCompanies />
      <ContactForm />
    </>
  );
}
