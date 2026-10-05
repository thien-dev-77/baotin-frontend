import { products as homeProducts } from "@/lib/home-data";
import { lockGroups, lockProducts } from "@/lib/lock-catalog";
import type { Category, Product, Customer, Order, OrderStatus } from "../shared/types";
export type { Category, Product, Customer, CartLine, OrderStatus, Order } from "../shared/types";
import { priceFor as previewPrice } from "../shared/pricing";
export const priceFor = (product: Product, customer: Customer | null) => process.env.NEXT_PUBLIC_API_MODE === "true" ? (customer?.status === "active" ? product.customerPrice ?? product.price : product.price) : previewPrice(product, customer);


export const categoryCatalog: Category[] = [
  { slug: "phu-kien-bep", name: "Phụ kiện bếp", image: "/images/catalog/kitchen-storage-hd.jpg", description: "Phụ kiện tủ bếp chính hãng, tối ưu lưu trữ và thuận tiện trong từng thao tác.", subcategories: ["Giá bát nâng hạ", "Giá xoong nồi", "Thùng rác âm tủ", "Kệ gia vị", "Kệ góc", "Phụ kiện tủ bếp"] },
  { slug: "led-tu-ke", name: "LED tủ/kệ", image: "/images/hero/kitchen-lighting-hd.jpg", description: "Ánh sáng đồng bộ cho tủ bếp, tủ áo và kệ trang trí.", subcategories: ["LED dây", "Thanh nhôm LED", "Nguồn LED", "Cảm biến"] },
  { slug: "ray-truot", name: "Ray trượt", image: "/images/catalog/drawer-undermount-hd.jpg", description: "Ray trượt bền bỉ, vận hành êm và phù hợp nhiều tải trọng.", subcategories: ["Ray âm", "Ray bi", "Ray giảm chấn"] },
  { slug: "ban-le", name: "Bản lề", image: "/images/catalog/hinge-hd.jpg", description: "Bản lề chính hãng cho cánh tủ đóng mở nhẹ nhàng, chính xác.", subcategories: ["Bản lề giảm chấn", "Bản lề bật", "Phụ kiện bản lề"] },
  { slug: "tay-nam", name: "Tay nắm", image: "/images/catalog/handle-installed-hd.jpg", description: "Tay nắm và núm tủ hoàn thiện từng chi tiết nội thất.", subcategories: ["Tay nắm thanh", "Núm tủ", "Tay nắm âm"] },
  { slug: "khoa", name: "Khóa", image: "/images/locks/499-21-226.jpg", description: "Giải pháp khóa cho cửa, tủ và không gian sống.", subcategories: ["Khóa cửa", "Khóa tủ", "Khóa điện tử", ...lockGroups.map((group) => group.title).filter((title) => !["Khóa cửa", "Khóa tủ", "Khóa điện tử"].includes(title))] },
  { slug: "phu-kien-tu-ao", name: "Phụ kiện tủ áo", image: "/images/catalog/wardrobe-hd.jpg", description: "Sắp xếp trang phục gọn gàng với phụ kiện tủ áo đồng bộ.", subcategories: ["Thanh treo", "Giá treo quần", "Kệ giày"] },
  { slug: "phu-kien-lap-dat", name: "Phụ kiện lắp đặt", image: "/images/catalog/hardware-hd.jpg", description: "Vật tư và phụ kiện lắp đặt cho xưởng nội thất, công trình.", subcategories: ["Vít và liên kết", "Ke góc", "Kẹp kính"] }
];

export const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
export const slugify = (value: string) => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
export const discountFor = (subtotal: number, coupon: string) => coupon === "BAOTIN10" ? Math.min(100000, Math.round(subtotal * 0.1)) : 0;

const prices = [28000, 45000, 120000, 850000, 32000, 280000, 68000, 95000, 620000, 42000];
const categoryIds = [3, 1, 2, 0, 4, 5, 6, 0, 0, 7];
const subcategoryIds = [0, 0, 0, 5, 0, 0, 0, 5, 2, 2];
const materials = ["Thép mạ nickel", "Nhôm", "Thép", "Inox 304", "Hợp kim", "Hợp kim", "Inox 304", "Thép", "Nhựa ABS", "Inox 304"];

