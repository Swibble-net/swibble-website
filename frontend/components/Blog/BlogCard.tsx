import styles from "@/styles/blog_card.module.scss";
import Image from "next/image";
import MockupPhoto from "@/public/projects_photo/LittleWorld_Image.png";
import Clock from "@/public/blog/clock.svg";

const BlogCard = () => {
  return (
    <div className={styles.container}>
      <div className={styles.blog_image_container}>
        <Image
          className={styles.blog_image}
          src={MockupPhoto}
          alt="image"
          width={0}
          height={0}
        />
      </div>
      <h2 className={styles.title}>This is going to be the blog title.</h2>
      <p className={styles.description}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna Ut enim ad minim.
      </p>
      <div className={styles.time_of_publication}>
        <Image
          className={styles.clock}
          src={Clock}
          alt={"clock"}
          width={0}
          height={0}
        />
        4 days ago
      </div>
    </div>
  );
};

export default BlogCard;
