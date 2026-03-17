
import HeroSection from "@/components/landing/HeroSection"
import ProblemSection from "@/components/landing/ProblemSection"
import HowItWorksSection from "@/components/landing/HowItWorksSection"
import FeaturesSection from "@/components/landing/FeaturesSection"
import ForOrganizersSection from "@/components/landing/ForOrganizersSection"
import CTASection from "@/components/landing/CTASection"
import Footer from "@/components/landing/Footer"
import Navbar from "@/components/layout/Navbar"

export default function Home() {
  return (
    <main className="bg-black text-white ">
      <Navbar type="secondary" 
      navs={[
        { label: "How It Works", href: "#how-it-works" },
        { label: "Features", href: "#features" },
        { label: "For Organizers", href: "#organizers" }
      ]}
      link={{ label: "Get Started", href: "/auth/signin" }}></Navbar>

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