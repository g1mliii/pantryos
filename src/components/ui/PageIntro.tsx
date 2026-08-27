interface PageIntroProps {
  description?: string;
  eyebrow: string;
  title: string;
}

export function PageIntro({ description, eyebrow, title }: PageIntroProps) {
  return (
    <section className="max-w-2xl">
      <p className="label-caps mb-[18px] text-copper">{eyebrow}</p>
      <h1 className="font-serif text-[52px] leading-[1.1] font-light tracking-[-0.015em] text-pretty">
        {title}
      </h1>
      {description ? (
        <p className="mt-4 text-base leading-7 text-ink-muted">{description}</p>
      ) : null}
    </section>
  );
}
