import { KakaoChannelQr } from "@/components/ui/KakaoChannelQr";
import { BenefitGrid } from "@/components/home/BenefitGrid";
import { HeroSection } from "@/components/home/HeroSection";
import { NoticeTicker } from "@/components/home/NoticeTicker";
import { ResourceAndGallery } from "@/components/home/ResourceAndGallery";
import { RoomPreview } from "@/components/home/RoomPreview";
import { WeeklySchedule } from "@/components/home/WeeklySchedule";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <NoticeTicker />
      <WeeklySchedule />
      <BenefitGrid />
      <ResourceAndGallery />
      <RoomPreview />
      <KakaoChannelQr />
    </>
  );
}
