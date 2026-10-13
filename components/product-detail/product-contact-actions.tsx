import { storeContact } from "@/lib/store-contact";
import { PhoneCall } from "lucide-react";

export function ProductContactActions() {
  return (
    <div className="bt-product-contact-actions" role="group" aria-label="Liên hệ tư vấn sản phẩm">
      <a href={storeContact.zaloHref} target="_blank" rel="noopener noreferrer" title={`Chat Zalo: ${storeContact.displayPhone}`}>
        <span className="bt-product-contact-zalo" aria-hidden="true">Zalo</span>
        <span>Chat Zalo</span>
      </a>
      <a href={storeContact.phoneHref} title={`Gọi ${storeContact.displayPhone}`}>
        <PhoneCall size={24} strokeWidth={2.4} aria-hidden="true" />
        <span>Gọi cho tôi</span>
      </a>
    </div>
  );
}
