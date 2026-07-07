import Head from "next/head";
import type { GetServerSideProps } from "next";
import { isAuthenticated } from "@/lib/adminAuth";
import { getProfileById } from "@/lib/linkhub/profiles";
import ProfileEditor from "@/components/linkhub/ProfileEditor";
import type { LinkhubProfile } from "@/lib/linkhub/types";

interface Props {
  profile: LinkhubProfile;
}

const EditProfile = ({ profile }: Props) => (
  <>
    <Head>
      <title>{`${profile.name} bearbeiten – Swibble CMS`}</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>
    <ProfileEditor profile={profile} />
  </>
);

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  if (!isAuthenticated(ctx.req)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }

  const id = ctx.params?.id;
  if (typeof id !== "string") return { notFound: true };

  const profile = await getProfileById(id);
  if (!profile) return { notFound: true };

  return { props: { profile } };
};

export default EditProfile;
