import SEO from "@/components/SEO";

const Blog = () => {
  return (
    <>
      <SEO
        title="Blog – Swibble"
        description="Bleib auf dem Laufenden: Im Swibble-Blog teilen wir Einblicke aus der Welt der Digitalagentur, Tipps zu Design, Entwicklung und mehr. Bald verfügbar!"
        canonical="/blog"
      />
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-xl flex-col items-center justify-center px-4 text-center lg:min-h-[calc(100vh-14rem)]">
        <h1 className="w-full text-3xl font-bold text-[#b718ec] lg:text-5xl">Blog</h1>
        <p className="mt-6 w-full text-lg leading-relaxed text-[#556987]">
          Hier entsteht gerade etwas Neues. Schau bald wieder vorbei – wir freuen uns,
          dir bald spannende Einblicke aus der Swibble-Welt zu zeigen.
        </p>
      </div>
    </>
  );
};

export default Blog;
