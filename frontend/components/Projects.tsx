import styles from "@/styles/projects.module.scss";
{
  /*Render the component*/
}
const Projects = () => {
  return (
    <div>
      <div className={styles.description}>
        <div className={styles.text_description}>
          <h1>Hier könnte dein Projekt stehen</h1>
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
          <div className={styles.item1}>
            <h3>Dein Projekt</h3>
            <h2>Starter mit Swibble!</h2>
          </div>
          <div className={styles.item2}>
            <h3>App & Web-App</h3>
            <h2>Konrat’s Welt</h2>
          </div>
        </div>
        <div className={styles.list_container2}>
          <div className={styles.item3}>
            <h3>Web App</h3>
            <h2>Little World</h2>
          </div>
          <div className={styles.item4}>
            <h3>App & Website</h3>
            <h2>Aachen App</h2>
          </div>
        </div>
        <div className={styles.list_container3}>
          <div className={styles.item5}>
            <h3>App</h3>
            <h2>RydeUp</h2>
          </div>
          <div className={styles.item6}>
            <h3>Qualitätssicherung</h3>
            <h2>Square</h2>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;
