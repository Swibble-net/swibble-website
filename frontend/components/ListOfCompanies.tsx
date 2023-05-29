// Import all required modules
import styles from "@/styles/companies.module.scss";
import Image from "next/image";
import AachenLogo from "@/public/companies_logos/aachen.png";
import KellerLogo from "@/public/companies_logos/keller.png";
import RydeLogo from "@/public/companies_logos/ryde.png";
import SquareLogo from "@/public/companies_logos/square.svg";
import WorldLogo from "@/public/companies_logos/world.png";

// Render rthe component
const ListOfCompanies = () => {
  return (
    <div className={styles.container}>
      {/*Adding the "wave" on top of the component*/}
      <div className={styles.wave_top}>
        <svg
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            style={{ fill: "#FDF5FF" }}
          ></path>
        </svg>
      </div>
      {/*Adding the background ignoring the paddings of layout */}
      <div className={styles.background}></div>
      <div className={styles.description}>
        <p>Diese Unternehmen vertrauen Swibble bereits</p>
      </div>

      {/*Render list of companies */}
      <div className={styles.list}>
        <div>
          <Image src={KellerLogo} alt="keller" width={0} height={0} />
        </div>
        <div>
          <Image src={RydeLogo} alt="ryde" width={0} height={0} />
        </div>
        <div>
          <Image src={SquareLogo} alt="square" width={0} height={0} />
        </div>
        <div>
          <Image src={WorldLogo} alt="world" width={0} height={0} />
        </div>
        <div>
          <Image src={AachenLogo} alt="aachen" width={0} height={0} />
        </div>
      </div>
      {/*Adding the "wave" in bottom of the component*/}
      <div className={styles.wave_bottom}>
        <svg
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z"
            style={{ fill: "#FDF5FF" }}
          ></path>
        </svg>
      </div>
    </div>
  );
};

export default ListOfCompanies;
