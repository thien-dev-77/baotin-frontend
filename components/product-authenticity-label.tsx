import { Handshake } from "lucide-react";
import styles from "./product-authenticity-label.module.css";

export function ProductAuthenticityLabel({ compact = false }: { compact?: boolean }) {
  return <div data-product-authenticity className={`${styles.label}${compact ? ` ${styles.compact}` : ""}`}>
    <div className={styles.content}>
      <span className={styles.icon} aria-hidden="true"><Handshake strokeWidth={2.25} /></span>
      <span>Phân phối sản phẩm chính hãng</span>
    </div>
  </div>;
}
