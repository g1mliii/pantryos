interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <section className="max-w-3xl">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-lime-400">
        {eyebrow}
      </p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        {title}
      </h1>
      <p className="mt-5 text-lg leading-8 text-stone-300">{description}</p>
    </section>
  );
}
