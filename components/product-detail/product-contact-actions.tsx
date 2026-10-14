import { storeContact } from "@/lib/store-contact";
import { PhoneCall } from "lucide-react";
import { ZaloIcon } from "@/components/zalo-icon";

export function ProductContactActions() {
  return (
    <div className="bt-product-contact-actions" role="group" aria-label="Liên hệ tư vấn sản phẩm">
      <a href={storeContact.zaloHref} target="_blank" rel="noopener noreferrer" title={`Chat Zalo: ${storeContact.displayPhone}`}>
        <span className="bt-product-contact-icon" aria-hidden="true"><ZaloIcon /></span>
        <span>Chat Zalo</span>
      </a>
      <a href={storeContact.phoneHref} title={`Gọi ${storeContact.displayPhone}`}>
        <span className="bt-product-contact-icon" aria-hidden="true"><PhoneCall size={20} strokeWidth={1.8} /></span>
        <span>Gọi cho tôi</span>
      </a>
    </div>
  );
}
