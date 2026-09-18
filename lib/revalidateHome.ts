import type { NextApiResponse } from "next";

/**
 * The home page is statically generated (ISR). Call this after any CMS change that
 * shows up there (latest posts, video carousel) so visitors see it immediately
 * instead of after the next revalidation window. Never fails the API request.
 */
export async function revalidateHome(res: NextApiResponse): Promise<void> {
  try {
    await res.revalidate("/");
  } catch (error) {
    console.error("[revalidateHome]", error);
  }
}
