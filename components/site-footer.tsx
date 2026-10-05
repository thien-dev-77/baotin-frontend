"use client";
import { Logo } from "@/components/logo";
import { api, apiMode } from "@/lib/api-client";
import { useCommerce } from "@/components/commerce-provider";
import { ArrowRight, Phone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function SiteFooter() {
  const { notice, cart } = useCommerce();
  const pathname = usePathname();
  const columns = [
    { title: "Thông tin", links: [["Giới thiệu", "/contact"], ["Hướng dẫn chọn hàng", "/guides"], ["Catalog sản phẩm", "/catalog"], ["Liên hệ", "/contact"], ["Quản trị (demo)", "/admin"]] },
    { title: "Chính sách", links: [["Chính sách giao hàng", "/policies/giao-hang"], ["Chính sách thanh toán", "/policies/thanh-toan"], ["Chính sách công nợ B2B", "/policies/cong-no"], ["Chính sách đổi trả", "/policies/doi-tra"], ["Điều khoản sử dụng", "/policies/dieu-khoan"]] },
    { title: "Hệ thống chi nhánh", links: [["Quy Nhơn (chính)", "/contact#stores"], ["Tuy Hòa", "/contact#stores"], ["Nha Trang", "/contact#stores"]] }
  ];
  return <footer className={`mt-auto bg-primary text-white ${pathname === "/cart" && cart.length ? "pb-20 sm:pb-0" : ""}`}><div className="bt-container grid grid-cols-2 gap-x-5 gap-y-7 py-8 lg:grid-cols-[1.3fr_0.9fr_1.1fr_1fr_1.2fr]"><div><Logo inverted /><p className="mt-4 max-w-[260px] text-xs leading-5 text-blue-100">Cung cấp phụ kiện nội thất chính hãng cho công trình và ngôi nhà Việt.</p><Link href="/contact" className="mt-3 inline-flex items-center gap-2 text-xs text-blue-100"><Phone size={15} />0901 234 567</Link></div>{columns.map((column) => <div key={column.title}><h2 className="text-xs font-bold uppercase">{column.title}</h2><ul className="mt-3 space-y-2">{column.links.map(([label, href]) => <li key={label}><Link href={href} className="text-xs leading-5 text-blue-100 hover:text-white">{label}</Link></li>)}</ul></div>)}<div className="col-span-2 sm:col-span-1"><h2 className="text-xs font-bold uppercase">Đăng ký nhận thông tin</h2><form className="mt-3" onSubmit={async (event) => { event.preventDefault(); const element = event.currentTarget; const email = String(new FormData(element).get("email")); try { if (apiMode) await api("/contact/newsletter", { method: "POST", body: JSON.stringify({ email }) }); notice("Đã đăng ký nhận thông tin khuyến mãi."); element.reset(); } catch (error) { notice(error instanceof Error ? error.message : "Không thể đăng ký nhận tin."); } }}><div className="flex overflow-hidden rounded-md bg-white"><input type="email" name="email" required aria-label="Email nhận thông tin" placeholder="Nhập email của bạn..." className="h-10 min-w-0 flex-1 px-3 text-xs text-primary outline-none" /><button title="Đăng ký" aria-label="Đăng ký nhận thông tin" className="flex w-10 shrink-0 items-center justify-center bg-blue-brand"><ArrowRight size={18} /></button></div><label className="mt-3 flex items-center gap-2 text-[11px] text-blue-100"><input required type="checkbox" defaultChecked className="accent-blue-brand" />Tôi đồng ý nhận tin khuyến mãi</label></form></div></div><div className="bt-container border-t border-white/10 py-3 text-right text-[11px] text-blue-100">© 2026 Bảo Tín. Tất cả quyền được bảo lưu.</div></footer>;
}
