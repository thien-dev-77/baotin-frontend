import Image from "next/image";

export function ZaloIcon({ size = 24, className = "" }: { size?: number; className?: string }) {
  return <Image src="/zalo-icon.svg" alt="" aria-hidden="true" data-zalo-icon width={size} height={size} unoptimized className={`bt-zalo-icon ${className}`} />;
}
