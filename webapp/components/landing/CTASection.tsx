"use client";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight} from "lucide-react";
import Particles from "./Particles"; 
import Link from "next/link";

const CTASection = () => {
  return (
    <section className="py-24 px-4 flex items-center justify-center" id="organizers">
      <div className="container max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="card-elevated p-12 md:p-16 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 animate-pulse-glow" style={{ background: "var(--gradient-glow)" }} />

          <div className="absolute inset-0">
            <Particles
              particleColors={["#ffffff"]}
              particleCount={100}
              particleSpread={10}
              speed={0.3}
              particleBaseSize={50}
             
              alphaParticles
              disableRotation={false}
              pixelRatio={1}
            />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              Ready to Screen Smarter?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
              Join hackathon organizers who are saving hours and building better teams with data-driven selection.
            </p>
            <Link href="/auth/signup">
              <Button variant="hero" size="lg" className="text-base px-10 py-6">
                Start Screening Now <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;