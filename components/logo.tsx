import Image from "next/image";

export function Logo({ inverted = false, compact = false, sizes }: { inverted?: boolean; compact?: boolean; sizes?: string }) {
  return (
    <div className={`bt-logo${inverted ? " bt-logo--on-dark" : ""}${compact ? " bt-logo--compact" : ""}`}>
      <Image
        src={inverted ? "/logo-baotin-white.png" : "/logo-baotin.png"}
        alt="Bảo Tín"
        width={919}
        height={271}
        sizes={sizes || (compact ? "176px" : "(max-width: 639px) 152px, 192px")}
        loading={inverted ? "lazy" : "eager"}
        className="aspect-[919/271] h-auto w-full object-contain"
      />
    </div>
  );
}
