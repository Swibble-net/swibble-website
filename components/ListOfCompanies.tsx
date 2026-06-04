import styles from "@/styles/companies.module.scss";
import Image from "next/image";
import { companyLogos } from "@/lib/companiesLogos";

const CompanyLogoSlide = ({
  logo,
  duplicate = false,
}: {
  logo: (typeof companyLogos)[number];
  duplicate?: boolean;
}) => (
  <div className={styles.slide} aria-hidden={duplicate || undefined}>
    <Image
      src={logo.src}
      alt={duplicate ? "" : logo.alt}
      width={184}
      height={64}
      loading="lazy"
      sizes="(max-width: 1024px) 152px, 184px"
      className={styles.logo}
    />
  </div>
);

const ListOfCompanies = () => {
  return (
    <div className={styles.container}>
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
      <div className={styles.background}></div>
      <div className={styles.description}>
        <p className="text-center text-base lg:text-lg font-normal text-[#707070]">Diese Unternehmen vertrauen Swibble bereits</p>
      </div>

      <div className={styles.carousel} aria-label="Partner-Unternehmen">
        <div className={styles.track}>
          {companyLogos.map((logo) => (
            <CompanyLogoSlide key={`a-${logo.alt}`} logo={logo} />
          ))}
          {companyLogos.map((logo) => (
            <CompanyLogoSlide key={`b-${logo.alt}`} logo={logo} duplicate />
          ))}
        </div>
      </div>

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
