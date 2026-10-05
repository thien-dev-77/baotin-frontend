import { ArrowRight } from "lucide-react";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  link?: string;
  href?: string;
};

export function SectionHeading({ title, subtitle, link, href = "/search" }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-4">
          <h2 className="text-[17px] font-bold uppercase leading-tight text-primary md:text-[18px]">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[11px] font-medium text-text-secondary md:text-xs">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {link ? (
        <a
          href={href}
          className="hidden shrink-0 items-center gap-1 text-[11px] font-semibold text-blue-brand transition hover:text-blue-hover sm:flex md:text-xs"
        >
          {link}
          <ArrowRight size={15} />
        </a>
      ) : null}
    </div>
  );
}
