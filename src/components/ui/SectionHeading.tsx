import Link from "next/link";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  actionLabel?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  actionLabel,
}: SectionHeadingProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="font-mono text-xs tracking-[0.22em] text-cyan-600 uppercase dark:text-cyan-glow">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{description}</p> : null}
      </div>
      {href && actionLabel ? (
        <Link
          href={href}
          className="text-sm font-medium text-cyan-700 underline-offset-4 hover:underline dark:text-cyan-glow"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
