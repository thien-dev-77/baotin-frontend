import {
  BadgeDollarSign,
  Barcode,
  BookOpen,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  HeartHandshake,
  Home,
  ListChecks,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  Wallet,
  Wrench
} from "lucide-react";

export const navItems = [
  "Phụ kiện bếp",
  "LED tủ/kệ",
  "Ray trượt",
  "Bản lề",
  "Tay nắm",
  "Khóa",
  "Phụ kiện tủ áo",
  "Phụ kiện lắp đặt"
];

export const b2bActions = [
  {
    title: "Tìm theo mã hàng",
    href: "/search",
    description: "Nhập mã để tìm nhanh",
    icon: Barcode
  },
  {
    title: "Sản phẩm thường mua",
    href: "/account/products",
    description: "Xem danh sách",
    icon: Boxes
  },
  {
    title: "Đặt lại đơn cũ",
    href: "/account/orders",
    description: "Tạo đơn từ lịch sử",
    icon: RefreshCw
  },
  {
    title: "Xem đơn hàng",
    href: "/account/orders",
    description: "Theo dõi trạng thái",
    icon: ClipboardList
  },
  {
    title: "Xem công nợ",
    href: "/account/credit",
    description: "Kiểm tra hạn mức",
    icon: Wallet
  }
];

export const categories = [
  {
    name: "Phụ kiện bếp",
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=640&q=80"
  },
  {
    name: "LED tủ/kệ",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=640&q=80"
  },
  {
    name: "Ray trượt",
    image:
      "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?auto=format&fit=crop&w=640&q=80"
  },
  {
    name: "Bản lề",
    image:
      "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=640&q=80"
  },
  {
    name: "Tay nắm",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=640&q=80"
  },
  {
    name: "Khóa",
    image:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=640&q=80"
  },
  {
    name: "Phụ kiện tủ áo",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=640&q=80"
  },
  {
    name: "Phụ kiện lắp đặt",
    image:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=640&q=80"
  }
];

export const solutions = [
  {
    title: "Bộ LED tủ bếp",
    href: "/category/led-tu-ke",
    description: "Sáng đẹp, tiết kiệm điện",
    image: "/images/solutions/bo-led-tu-bep.png"
  },
  {
    title: "Bộ phụ kiện tủ bếp",
    href: "/category/phu-kien-bep",
    description: "Đầy đủ, đồng bộ",
    image:
      "/images/catalog/solution-kitchen.png"
  },
  {
    title: "Bộ ray - bản lề",
    href: "/category/ray-truot",
    description: "Êm ái, bền bỉ",
    image:
      "/images/catalog/solution-hinge.png"
  },
  {
    title: "Bộ khóa cửa/cửa tủ",
    href: "/category/khoa",
    description: "An toàn, thẩm mỹ",
    image:
      "/images/catalog/solution-lock.png"
  },
  {
    title: "Phụ kiện hoàn thiện nội thất",
    href: "/category/tay-nam",
    description: "Tạo điểm nhấn cho không gian",
    image:
      "/images/catalog/solution-finish.png"
  }
];

export const products = [
  {
    name: "Bản lề giảm chấn Hafele",
    code: "311.72.501",
    price: "28.000đ",
    unit: "/cái",
    image:
      "https://images.unsplash.com/photo-1596394723269-b2cbca4e6313?auto=format&fit=crop&w=560&q=80",
    promo: true
  },
  {
    name: "LED dây 12V 8W/m",
    code: "LED-12V-8W",
    price: "45.000đ",
    unit: "/m",
    image:
      "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=560&q=80",
    promo: true
  },
  {
    name: "Ray âm giảm chấn 450mm",
    code: "433.02.450",
    price: "120.000đ",
    unit: "/bộ",
    image:
      "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?auto=format&fit=crop&w=560&q=80",
    promo: true
  },
  {
    name: "Rổ kéo đa năng inox 304",
    code: "BT-RK-01",
    price: "850.000đ",
    unit: "/bộ",
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=560&q=80",
    promo: true
  },
  {
    name: "Tay nắm tủ hiện đại",
    code: "TN-201",
    price: "32.000đ",
    unit: "/cái",
    image:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=560&q=80",
    promo: true
  },
  {
    name: "Khóa cửa phân thể",
    code: "KL-101",
    price: "280.000đ",
    unit: "/bộ",
    image:
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=560&q=80",
    promo: true
  },
  {
    name: "Thanh treo tủ áo oval inox",
    code: "TA-OVAL-304",
    price: "68.000đ",
    unit: "/cây",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=560&q=80",
    promo: false
  },
  {
    name: "Piston nâng cánh tủ bếp",
    code: "PT-100N",
    price: "95.000đ",
    unit: "/cái",
    image:
      "https://images.unsplash.com/photo-1604709177225-055f99402ea3?auto=format&fit=crop&w=560&q=80",
    promo: false
  },
  {
    name: "Thùng rác âm tủ đôi",
    code: "TR-AT-02",
    price: "620.000đ",
    unit: "/bộ",
    image:
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=560&q=80",
    promo: true
  },
  {
    name: "Kẹp kính inox hoàn thiện",
    code: "KK-INOX-01",
    price: "42.000đ",
    unit: "/cái",
    image:
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=560&q=80",
    promo: false
  }
];

