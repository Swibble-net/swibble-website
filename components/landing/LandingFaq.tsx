import type { LandingFaq as Faq } from "@/lib/landing/types";

interface Props {
  faq: Faq[];
}

// Native <details>: keyboard and screen-reader support come for free, and the
// answers stay in the HTML for crawlers (they mirror the FAQPage JSON-LD).
const LandingFaq = ({ faq }: Props) => (
  <section aria-labelledby="faq" className="mx-auto w-full max-w-3xl py-10 lg:py-16">
    <h2
      id="faq"
      className="mb-8 text-center text-2xl font-bold text-[#000D36] lg:text-4xl"
    >
      Häufige Fragen
    </h2>
    <div className="flex flex-col gap-3">
      {faq.map(({ question, answer }) => (
        <details
          key={question}
          className="group rounded-2xl border border-[#F0E4F5] bg-white open:shadow-sm"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B718EC] [&::-webkit-details-marker]:hidden">
            <h3 className="text-base font-medium text-[#000D36] lg:text-lg">
              {question}
            </h3>
            <span
              aria-hidden
              className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#FDF5FF] text-xl leading-none text-[#8A1FD6] transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
            >
              +
            </span>
          </summary>
          <p className="px-5 pb-5 text-base leading-7 text-[#556987]">{answer}</p>
        </details>
      ))}
    </div>
  </section>
);

export default LandingFaq;
