import Link from "next/link";
import styles from "@/styles/projects.module.scss";

const CASE_STUDIES = [
  { href: "/blog/case-study-aquis-plaza-aachen", label: "Aquis Plaza Aachen" },
  {
    href: "/blog/case-study-olympia-einkaufszentrum-munchen",
    label: "Olympia-Einkaufszentrum München",
  },
  {
    href: "/blog/case-study-billstedt-center-hamburg",
    label: "Billstedt-Center Hamburg",
  },
  { href: "/blog/case-study-rushfood-aachen", label: "Rushfood Aachen" },
] as const;

const Projects = () => {
  return (
    <div id="portfolio" className="scroll-mt-28 lg:scroll-mt-32">
      <div className={styles.description}>
        <div className={styles.text_description}>
          <h2>Hier könnte dein Projekt stehen</h2>
          <br />
          <p>
            Viele Unternehmen vertrauen Swibble bereits! Klicke dich einfach
            durch ein paar unserer Lieblingsprojekte durch und lass dich
            inspirieren.
          </p>
        </div>
      </div>
      {/*Render the list of projects*/}
      <div className={styles.list}>
        <div className={styles.list_container1}>
          <Link href="/#kontakt" className={styles.item1}>
            <p>Dein Projekt</p>
            <h3>Starte mit Swibble!</h3>
          </Link>
          <div className={styles.item2}>
            <p>App & Web-App</p>
            <h3>Konrat’s Welt</h3>
          </div>
        </div>
        <div className={styles.list_container2}>
          <div className={styles.item3}>
            <p>Web App</p>
            <h3>Little World</h3>
          </div>
          <div className={styles.item4}>
            <p>App & Website</p>
            <h3>Aachen App</h3>
          </div>
        </div>
        <div className={styles.list_container3}>
          <div className={styles.item5}>
            <p>App</p>
            <h3>RydeUp</h3>
          </div>
          <div className={styles.item6}>
            <p>Qualitätssicherung</p>
            <h3>Square</h3>
          </div>
        </div>
      </div>
      <p className={styles.case_studies}>
        <span>Case Studies lesen:</span>
        {CASE_STUDIES.map(({ href, label }) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </p>
    </div>
  );
};

export default Projects;
