import { Cable, CookingPot, DoorOpen, Droplets, Grip, Lightbulb, Package, Rows3, Shirt, Wrench, type LucideIcon } from "lucide-react";

const categoryIcons: Record<string, LucideIcon> = { "phu-kien-bep": CookingPot, "phu-kien-tu-bep": CookingPot, "chau-voi-rua-bat": Droplets, "phu-kien-noi-that": Wrench, "phu-kien-tu-quan-ao": Shirt, "thiet-bi-bep-gia-dung": CookingPot, "led-tu-ke": Lightbulb, "ray-truot": Rows3, "ban-le": DoorOpen, "tay-nam": Grip, khoa: Cable, "phu-kien-tu-ao": Shirt, "phu-kien-lap-dat": Wrench };

export function CategoryIcon({ slug }: { slug: string }) {
  const Icon = categoryIcons[slug] || Package;
  return <Icon size={21} strokeWidth={1.7} aria-hidden="true" className="bt-category-icon" />;
}
