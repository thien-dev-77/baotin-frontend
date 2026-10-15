export const MAX_VARIANT_COPY_TARGETS = 500;
export const productVariantCopyFields = [
  { key: "name", label: "Tên sản phẩm", defaultSelected: true },
  { key: "shortDescription", label: "Nội dung ngắn", defaultSelected: true },
  { key: "description", label: "Mô tả chi tiết", defaultSelected: true },
  { key: "usageGuide", label: "Hướng dẫn sử dụng", defaultSelected: true },
  { key: "warranty", label: "Bảo hành", defaultSelected: true },
  { key: "technicalDetails", label: "Thông số kỹ thuật", defaultSelected: false },
  { key: "gallery", label: "Hình ảnh", defaultSelected: false },
  { key: "material", label: "Chất liệu", defaultSelected: false },
  { key: "origin", label: "Xuất xứ", defaultSelected: false },
] as const;
export type ProductVariantCopyField = typeof productVariantCopyFields[number]["key"];
