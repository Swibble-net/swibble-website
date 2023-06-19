import styles from "@/styles/blog_details.module.scss";
import Image from "next/image";
import MockupPhoto from "@/public/projects_photo/LittleWorld_Image.png";
import Clock from "@/public/blog/clock.svg";
import BlogCard from "@/components/Blog/BlogCard";

const BlogDetails = () => {
  return (
    <>
      <div className={styles.container}>
        <div className={styles.image_container}>
          <Image
            className={styles.image}
            src={MockupPhoto}
            alt="image"
            width={0}
            height={0}
          />
        </div>
        <h1 className={styles.title}>
          Lorem ipsum dolor sit amet, contetur adipiscing elit, sed do eiusmod
          hyus tempor incididunt ut labore
        </h1>
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
        <p className={styles.text}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus id
          velit ac libero pretium vestibulum. Nunc mattis leo at velit pretium
          malesuada. Ut vitae elementum nunc. Aenean nec laoreet eros. Praesent
          eget rutrum est. Nulla a diam viverra, rutrum Maecenas lacus lorem,
          placerat eget laoreet a, congue vitae tortor. Quisque neque nunc,
          consectetur eu interdum non, suscipit sit amet ipsum. Donec molestie
          enim in est fringilla cursus. Ut facilisis neque elementum varius
          consectetur. Praesent quis sem non lorem gravida facilisis.
          <br />
          <br />
          Vestibulum maximus pretium elit, eget ultricies mi tristique sed. Duis
          eget justo vel lectus sollicitudin maximus. et malesuada fames ac
          turpis egestas. Proin viverra, augue in finibus vestibulum, orci velit
          ultricies ex, quis consectetur libero odio non enim. Nullam eget neque
          blandit, luctus lectus quis, fringilla felis. Cras fermentum urna nec
          purus sodales, eget fermentum lacus laoreet. Cras imperdiet, sapien et
          maximus interdum, turpis elit vestibulum lacus, ac consequat rit metus
          neque, ut sagittis justo consectetur a.
          <br />
          <br />
          Praesent ut mi sed metus fringilla porta. Fusce consequat justo vel
          ligula feugiat interdum. Nullam nec est sodales, congue diam ac,
          tempus tellus. Morbi semper felis eget suscipit placerat. Nullam sit
          amet enim finibus purus vestibulum eleifend. In posuere nibh eu
          egestas lobortis. Ut malesuada tortor sit amet elementum viverra.
          Maecenas interdum risus tellus, quis sodales pu
        </p>
      </div>
      <h2 className={styles.related_posts_title}>Related Blogs</h2>
      <div className={styles.related_posts}>
        <BlogCard />
        <BlogCard />
      </div>
    </>
  );
};

export default BlogDetails;