const productImages: Record<string, string> = {
  "LED-12V-8W": "/images/catalog/led-strip-hd.jpg",
  "433.02.450": "/images/catalog/drawer-undermount-hd.jpg",
  "BT-RK-01": "/images/catalog/pull-out-basket-hd.jpg",
  "TN-201": "/images/catalog/handle-brass-hd.jpg"
};

const originals: Product[] = homeProducts.map((item, index) => {
  const category = categoryCatalog[categoryIds[index]];
  const image = productImages[item.code] || (index === 0 ? "/images/catalog/hinge-detail.png" : category.image);
  return {
    id: item.code, slug: slugify(item.name), name: item.name, code: item.code, category: category.slug,
    subcategory: category.subcategories[subcategoryIds[index]], image, gallery: image === category.image ? [image] : [image, category.image],
    brand: index % 3 === 0 ? "Hafele" : index % 3 === 1 ? "Bảo Tín" : "Hettich",
    specification: ["Giảm chấn · Mở 110°", "12V · Ánh sáng vàng", "450mm · Tải trọng 35kg", "Inox 304 · Tủ 600mm", "Khoảng cách lỗ 128mm", "Màu đen · Cửa gỗ", "Oval · Dài 1m", "100N · Lắp hai bên", "20L · Hai ngăn", "Kính 8–12mm"][index],
    material: materials[index], color: index === 4 ? "Vàng" : index === 5 ? "Đen" : "Bạc",
    size: index === 2 ? "450mm" : index === 3 ? "600mm" : "Tiêu chuẩn",
    origin: index % 3 === 0 ? "Đức" : "Việt Nam", price: prices[index],
    oldPrice: item.promo ? Math.round(prices[index] * 1.25 / 1000) * 1000 : undefined,
    unit: item.unit.replace("/", ""), stock: index === 9 ? 0 : 100 + index * 37, featured: index < 6
  };
});

const extras: [string, number, number, string][] = [
  ["Giá bát nâng hạ inox 304", 0, 2450000, "Giá bát nâng hạ"], ["Giá xoong nồi 2 tầng 600mm", 0, 1280000, "Giá xoong nồi"],
  ["Kệ gia vị inox 304 300mm", 0, 750000, "Kệ gia vị"], ["Kệ góc liên hoàn 4 rổ", 0, 3450000, "Kệ góc"],
  ["Giá bát cố định 800mm", 0, 980000, "Phụ kiện tủ bếp"], ["Thùng rác âm tủ 30L", 0, 890000, "Thùng rác âm tủ"],
  ["Kệ gia vị 200mm giảm chấn", 0, 620000, "Kệ gia vị"], ["Giá xoong nồi 800mm", 0, 1580000, "Giá xoong nồi"],
  ["Giá bát nâng hạ 900mm", 0, 2890000, "Giá bát nâng hạ"], ["Kệ góc xoay 270°", 0, 1990000, "Kệ góc"],
  ["Rổ kéo đa năng 800mm", 0, 1150000, "Phụ kiện tủ bếp"], ["Khay chia ngăn kéo", 0, 185000, "Phụ kiện tủ bếp"],
  ["Ray âm giảm chấn 500mm", 2, 135000, "Ray âm"], ["Ray bi 3 tầng 450mm", 2, 85000, "Ray bi"],
  ["Ray âm giảm chấn 350mm", 2, 110000, "Ray âm"], ["Ray giảm chấn 400mm", 2, 115000, "Ray giảm chấn"],
  ["Bản lề giảm chấn Hafele 311.72.502", 3, 32000, "Bản lề giảm chấn"], ["Đế bản lề Hafele", 3, 12000, "Phụ kiện bản lề"],
  ["Nắp che bản lề", 3, 8000, "Phụ kiện bản lề"], ["Vít bắt bản lề", 3, 2000, "Phụ kiện bản lề"],
  ["Thanh nhôm LED âm 1m", 1, 65000, "Thanh nhôm LED"], ["Nguồn LED 12V 60W", 1, 185000, "Nguồn LED"],
  ["Cảm biến LED mở cửa", 1, 95000, "Cảm biến"], ["Tay nắm thanh đen 160mm", 4, 45000, "Tay nắm thanh"],
  ["Núm tủ hợp kim tròn", 4, 25000, "Núm tủ"], ["Khóa tủ Hafele", 5, 65000, "Khóa tủ"],
  ["Giá treo quần 9 thanh", 6, 580000, "Giá treo quần"], ["Ke góc inox 40mm", 7, 9000, "Ke góc"]
];

