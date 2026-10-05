import { Breadcrumb, PageHeading } from "@/components/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
const policies: Record<string, { title: string; content: string[] }> = {
  "giao-hang": { title: "Chính sách giao hàng", content: ["Chọn giao nội thành, nhận tại cửa hàng hoặc gửi chành xe khi đặt hàng.", "Inside Sales đối chiếu mã hàng, số lượng và tồn kho trước khi xác nhận thời gian giao.", "Phí giao hàng được thể hiện trong phần tổng đơn và xác nhận cùng khách hàng."] },
  "thanh-toan": { title: "Chính sách thanh toán", content: ["Các phương thức thanh toán gồm COD và chuyển khoản ngân hàng.", "Khách hàng B2B có thể chọn thanh toán công nợ theo điều kiện được Inside Sales xác nhận.", "Thông tin chuyển khoản được cung cấp khi xác nhận đơn hàng."] },
  "cong-no": { title: "Chính sách công nợ B2B", content: ["Khách hàng B2B xem thông tin hạn mức và phát sinh trong mục Công nợ.", "Inside Sales kiểm tra điều kiện công nợ trước khi chuyển đơn sang kho.", "Liên hệ Bảo Tín để đối chiếu hoặc xác nhận thông tin thanh toán."] },
  "doi-tra": { title: "Chính sách đổi trả", content: ["Kiểm tra mã hàng, số lượng và tình trạng sản phẩm khi nhận hàng.", "Liên hệ nhân viên phụ trách nếu cần hỗ trợ về sản phẩm hoặc phụ kiện lắp đặt.", "Cung cấp mã đơn hàng và hình ảnh sản phẩm để được tư vấn cách xử lý."] },
  "dieu-khoan": { title: "Điều khoản sử dụng", content: ["Đơn hàng được tiếp nhận khi khách hàng gửi thông tin đặt hàng.", "Inside Sales xác nhận thông tin sản phẩm, giá, tồn kho và phương thức nhận hàng trước khi kho chuẩn bị đơn.", "Vui lòng cung cấp thông tin liên hệ chính xác để nhân viên Bảo Tín hỗ trợ đơn hàng."] }
};
export default function PolicyPage({ params }: { params: { slug: string } }) { const policy = policies[params.slug]; if (!policy) notFound(); return <main className="bt-container bt-page"><Breadcrumb items={[{ label: policy.title }]} /><PageHeading title={policy.title} /><div className="max-w-3xl space-y-4 text-sm leading-7 text-text-secondary">{policy.content.map((text) => <p key={text}>{text}</p>)}<Link className="bt-button-primary mt-4" href="/contact">Liên hệ hỗ trợ</Link></div></main>; }
