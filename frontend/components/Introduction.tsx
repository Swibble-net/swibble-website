import Image from "next/image";
import worldIcon from "@/public/icons/swibble_icon_world.svg";
import softIcon from "@/public/icons/swibble_icon_soft.svg";
import bagIcon from "@/public/icons/swibble_icon_bag.svg";
import Intro from "@/public/introduction_image.svg";
import styles from "@/styles/introduction.module.scss";

const Introduction = () => {
  return (
    <div className={styles.container}>
      <h1>Dein Business hat Potenzial</h1>
      <h2>
        Aus deinem Unternehmen eine Marke mit Wiedererkennungswert zu machen,
        ist unsere Top Priorität!
      </h2>
      <div className={styles.content}>
        <div className={styles.list}>
          <div className={styles.list_item}>
            <Image src={worldIcon} alt="world" height={43} width={43} />
            <div className={styles.item_text}>
              <h3>Echte Marke</h3>
              <p>
                Ein Unternehmen mit Wiedererkennungswert, gutem Brand Design und
                starker Medienpräsenz.
              </p>
            </div>
          </div>
          <div className={styles.list_item}>
            <Image src={softIcon} alt="world" height={43} width={43} />
            <div className={styles.item_text}>
              <h3>Eigene Software</h3>
              <p>
                Personalisierte Apps, Websites & weitere Softwareanwendungen um
                dein Unternehmen auf das nächste Level zu bringen.
              </p>
            </div>
          </div>
          <div className={styles.list_item}>
            <Image src={bagIcon} alt="world" height={43} width={43} />
            <div className={styles.item_text}>
              <h3>Optimiertes Business</h3>
              <p>
                Mit Kunden & auch Mitarbeitern einfacher in Kontakt bleiben, das
                eigene Markenimage pflegen und den Umsatz zu steigern.
              </p>
            </div>
          </div>
        </div>
        <Image
          src={Intro}
          alt="intro"
          width={1}
          height={1}
          className={styles.image}
        />
      </div>
    </div>
  );
};

export default Introduction;
