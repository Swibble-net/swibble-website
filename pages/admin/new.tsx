import type { GetServerSideProps } from "next";
import SEO from "@/components/SEO";
import PostEditor from "@/components/blog/PostEditor";
import { isAuthenticated } from "@/lib/adminAuth";

const NewPost = () => {
  return (
    <>
      <SEO title="Neuer Beitrag – Swibble CMS" canonical="/admin/new" noIndex />
      <PostEditor />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  return { props: {} };
};

export default NewPost;
