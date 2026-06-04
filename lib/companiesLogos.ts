import type { StaticImageData } from "next/image";
import AachenLogo from "@/public/companies_logos/aachen.png";
import AquisPlazaLogo from "@/public/companies_logos/aquis_plaza_logo.png";
import BillstedtCenterLogo from "@/public/companies_logos/billstedt_center_logo.png";
import KellerLogo from "@/public/companies_logos/keller.png";
import MontisMedicalLogo from "@/public/companies_logos/montis_medical_logo.png";
import OlympiaLogo from "@/public/companies_logos/olympia_einkaufszentrum_logo.png";
import RushfoodLogo from "@/public/companies_logos/rushfood_logo.png";
import RydeLogo from "@/public/companies_logos/ryde.png";
import SquareLogo from "@/public/companies_logos/square.svg";
import WorldLogo from "@/public/companies_logos/world.png";

export type CompanyLogo = {
  src: StaticImageData | string;
  alt: string;
};

export const companyLogos: CompanyLogo[] = [
  { src: AachenLogo, alt: "Aachen App" },
  { src: AquisPlazaLogo, alt: "Aquis Plaza" },
  { src: BillstedtCenterLogo, alt: "Billstedt Center" },
  { src: KellerLogo, alt: "Keller" },
  { src: MontisMedicalLogo, alt: "Montis Medical" },
  { src: OlympiaLogo, alt: "Olympia Einkaufszentrum" },
  { src: RushfoodLogo, alt: "Rushfood" },
  { src: RydeLogo, alt: "RydeUp" },
  { src: SquareLogo, alt: "Square" },
  { src: WorldLogo, alt: "Little World" },
];
