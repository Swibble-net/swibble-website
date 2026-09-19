// Importing necessary React components
import ContactFunnel from "@/components/contact/ContactFunnel";
import { EMAIL, PHONE_DISPLAY, PHONE_TEL } from "@/lib/cta";
import { MdOutlineEmail, MdOutlineLocationOn, MdOutlinePhone } from "react-icons/md";

// Defining the main component
const ContactForm = () => {
	// Rendering the component
	return (
		<>
			<section id="kontakt" className="scroll-mt-28 lg:scroll-mt-32 w-full flex flex-col gap-y-5 lg:flex-row lg:justify-between lg:items-center lg:gap-x-24">
				{/* Displaying address and contact information */}
				<div className="flex flex-col gap-y-5 w-full lg:w-7/12 lg:gap-y-12">
					<div className="text-[#000D36]">
						<h2 className="font-bold text-2xl mb-5 lg:text-5xl">Let&apos;s stay connected</h2>
						<p className="text-base font-normal lg:text-xl">Erfahre in deinem ganz persönlichen Erstgespräch, wie Swibble deinem Unternehmen weiterhelfen kann.</p>
					</div>

					{/* Displaying contact information */}
					<div className="flex flex-col gap-8 w-full">
						{/* Displaying address and email information */}
						<div className="w-full flex flex-row flex-wrap gap-x-10 gap-y-4 items-start">
							<div className="relative pl-8">
								<MdOutlineLocationOn className="absolute left-0 top-0 h-6 w-6 text-[#B718EC]" aria-hidden />
								<h3 className="font-bold text-base text-[#2A3342]">Anschrift</h3>
								<p className="text-sm text-[#556987]">
									Königstraße 30, <br />
									52064 Aachen
								</p>
							</div>
							<div className="relative pl-8">
								<MdOutlineEmail className="absolute left-0 top-0 h-6 w-6 text-[#B718EC]" aria-hidden />
								<h3 className="font-bold text-base text-[#2A3342]">E-Mail</h3>
								<p className="text-sm text-[#556987]">
									<a href={`mailto:${EMAIL}`}>{EMAIL}</a>
								</p>
							</div>
							<div className="relative pl-8">
								<MdOutlinePhone className="absolute left-0 top-0 h-6 w-6 text-[#B718EC]" aria-hidden />
								<h3 className="font-bold text-base text-[#2A3342]">Telefon</h3>
								<p className="text-sm text-[#556987] whitespace-nowrap">
									<a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Multi-step inquiry form (services → goal → contact details → thank you) */}
				<ContactFunnel />
			</section>
		</>
	);
};

export default ContactForm;
