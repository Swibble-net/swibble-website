// Import all required modules
import styles from "@/styles/tasks.module.scss";
import Image from "next/image";
import BrushIcon from "@/public/icons/icon_brush.svg";
import MonitorIcon from "@/public/icons/icon_monitor.svg";
import StonksIcon from "@/public/icons/icon_stonks.svg";
import SecurityIcon from "@/public/icons/icon_security.svg";
import MobileIcon from "@/public/icons/mobile_icon.svg";
import UserLocationIcon from "@/public/icons/user_location_icon.svg";
// Render rthe component
const Tasks = () => {
  return (
    <div id="uber-uns" className={`${styles.container} scroll-mt-28 lg:scroll-mt-32`}>
      {/*Adding the "wave" on top of the component*/}
      <div className={styles.wave_top}>
        <svg
          data-name="Layer 1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            style={{ fill: "#FDF5FF" }}
          ></path>
        </svg>
      </div>
      {/*Adding the background ignoring the paddings of layout */}
      <div className={styles.background}></div>
      <div className={styles.description}>
        <h1>Womit hilft Swibble mir?</h1>
        <p>
          Swibble unterstützt ganzheitlich, egal ob Online oder in Präsenz.
          Wir repräsentieren deine Marke im besten Licht auf Social Media, auf Events oder im Web!
        </p>
      </div>
      {/* Render the container with cards */}
      <div className={styles.card_container}>
        <div className={styles.card3}>
          <Image src={MobileIcon} alt="stonks" width={32} height={32} />
          <h2 style={{ color: "#3ABD9E" }}>Social Media</h2>
          <p>Viraler Content auf deinen Social Media Kanälen.</p>
        </div>
        <div className={styles.card4}>
          <Image src={UserLocationIcon} alt="monitor" width={32} height={32} />
          <h2 style={{ color: "#C43B7D" }}>Live Events</h2>
          <p>Live Events in deinem Unternehmen, Messen oder Online.</p>
        </div>
        <div className={styles.card1}>
          <Image src={BrushIcon} alt="brush" width={32} height={32} />
          <h2 style={{ color: "#B718EC" }}>Design</h2>
          <p>Entwurf des Designs von Software, druckbaren Medien & Werbung.</p>
        </div>
        <div className={styles.card2}>
          <Image src={MonitorIcon} alt="monitor" width={32} height={32} />
          <h2 style={{ color: "#5F3BC4" }}>Development</h2>
          <p>Entwicklung persönlicher Softwarelösungen.</p>
        </div>
      </div>
      {/*Adding the "wave" in the bottom of the component*/}
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

export default Tasks;
