import type { StaticImageData } from "next/image";
import AquisImage from "@/public/projects_photo/Aquis_Image.webp";
import OlympiaImage from "@/public/projects_photo/Olympia_Image.webp";
import BillstedtImage from "@/public/projects_photo/Billstedt_Image.webp";
import MyZeilImage from "@/public/projects_photo/Myzeil_Image.webp";
import RushfoodImage from "@/public/projects_photo/Rushfood_Image.webp";
import LittleWorldImage from "@/public/projects_photo/LittleWorld_Image.webp";
import AachenAppImage from "@/public/projects_photo/AachenApp_Image.webp";
import RydeUpImage from "@/public/projects_photo/RydeUp_Image.webp";
import SquareImage from "@/public/projects_photo/Square_Image.webp";
import KonratsWeltImage from "@/public/projects_photo/KonratsWelt_Image.webp";
import FynnImage from "@/public/Landing_Page_Fynn_Frings.webp";
import type { LandingImageKey } from "@/lib/landing/types";

// Content files reference images by key so they stay plain data (testable in Node).
export const LANDING_IMAGES: Record<LandingImageKey, StaticImageData> = {
  aquis: AquisImage,
  olympia: OlympiaImage,
  billstedt: BillstedtImage,
  myzeil: MyZeilImage,
  rushfood: RushfoodImage,
  littleWorld: LittleWorldImage,
  aachenApp: AachenAppImage,
  rydeUp: RydeUpImage,
  square: SquareImage,
  konratsWelt: KonratsWeltImage,
  fynn: FynnImage,
};
