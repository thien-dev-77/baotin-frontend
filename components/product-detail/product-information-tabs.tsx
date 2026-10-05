"use client";

import { ProductReviews } from "@/components/product-detail/product-reviews";
import { Button, Tabs } from "@/components/ui";
import type { Product } from "@/lib/catalog";
import type { ProductReview, ProductSpecification } from "@/lib/product-detail";
import { Download } from "lucide-react";
import Link from "next/link";

const informationTabs = ["Mô tả sản phẩm", "Tài liệu / Hướng dẫn", "Đánh giá", "Câu hỏi thường gặp"];
const frequentlyAskedQuestions = [
  ["Làm sao chọn đúng mã phụ kiện?", "Đối chiếu mã hàng, kích thước và loại tủ. Nhân viên tư vấn sẽ hỗ trợ khi cần."],
  ["Có giá riêng cho xưởng nội thất không?", "Khách hàng B2B đăng nhập để xem giá và chính sách áp dụng cho tài khoản."],
  ["Đơn hàng được xử lý như thế nào?", "Inside Sales xác nhận mã hàng, số lượng, giá và tồn kho trước khi chuyển kho soạn hàng."]
];

type ProductInformationTabsProps = {
  product: Product;
  specifications: ProductSpecification[];
  tab: string;
  onTabChange: (tab: string) => void;
  reviews: ProductReview[];
  onAddReview: (review: ProductReview) => void;
};

export function ProductInformationTabs({ product, specifications, tab, onTabChange, reviews, onAddReview }: ProductInformationTabsProps) {
  return (
    <>
      <div id="product-tabs" className="mt-5 scroll-mt-32">
        <Tabs options={informationTabs} value={tab} onChange={onTabChange} />
      </div>
      <div role="tabpanel" className="border-b border-border py-5">
        {tab === "Mô tả sản phẩm" && <ProductDescription product={product} />}
        {tab === "Tài liệu / Hướng dẫn" && <ProductDocuments code={product.code} specifications={specifications} />}
        {tab === "Đánh giá" && <ProductReviews reviews={reviews} onAddReview={onAddReview} />}
        {tab === "Câu hỏi thường gặp" && <ProductFaq />}
      </div>
    </>
  );
}

function ProductDescription({ product }: { product: Product }) {
  return (
    <>
      <h2 className="text-base font-bold text-primary">{product.name}</h2>
      <p className="mt-3 text-sm leading-7 text-text-secondary">
        {product.name} được lựa chọn để hoàn thiện hệ nội thất đồng bộ. Chất liệu {product.material.toLowerCase()} và thiết kế phù hợp cho nhu cầu sử dụng hàng ngày.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-text-secondary">
        <li>Thông số: {product.specification}.</li>
        <li>Chất liệu bền bỉ, dễ vệ sinh và bảo dưỡng.</li>
        <li>Kiểm tra kích thước lắp đặt trước khi đặt hàng.</li>
        <li>Inside Sales hỗ trợ đối chiếu mã hàng và tư vấn phụ kiện phù hợp.</li>
      </ul>
    </>
  );
}

function ProductDocuments({ code, specifications }: { code: string; specifications: ProductSpecification[] }) {
  const downloadSpecifications = () => {
    const rows = [["Thông số", "Giá trị"], ...specifications];
    const csv = "\ufeff" + rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${code}-thong-so.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <Button variant="secondary" onClick={downloadSpecifications}><Download size={17} />Tải bảng thông số</Button>
      <Link href="/guides" className="block text-sm text-blue-brand">Xem hướng dẫn chọn và lắp phụ kiện →</Link>
      <p className="text-sm text-text-secondary">Liên hệ Bảo Tín để nhận tài liệu lắp đặt của nhà sản xuất theo đúng mã hàng.</p>
    </div>
  );
}

function ProductFaq() {
  return (
    <div className="space-y-3">
      {frequentlyAskedQuestions.map(([question, answer]) => (
        <details key={question} className="border-b border-border pb-3">
          <summary className="text-sm font-semibold text-primary">{question}</summary>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{answer}</p>
        </details>
      ))}
    </div>
  );
}
