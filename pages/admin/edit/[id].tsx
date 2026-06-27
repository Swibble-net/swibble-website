import type { GetServerSideProps } from "next";
import Head from "next/head";
import PostEditor from "@/components/blog/PostEditor";
import { isAuthenticated } from "@/lib/adminAuth";
import { getPostById } from "@/lib/blog/posts";
import type { BlogPost } from "@/lib/blog/types";

interface Props {
  post: BlogPost;
}

const EditPost = ({ post }: Props) => {
  return (
    <>
      <Head>
        <title>{`${post.title} bearbeiten – Swibble CMS`}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <PostEditor post={post} />
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }

  const id = ctx.params?.id;
  if (typeof id !== "string") {
    return { notFound: true };
  }

  const post = await getPostById(id);
  if (!post) {
    return { notFound: true };
  }

  return { props: { post } };
};

export default EditPost;