export const catalog: Product[] = [...originals, ...extras.map(([name, categoryIndex, price, subcategory], index): Product => {
  const base = originals.find((p) => p.category === categoryCatalog[categoryIndex].slug)!;
  const size = name.match(/\d+(?:mm|m|L)\b/)?.[0] || base.size;
  const partImages: Record<number, string> = { 17: "/images/catalog/hinge-plate.png", 18: "/images/catalog/hinge-cap.png", 19: "/images/catalog/hinge-screws.png" };
  const specifications: Record<number, string> = { 17: "Đế lắp bản lề · Thép mạ nickel", 18: "Phụ kiện hoàn thiện bản lề", 19: "Vít lắp bản lề · Mạ kẽm", 20: "Thanh nhôm âm · Dài 1m", 21: "12V · Công suất 60W", 22: "Cảm biến mở cửa · 12V" };
  const image = partImages[index] || base.image;
  return { ...base, id: `BT-${String(index + 101)}`, code: `BT-${String(index + 101)}`, slug: slugify(name), name, price,
    image, gallery: partImages[index] ? [image] : base.gallery,
    size, specification: specifications[index] || base.specification.replace(base.size, size),
    unit: [21, 22].includes(index) ? "cái" : index === 20 ? "thanh" : base.unit,
    subcategory, brand: name.includes("Hafele") ? "Hafele" : index % 3 === 0 ? "Hafele" : index % 3 === 1 ? "Bảo Tín" : "Hettich",
    oldPrice: index % 3 === 0 ? Math.round(price * 1.2 / 1000) * 1000 : undefined,
    featured: false, stock: 35 + index * 5
  };
}), ...lockProducts];

export const findProduct = (id: string) => catalog.find((p) => p.id === id || p.slug === id);
export const findCategory = (slug: string) => categoryCatalog.find((c) => c.slug === slug);
export const brands = ["Hafele", "Hettich", "Bảo Tín"];

export const guideCatalog = [
  { slug: "chon-ban-le-theo-loai-canh", title: "Chọn bản lề theo loại cánh", description: "Phân biệt cánh phủ bì, nửa phủ và lọt lòng để chọn đúng bản lề.", image: "/images/catalog/hinge.png", category: "ban-le", minutes: 5 },
  { slug: "chon-ray-theo-tai-trong", title: "Chọn ray theo tải trọng", description: "So sánh ray bi, ray âm và tải trọng phù hợp từng ngăn kéo.", image: "/images/catalog/drawer.png", category: "ray-truot", minutes: 6 },
  { slug: "chon-led-theo-vi-tri-lap", title: "Chọn LED theo vị trí lắp", description: "Ánh sáng, nguồn điện và cảm biến cho tủ bếp, tủ áo, kệ trang trí.", image: "/images/solutions/bo-led-tu-bep.png", category: "led-tu-ke", minutes: 4 },
  { slug: "chon-phu-kien-bep", title: "Chọn phụ kiện bếp theo nhu cầu", description: "Sắp xếp tủ bếp gọn gàng với giá bát, kệ gia vị và rổ kéo.", image: "/images/catalog/kitchen.png", category: "phu-kien-bep", minutes: 7 }
];

export function mockOrders(customerId: string): Order[] {
  return ["Đang giao", "Chờ xác nhận", "Đã giao", "Đã giao", "Đang xử lý"].map((status, index) => {
    const product = catalog[index];
    const subtotal = product.price * (index + 2);
    return { id: `DH202609${String(28 - index).padStart(2, "0")}00${index + 1}`, customerId, date: `2026-09-${28 - index}T09:00:00+07:00`, status: status as OrderStatus,
      b2b: true, items: [{ productId: product.id, quantity: index + 2, unitPrice: product.price }], subtotal, shipping: 30000, discount: 0, total: subtotal + 30000,
      customer: { name: "Nguyễn Minh Anh", phone: "0901 234 567", email: "minhanh@example.com", address: "123 Đường ABC", city: "Bình Định", district: "Quy Nhơn", ward: "Trần Phú" },
      delivery: "Giao nội thành", payment: "Chuyển khoản ngân hàng", note: "Liên hệ trước khi giao hàng."
    };
  });
}
