import { catalog, type Product } from "@/lib/catalog";

export type ProductSpecification = [label: string, value: string];
export type ProductReview = { name: string; stars: number; text: string };

export const initialProductReviews: ProductReview[] = [
  { name: "Minh Anh", stars: 5, text: "Sản phẩm đúng mã, đóng mở êm. Nhân viên tư vấn đúng loại cần dùng." }
];

export function getProductSpecifications(product: Product): ProductSpecification[] {
  return [
    ["Mã hàng", product.code],
    ["Thương hiệu", product.brand],
    ["Chất liệu", product.material],
    ["Kích thước", product.size],
    ["Thông số", product.specification],
    ["Màu sắc", product.color],
    ["Xuất xứ", product.origin],
    ["Bảo hành", "24 tháng"]
  ];
}

export function getProductRecommendations(product: Product) {
  const related = catalog.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);
  const accessories = related.filter((item) => item.subcategory !== product.subcategory);
  const bundle = [product, ...(accessories.length ? accessories : related).slice(0, 3)];
  return { related, bundle };
}
