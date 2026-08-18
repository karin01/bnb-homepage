type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  compact?: boolean;
};

export function PageHero({ eyebrow, title, description, compact = false }: PageHeroProps) {
  return (
    <section className="hero-glow border-b border-[var(--line)]">
      <div className={`mx-auto max-w-6xl px-5 ${compact ? "py-8 md:py-10" : "py-16 md:py-20"}`}>
        <p className="font-mono text-xs tracking-[0.24em] text-cyan-600 uppercase dark:text-cyan-glow">
          {eyebrow}
        </p>
        <h1 className={`mt-3 max-w-3xl font-semibold tracking-tight ${compact ? "text-2xl md:text-3xl" : "text-3xl md:text-5xl"}`}>
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)] md:text-base">{description}</p>
      </div>
    </section>
  );
}
