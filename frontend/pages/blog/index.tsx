import BlogCard from "@/components/Blog/BlogCard";
import ListOfCategoryItems from "@/components/DropdownFilter/ListOfCategoryItems";
import styles from "@/styles/blog.module.scss";
import Image from "next/image";
import Mailbox from "@/public/blog/mailbox.png";
import { useState } from "react";

const Blog = () => {
  //*handling selectItems state in filter START
  // state variable to manage selected category for article filtering
  const [selectItem, setSelectItem] = useState<string>("");

  // function to update selectItem state based on user selection
  const itemSelection = (item: string): void => {
    setSelectItem(item);
  };

  // declaring list of items, which will be displayed in DropdownList component (category filter)
  const listOfItems = ["vom neusten zu ältesten", "vom ältesten zu neusten"];

  return (
    <div className={styles.container}>
      <div className={styles.banner}>
        <div className={styles.text}>
          <h1>Blog posts</h1>
          <p>
            Aus deinem Unternehmen eine Marke mit Wiedererkennungswert zu
            machen, ist unsere Top Priorität!
          </p>
        </div>
        <div className={styles.mailbox_image}>
          <Image src={Mailbox} alt="maibox" width={227} height={227} />
        </div>
      </div>
      <div className={styles.search_field}>
        <ListOfCategoryItems
          selectItem={selectItem}
          itemSelection={itemSelection}
          listOfItems={listOfItems}
        />
      </div>
      <div className={styles.posts_container}>
        <BlogCard />
        <BlogCard />
        <BlogCard />
        <BlogCard />
      </div>
    </div>
  );
};

export default Blog;
