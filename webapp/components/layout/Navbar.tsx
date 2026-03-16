"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface NavLink {
  label: string;
  href: string;
}

interface NavbarProps {
  type?: "default" | "secondary";
  navs?: NavLink[];
  link?: string;
}

const Navbar = ({ type = "default", navs = [], link = "/get-started" }: NavbarProps) => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50">
      <div className="w-[80vw] flex items-center justify-between h-16 px-4 border rounded-2xl border-border/70 bg-background/70 backdrop-blur-sm">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-foreground">Hack</span>
          <span className="text-lg font-bold text-accent">Select</span>
        </div>

        {/* Links — only rendered in secondary mode */}
        {type === "secondary" && navs.length > 0 && (
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            {navs.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={(e) => handleScroll(e, href)}
                className="hover:text-foreground transition-colors"
              >
                {label}
              </a>
            ))}
          </div>
        )}

        {/* CTA Button */}
        <Link href={link}>
          <Button variant="hero" size="sm">Get Started</Button>
        </Link>

      </div>
    </nav>
  );
};

export default Navbar;