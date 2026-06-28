import type { NextApiRequest, NextApiResponse } from "next";
import { requireAdmin } from "@/lib/adminAuth";
import { createPost, getAllPosts } from "@/lib/blog/posts";
import type { BlogPostInput, SortOrder } from "@/lib/blog/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    if (req.method === "GET") {
      const order: SortOrder = req.query.order === "oldest" ? "oldest" : "newest";
      const posts = await getAllPosts(order);
      return res.status(200).json({ posts });
    }

    if (req.method === "POST") {
      if (!requireAdmin(req, res)) return;

      const body = req.body as Partial<BlogPostInput>;
      if (!body?.title?.trim() || !body?.contentHtml?.trim()) {
        return res
          .status(400)
          .json({ message: "Titel und Inhalt sind erforderlich." });
      }

      const post = await createPost({
        title: body.title,
        slug: body.slug,
        excerpt: body.excerpt,
        contentHtml: body.contentHtml,
        coverImage: body.coverImage ?? null,
        author: body.author?.trim() || "Swibble",
        published: body.published,
      });

      return res.status(201).json({ post });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("[/api/posts]", error);
    const message =
      error instanceof Error ? error.message : "Interner Serverfehler";
    return res.status(500).json({ message });
  }
}
