const Footer = () => (
  <footer className="border-t border-border py-12 px-4 flex items-center justify-center">
    <div className="container max-w-6xl">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">Hack</span>
          <span className="text-xl font-bold text-accent">Select</span>
        </div>
        <div className="flex gap-8 text-sm text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">About</a>
          <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </div>
        <p className="text-sm text-muted-foreground">
          © 2026 DevDraft. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

export default Footer;
