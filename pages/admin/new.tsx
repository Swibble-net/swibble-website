import type { GetServerSideProps } from "next";
import Head from "next/head";
import PostEditor from "@/components/blog/PostEditor";
import { isAuthenticated } from "@/lib/adminAuth";

const NewPost = () => {
  return (
    <>
      <Head>
        <title>Neuer Beitrag – Swibble CMS</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
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
