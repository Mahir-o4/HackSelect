"use client";
import { Button } from "@/components/ui/button";
import ParticlesBackground from "./ParticlesBackground";
import TypeWriter from "./TypeWriter";
import { motion } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import Link from "next/link";

const HeroSection = () => {
  const typingTexts = [
    "Screen Developers Automatically",
    "Find the Best Hackathon Teams",
    "Score Participants Instantly",
  ];
 const scrollToSection = () => {
    const section = document.getElementById("how-it-works")
    section?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ParticlesBackground />
      {/* Glow effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-150 rounded-full animate-pulse-glow" style={{ background: "var(--gradient-glow)" }} />

      <div className="relative z-10 container max-w-4xl text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
         

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-text-primary leading-tight">
            Build Better Hackathons With{" "}
            <span className="text-gradient-primary">Smarter Selection</span>
          </h1>

          <div className="h-8 mb-6">
            <TypeWriter texts={typingTexts} />
          </div>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Automatically evaluate developers using GitHub, LinkedIn, and resume data.
            Score, rank, and shortlist the best teams — in minutes, not days.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">  
            <Button variant="hero" size="lg" className="text-base px-8 py-6" cursor="pointer">
              Start Screening <ArrowRight className="ml-1 w-4 h-4" />
            </Button>
            </Link>
           
            <Button variant="heroOutline" size="lg" className="text-base px-8 py-6" onClick={scrollToSection}>
              <Play className="mr-1 w-4 h-4" /> See How It Works
            </Button>
            
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