export const heroSlides = [
  {
    image:
      "/images/hero/kitchen-lighting-hd.jpg",
    href: "/category/phu-kien-bep",
    alt: "Không gian bếp hiện đại với phụ kiện tủ và ánh sáng LED",
    caption: "Giải pháp cho không gian sống tiện ích"
  },
  {
    image:
      "/images/hero/cabinet-lighting-hd.jpg",
    href: "/category/led-tu-ke",
    alt: "Tủ bếp hiện đại với ánh sáng LED dưới chân tủ",
    caption: "Phụ kiện đồng bộ cho tủ bếp hiện đại"
  },
  {
    image:
      "/images/hero/wood-kitchen-hd.jpg",
    href: "/category/phu-kien-lap-dat",
    alt: "Không gian nội thất gỗ sáng với phụ kiện hoàn thiện",
    caption: "Hoàn thiện nội thất gọn đẹp và bền bỉ"
  }
];

export const guides = [
  {
    title: "Chọn bản lề theo loại cánh",
    description: "Cánh phủ bì, cánh lọt lòng...",
    image:
      "https://images.unsplash.com/photo-1596394723269-b2cbca4e6313?auto=format&fit=crop&w=320&q=80"
  },
  {
    title: "Chọn ray theo tải trọng",
    description: "Ray bi, ray âm tải trọng 25-60kg",
    image:
      "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?auto=format&fit=crop&w=320&q=80"
  },
  {
    title: "Chọn LED theo vị trí lắp",
    description: "Tủ bếp, tủ áo, kệ trang trí...",
    image:
      "https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?auto=format&fit=crop&w=320&q=80"
  },
  {
    title: "Chọn phụ kiện bếp theo nhu cầu",
    description: "Rổ kéo, giá bát, thùng rác...",
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=320&q=80"
  }
];

export const processSteps = [
  {
    title: "Chọn sản phẩm",
    description: "Tìm kiếm hoặc duyệt danh mục",
    icon: Search
  },
  {
    title: "Gửi đơn",
    description: "Tự tạo đơn hoặc nhờ tư vấn",
    icon: ShoppingCart
  },
  {
    title: "Inside Sales xác nhận",
    description: "Kiểm tra giá, tồn, công nợ",
    icon: CheckCircle2
  },
  {
    title: "Soạn hàng",
    description: "Kho soạn theo đơn đã xác nhận",
    icon: PackageCheck
  },
  {
    title: "Giao / nhận hàng",
    description: "Nội thành, tại cửa hàng hoặc chành xe",
    icon: Truck
  }
];

export const supportCards = [
  {
    title: "Nhắn Zalo",
    href: "/contact#zalo",
    description: "Tư vấn sản phẩm, báo giá nhanh",
    icon: MessageCircle
  },
  {
    title: "Gọi tư vấn",
    href: "/contact",
    detail: "0901 234 567",
    description: "(8:00 - 17:30)",
    icon: Phone
  },
  {
    title: "Đến cửa hàng",
    href: "/contact#stores",
    description: "123 Đường ABC, TP. Quy Nhơn",
    linkLabel: "Xem bản đồ",
    icon: MapPin
  },
  {
    title: "Tải catalog",
    href: "/catalog",
    description: "Danh mục sản phẩm mới nhất",
    icon: Download
  }
];

export const autocompleteItems = [
  {
    name: "Ray âm giảm chấn 450mm",
    code: "RAY-450-01",
    category: "Ray trượt"
  },
  {
    name: "Bản lề giảm chấn Hafele",
    code: "311.72.501",
    category: "Bản lề"
  },
  {
    name: "LED dây 12V 8W/m",
    code: "LED-12V-8W",
    category: "LED tủ/kệ"
  }
];

export const heroActions = [
  {
    title: "Đăng nhập B2B",
    href: "/login",
    description: "Giá & đặt hàng",
    icon: HeartHandshake,
    primary: true
  },
  {
    title: "Nhận tư vấn",
    href: "/contact#zalo",
    description: "Qua Zalo",
    icon: MessageCircle
  },
  {
    title: "Xem catalog",
    href: "/catalog",
    description: "Tải về PDF",
    icon: BookOpen
  }
];

export const headerActions = [
  { label: "Danh mục", icon: ListChecks },
  { label: "Đăng nhập B2B", icon: Building2 },
  { label: "Giỏ hàng", icon: ShoppingCart, badge: "3" },
  { label: "Giỏ hàng", icon: ShieldCheck }
];

export const footerSocials = [Home, MessageCircle, Sparkles];

export const footerLinks = {
  information: ["Giới thiệu", "Tin tức", "Tuyển dụng", "Liên hệ"],
  policies: [
    "Chính sách giao hàng",
    "Chính sách thanh toán",
    "Chính sách công nợ B2B",
    "Chính sách đổi trả",
    "Điều khoản sử dụng"
  ],
  branches: ["Quy Nhơn (chính)", "Tuy Hòa", "Nha Trang"]
};

export const trustBadges = [
  { label: "Hàng chính hãng", icon: ShieldCheck },
  { label: "Báo giá nhanh", icon: BadgeDollarSign },
  { label: "Hỗ trợ kỹ thuật", icon: Wrench }
];
