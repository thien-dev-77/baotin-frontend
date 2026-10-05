import type { Product } from "@/lib/catalog";

type LockSeed = [code: string, name: string, price: number, material?: string, finish?: string];
type LockGroup = { title: string; caption: string; products: LockSeed[] };

export const lockGroups: LockGroup[] = [
  { title: "Khóa điện tử", caption: "Giải pháp mở cửa hiện đại", products: [
    ["499.21.232", "Khóa điện tử Hafele ALPHA AL2501B", 7884000],
    ["499.21.234", "Khóa điện tử Hafele SEVEN ML2503B", 9521000],
    ["912.21.048", "Khóa điện tử Hafele ML2502B", 11868000],
    ["912.21.046", "Khóa điện tử Hafele MP2503B", 16751000],
    ["499.21.226", "Khóa điện tử Hafele Nova MR2501B", 9504000]
  ] },
  { title: "Khóa cửa", caption: "Đồng bộ cho cửa và không gian sống", products: [
    ["499.63.636", "Bộ khóa tay nắm gạt Hafele DIY Set E", 1512000],
    ["499.63.628", "Bộ khóa tay nắm gạt Hafele DIY Set D", 1512000],
    ["499.63.620", "Bộ khóa tay nắm gạt Hafele DIY Set C", 1512000],
    ["499.63.612", "Bộ khóa tay nắm gạt Hafele DIY Set B", 1512000],
    ["499.63.604", "Bộ khóa tay nắm gạt Hafele DIY Set A", 1512000]
  ] },
  { title: "Khóa tủ", caption: "Hoàn thiện từng cánh tủ", products: [
    ["232.26.621", "Khóa vuông chốt chết Hafele Symo 3000", 62000, "Hợp kim kẽm", "Mạ nicken"],
    ["234.98.611", "Khóa trung tâm Hafele Symo 3000", 46000, "Hợp kim kẽm", "Mạ nicken"],
    ["235.19.211", "Lõi khóa cốp Hafele Econo", 52000, "Hợp kim kẽm", "Crôm bóng"],
    ["210.11.001", "Chìa chủ Hafele Symo 3000", 75000, "Thép", "Mạ nicken"],
    ["235.88.621", "Vỏ khóa cốp Hafele Symo 3000", 62000, "Hợp kim kẽm", "Mạ nicken bóng"]
  ] },
  { title: "Tay nắm cửa", caption: "Tinh tế trong từng chi tiết", products: [
    ["903.92.559", "Tay nắm gạt Hafele có nắp che", 994000],
    ["903.99.368", "Tay nắm gạt Hafele có nắp che PVD", 930000, "Inox 304", "Đen mờ PVD"],
    ["903.98.463", "Tay nắm gạt đế dài Hafele chữ nhật", 1479000, "Inox 304", "Inox mờ"],
    ["903.98.464", "Tay nắm gạt đế dài Hafele chữ nhật dẹt", 2256000, "Inox 304", "Inox mờ"],
    ["903.98.462", "Tay nắm gạt đế dài Hafele", 2085000]
  ] },
  { title: "Phụ kiện cửa", caption: "Phụ kiện đồng bộ cho cửa", products: [
    ["950.45.015", "Thanh chắn bụi tự động Hafele", 936000, "Nhôm, silicone", "Xám"],
    ["489.15.001", "Chốt an toàn Hafele", 236000, "Hợp kim kẽm"],
    ["489.70.230", "Chặn cửa bán nguyệt Hafele", 118000, "Hợp kim kẽm"],
    ["489.70.203", "Chặn cửa nam châm Hafele", 186000, "Hợp kim kẽm"],
    ["489.71.450", "Chốt âm Hafele", 236000]
  ] }
];

// Manufacturer image/price snapshots for UI review; stock and B2B prices remain mock data.
export const lockProducts: Product[] = lockGroups.flatMap((group) => group.products.map(([code, name, price, material, finish]) => {
  const identifier = code.replaceAll(".", "-");
  const image = `/images/locks/${identifier}.jpg`;
  return {
    id: `HF-${code}`, code, slug: `hafele-${identifier}`, name, category: "khoa", subcategory: group.title,
    image, gallery: [image], brand: "Hafele", specification: finish || group.title,
    material: material || "Chưa cập nhật", color: finish || "Theo phiên bản", size: "Theo mã hàng",
    origin: "Theo nhãn sản phẩm", price, unit: "bộ", stock: 40, featured: false
  };
}));
