import Image from "next/image";
import worldIcon from "@/public/icons/swibble_icon_world.svg";
import softIcon from "@/public/icons/swibble_icon_soft.svg";
import bagIcon from "@/public/icons/swibble_icon_bag.svg";
import IntroImage from "@/public/Swibble_Window_Mockup.svg";
import styles from "@/styles/introduction.module.scss";

const Introduction = () => {
  return (
    <section className={styles.container}>
      <h2>Dein Business hat Potenzial</h2>
      <p>
        Aus deinem Unternehmen eine Marke mit Wiedererkennungswert zu machen,
        ist unsere Top Priorität!
      </p>
      <div className={styles.content}>
        <div className={styles.list}>
          <div className={styles.list_item}>
            <Image src={worldIcon} alt="" height={43} width={43} />
            <div className={styles.item_text}>
              <h3>Echte Marke</h3>
              <p>
                Ein Unternehmen mit Wiedererkennungswert, gutem Brand Design und
                starker Medienpräsenz.
              </p>
            </div>
          </div>
          <div className={styles.list_item}>
            <Image src={softIcon} alt="" height={43} width={43} />
            <div className={styles.item_text}>
              <h3>Online Präsenz</h3>
              <p>
                Personalisierte Apps, Websites & weitere Softwareanwendungen um
                dein Unternehmen auf das nächste Level zu bringen.
              </p>
            </div>
          </div>
          <div className={styles.list_item}>
            <Image src={bagIcon} alt="" height={43} width={43} />
            <div className={styles.item_text}>
              <h3>Digitales Business</h3>
              <p>
                Mit Kunden & auch Mitarbeitern einfach in Kontakt bleiben, das
                eigene Markenimage pflegen und den Umsatz steigern.
              </p>
            </div>
          </div>
        </div>
        <Image
          src={IntroImage}
          alt="Swibble Software-Mockup: digitale Produkte in Fenster- und App-Ansicht"
          width={823}
          height={669}
          loading="lazy"
          className={`${styles.image} h-auto w-full`}
        />
      </div>
    </section>
  );
};

export default Introduction;
