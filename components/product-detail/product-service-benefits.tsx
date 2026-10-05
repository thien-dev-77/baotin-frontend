import { RotateCcw, ShieldCheck, Truck, Wrench } from "lucide-react";

const benefits = [
  { icon: ShieldCheck, title: "Hàng chính hãng 100%", description: "Đầy đủ CO, CQ" },
  { icon: Truck, title: "Giao hàng toàn quốc", description: "Giao nội thành, nhận tại cửa hàng, chành xe" },
  { icon: RotateCcw, title: "Đổi trả dễ dàng", description: "Theo chính sách công ty" },
  { icon: Wrench, title: "Hỗ trợ lắp đặt / tư vấn", description: "Liên hệ qua Zalo hoặc hotline" }
];

export function ProductServiceBenefits() {
  return (
    <div className="mt-4 space-y-3 border-t border-border pt-4">
      {benefits.map(({ icon: Icon, title, description }) => (
        <div key={title} className="flex gap-3">
          <Icon size={22} className="shrink-0 text-blue-brand" />
          <div>
            <strong className="text-xs text-primary">{title}</strong>
            <p className="mt-0.5 text-xs leading-4 text-text-secondary">{description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
