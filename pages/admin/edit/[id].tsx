import type { GetServerSideProps } from "next";
import SEO from "@/components/SEO";
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
      <SEO
        title={`${post.title} bearbeiten – Swibble CMS`}
        canonical={`/admin/edit/${post.id}`}
        noIndex
      />
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
