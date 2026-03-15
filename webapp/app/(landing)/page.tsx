
import HeroSection from "@/components/landing/HeroSection"
import ProblemSection from "@/components/landing/ProblemSection"
import HowItWorksSection from "@/components/landing/HowItWorksSection"
import FeaturesSection from "@/components/landing/FeaturesSection"
import ForOrganizersSection from "@/components/landing/ForOrganizersSection"
import CTASection from "@/components/landing/CTASection"
import Footer from "@/components/landing/Footer"

export default function Home() {
  return (
    <main className="bg-black text-white ">
      

      <HeroSection />

      <ProblemSection />

      <HowItWorksSection />

      <FeaturesSection />

      <ForOrganizersSection />

      <CTASection />

      <Footer />
    </main>
  )
}