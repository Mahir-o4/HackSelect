"use client";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="w-[80vw] flex items-center justify-between h-16 px-4 border rounded-2xl border-border/70 bg-background/70 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">Hack</span>
          <span className="text-lg font-bold text-accent">Select</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#how-it-works" onClick={(e) => handleScroll(e, "#how-it-works")} className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#features" onClick={(e) => handleScroll(e, "#features")} className="hover:text-foreground transition-colors">Features</a>
          
          <a href="#organizers" onClick={(e) => handleScroll(e, "#organizers")} className="hover:text-foreground transition-colors">For Organizers</a>
        </div>
        <Button variant="hero" size="sm">Get Started</Button>
      </div>
    </nav>
  );
};

export default Navbar;