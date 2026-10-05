import { HeroVisual } from "@/components/hero-visual";
import { HomeCategorySidebar } from "@/components/home-category-sidebar";
import { ProductShowcase } from "@/components/product-showcase";
import { CategoryProductSection } from "@/components/category-product-section";
import { SectionHeading } from "@/components/section-heading";
import {
  b2bActions,
  processSteps,
  solutions,
  supportCards
} from "@/lib/home-data";
import { ArrowRight, MessageCircle } from "lucide-react";
import { categoryCatalog as categories, guideCatalog as guides } from "@/lib/catalog";
import Link from "next/link";
import { lockGroups, lockProducts } from "@/lib/lock-catalog";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <h1 className="sr-only">Bảo Tín - Phụ kiện nội thất chính hãng</h1>
      <HeroSection />
      <B2BQuickActions />
      <CategorySection />
      <SolutionSection />
      <ProductShowcase />
      <LockCategorySections />
      <BuyingGuides />
      <OrderProcess />
      <SupportSection />
    </main>
  );
}

function HeroSection() {
  return (
    <section className="bt-container bt-home-hero-layout" aria-label="Khám phá sản phẩm">
      <HomeCategorySidebar />
      <HeroVisual />
    </section>
  );
}

function B2BQuickActions() {
  return (
    <section className="bt-container mt-4">
      <SectionHeading
        title="Dành cho khách B2B"
        subtitle="Tìm hàng nhanh, đặt lại đơn, xem công nợ và quản lý đơn hàng"
      />
      <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {b2bActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link href={action.href}
              key={action.title}
              className="group flex h-[60px] min-w-[190px] items-center justify-between rounded-lg border border-border bg-[#f8fafd] px-3 py-2 text-left shadow-card transition hover:-translate-y-0.5 hover:border-[#bbd5f0] hover:bg-section-blue hover:shadow-card-hover lg:min-w-0"
            >
              <span className="flex items-center gap-2.5">
                <Icon className="text-blue-brand" size={22} strokeWidth={1.8} />
                <span>
                  <span className="block text-xs font-bold text-primary">
                    {action.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-text-muted">
                    {action.description}
                  </span>
                </span>
              </span>
              <ArrowRight
                size={17}
                className="text-blue-brand transition group-hover:translate-x-1"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function CategorySection() {
  return (
    <section className="bt-container mt-5">
      <SectionHeading title="Danh mục sản phẩm chính" link="Xem tất cả danh mục" />
      <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-4 lg:grid-cols-8">
        {categories.map((category) => (
          <a
            key={category.name}
            href={`/category/${category.slug}`}
            className="group w-[126px] shrink-0 overflow-hidden rounded-lg border border-border bg-white shadow-card transition hover:-translate-y-0.5 hover:border-[#bbd5f0] hover:shadow-card-hover md:w-auto"
          >
              <div className="aspect-[1.35/1] overflow-hidden bg-section">
              <img
                src={category.image}
                alt={category.name}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
              />
            </div>
            <div className="flex h-8 items-center justify-center px-1 text-center text-[11px] font-bold text-primary md:text-xs">
              {category.name}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section className="mt-5 bg-section py-4">
      <div className="bt-container">
        <SectionHeading
          title="Bộ giải pháp cho B2C"
          subtitle="Gợi ý theo nhu cầu, dễ hiểu, dễ chọn"
          link="Xem tất cả giải pháp"
        />
        <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {solutions.map((solution) => (
            <a
              href={solution.href}
              key={solution.title}
              className="group min-w-[220px] overflow-hidden rounded-lg border border-border bg-white shadow-card transition hover:-translate-y-0.5 hover:border-[#bbd5f0] hover:shadow-card-hover lg:min-w-0"
            >
              <div className="aspect-[16/7] overflow-hidden bg-section-blue">
                <img
                  src={solution.image}
                  alt={solution.title}
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5">
                <div>
                  <h3 className="text-xs font-bold text-primary md:text-[13px]">{solution.title}</h3>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    {solution.description}
                  </p>
                </div>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-section-blue text-blue-brand transition group-hover:bg-blue-brand group-hover:text-white">
                  <ArrowRight size={14} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function LockCategorySections() {
  return lockGroups.map((group) => (
    <CategoryProductSection
      key={group.title}
      title={group.title}
      caption={group.caption}
      href={`/category/khoa?subcategory=${encodeURIComponent(group.title)}`}
      products={lockProducts.filter((product) => product.subcategory === group.title)}
    />
  ));
}

function BuyingGuides() {
  return (
    <section className="bt-container mt-5">
      <SectionHeading
        title="Hướng dẫn chọn nhanh"
        subtitle="Chọn đúng sản phẩm cho nhu cầu của bạn"
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
        {guides.map((guide) => (
          <a
            key={guide.title}
            href={`/guides/${guide.slug}`}
            className="flex h-[82px] items-center gap-2.5 rounded-lg border border-border bg-[#f8fafd] p-2 shadow-card transition hover:-translate-y-0.5 hover:border-[#bbd5f0] hover:shadow-card-hover"
          >
            <img
              src={guide.image}
              alt={guide.title}
              className="h-[62px] w-[62px] shrink-0 rounded-md object-cover"
            />
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-xs font-bold text-primary">{guide.title}</h3>
              <p className="mt-1 line-clamp-2 text-[10px] text-text-secondary">
                {guide.description}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-blue-brand">
                Xem hướng dẫn
                <ArrowRight size={13} />
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function OrderProcess() {
  return (
    <section className="bt-container mt-6">
      <div>
        <SectionHeading
          title="Quy trình đặt hàng"
          subtitle="Đơn giản, rõ ràng, thống nhất cho cả B2B và B2C"
        />
        <div className="mt-5 grid gap-5 lg:grid-cols-5 lg:gap-6">
          {processSteps.map((step, index) => {
            return (
              <div key={step.title} className="relative flex items-start gap-3">
                {index < processSteps.length - 1 ? (
                  <ArrowRight
                    size={18}
                    strokeWidth={1.5}
                    aria-hidden="true"
                    className="absolute -right-5 top-3 hidden text-[#d1dce8] lg:block"
                  />
                ) : null}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-brand text-base font-semibold text-white">
                  {index + 1}
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-xs font-bold leading-[18px] text-primary xl:text-[13px]">{step.title}</h3>
                  <p className="mt-1 text-[11px] leading-[17px] text-text-secondary xl:text-xs">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SupportSection() {
  return (
    <section className="bt-container mt-7 pb-5">
      <SectionHeading title="Hỗ trợ nhanh" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {supportCards.map((card) => {
          const Icon = card.icon;
          return (
            <a
              key={card.title}
              href={card.href}
              className="flex min-h-[88px] items-center gap-3.5 rounded-lg border border-border bg-white px-3.5 py-3 transition hover:border-[#bbd5f0] hover:bg-section-blue"
            >
              {card.title === "Nhắn Zalo" ? (
                <span aria-hidden="true" className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-brand">
                  <MessageCircle size={30} strokeWidth={1.5} className="fill-white text-white" />
                  <span className="absolute top-2.5 text-[9px] font-bold leading-none text-blue-brand">Zalo</span>
                </span>
              ) : (
                <Icon aria-hidden="true" className="shrink-0 text-blue-brand" size={32} strokeWidth={2.5} />
              )}
              <span className="min-w-0">
                <span className="block text-[13px] font-bold leading-[18px] text-primary">{card.title}</span>
                {card.detail ? <span className="mt-1 block text-[13px] font-bold leading-[18px] text-primary">{card.detail}</span> : null}
                <span className="mt-0.5 block text-xs leading-[18px] text-text-secondary">
                  {card.description}
                </span>
                {card.linkLabel ? <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-brand">{card.linkLabel}<ArrowRight size={14} /></span> : null}
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
