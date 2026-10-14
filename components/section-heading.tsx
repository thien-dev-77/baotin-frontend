import { ArrowRight } from "lucide-react";

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  link?: string;
  href?: string;
  align?: "start" | "center";
};

export function SectionHeading({ title, subtitle, link, href = "/search", align = "start" }: SectionHeadingProps) {
  return (
    <div className={`mb-3 flex gap-4 ${align === "center" ? "flex-col items-center text-center" : "items-end justify-between"}`}>
      <div className="min-w-0">
        <div className={`flex ${align === "center" ? "flex-col items-center gap-2" : "flex-wrap items-baseline gap-4"}`}>
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
          className="hidden shrink-0 items-center gap-1 text-[11px] font-semibold text-primary transition hover:text-primary hover:underline decoration-brand underline-offset-4 sm:flex md:text-xs"
        >
          {link}
          <ArrowRight size={15} />
        </a>
      ) : null}
    </div>
  );
}
