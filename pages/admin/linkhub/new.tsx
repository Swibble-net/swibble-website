import Head from "next/head";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import ProfileEditor from "@/components/linkhub/ProfileEditor";

const NewProfile = () => (
  <>
    <Head>
      <title>Neues Profil – Swibble CMS</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
    <ProfileEditor />
  </>
);

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  return { props: {} };
};

export default NewProfile;
