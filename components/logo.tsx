import { Box } from "lucide-react";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-lg ${
          inverted ? "bg-white text-primary" : "bg-primary text-white"
        }`}
      >
        <Box size={25} strokeWidth={2.1} />
      </div>
      <div className={inverted ? "text-white" : "text-primary"}>
        <div className="text-[25px] font-extrabold leading-6 tracking-[0]">
          BẢO TÍN
        </div>
        <div
          className={`mt-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
            inverted ? "text-blue-100" : "text-text-secondary"
          }`}
        >
          Phụ kiện nội thất
        </div>
      </div>
    </div>
  );
}
