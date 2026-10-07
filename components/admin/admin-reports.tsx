"use client";
import { useRef, useState } from "react";
import { Bell, Download } from "lucide-react";
import { api } from "@/lib/api-client";
import { money } from "@/lib/catalog";
import { downloadAdminCsv } from "@/lib/admin-preview";
import { Button } from "../ui";
import { useCommerce } from "../commerce-provider";
import { useAdmin } from "./admin-provider";
import { AdminHeading } from "./admin-ui";
import { ResourceStatus, useAdminResource } from "./admin-resource";
type Aging = {
  id: string;
  name: string;
  debt: number;
  overdue: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  older: number;
  unknown: number;
};
type Report = {
  date: string;
  customers: number;
  activeCustomers: number;
  orderingCustomers: number;
  orders: number;
  selfOrders: number;
  selfOrderRate: number;
  confirmationMinutes: number | null;
  cancelledOrders: { id: string; reason: string }[];
  shortages: number;
  aging: Aging[];
};
export function AdminReports() {
  const { branch, days } = useAdmin();
  const { notice } = useCommerce();
  const resource = useAdminResource<Report>(
    `/admin/reports?branch=${encodeURIComponent(branch)}&days=${days}`,
  );
  const [busy, setBusy] = useState("");
  const lock = useRef(false);
  const [error, setError] = useState("");
  const remind = async (id: string) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(id);
    setError("");
    try {
      const result = await api<{ sent: boolean }>("/admin/reports/remind", {
        method: "POST",
        body: JSON.stringify({ branch, customerId: id }),
      });
      notice(
        result.sent
          ? "Đã ghi nhận nhắc công nợ hôm nay."
          : "Khách không còn công nợ quá hạn.",
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể gửi.");
    } finally {
      lock.current = false;
      setBusy("");
    }
  };
  const exportRows = () => {
    if (!resource.data) return;
    downloadAdminCsv("bao-tin-tuoi-no.csv", [
      [
        "Khách",
        "Công nợ",
        "Trong hạn",
        "1-30 ngày",
        "31-60 ngày",
        "61-90 ngày",
        "Trên 90 ngày",
        "Chưa xác định hạn",
      ],
      ...resource.data.aging.map((row) => [
        /^[\s]*[=+@-]/.test(row.name) ? `'${row.name}` : row.name,
        row.debt,
        row.current,
        row.days30,
        row.days60,
        row.days90,
        row.older,
        row.unknown,
      ]),
    ]);
  };
  const data = resource.data;
  return (
    <>
      <AdminHeading
        title="Báo cáo vận hành"
        subtitle={`${branch} · ${days} ngày`}
      >
        <Button variant="secondary" disabled={!data} onClick={exportRows}>
          <Download size={16} />
          Xuất tuổi nợ
        </Button>
      </AdminHeading>
      <ResourceStatus {...resource} />
      {error && (
        <p role="alert" className="my-3 text-sm text-danger">
          {error}
        </p>
      )}
      {data && (
        <>
          <dl className="mb-7 grid grid-cols-2 gap-5 border-y border-border py-5 lg:grid-cols-3">
            {[
              [
                "Khách B2B đã kích hoạt",
                `${data.activeCustomers}/${data.customers}`,
              ],
              ["Khách có đặt hàng", data.orderingCustomers],
              ["Đơn B2B tự đặt", `${data.selfOrders} · ${data.selfOrderRate}%`],
              [
                "Xác nhận trung bình",
                data.confirmationMinutes === null
                  ? "Chưa có dữ liệu"
                  : `${data.confirmationMinutes} phút`,
              ],
              ["Đơn đã hủy", data.cancelledOrders.length],
              ["Báo thiếu chưa xử lý", data.shortages],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-text-secondary">{label}</dt>
                <dd className="mt-2 text-xl font-semibold text-primary">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <h2 className="mb-3 text-base font-semibold text-primary">
            Tuổi nợ · {data.date}
          </h2>
          <div className="overflow-x-auto">
            <table className="bt-table">
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Công nợ</th>
                  <th>Trong hạn</th>
                  <th>1–30 ngày</th>
                  <th>31–60 ngày</th>
                  <th>61–90 ngày</th>
                  <th>Trên 90 ngày</th>
                  <th>Chưa rõ hạn</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.aging.map((row) => (
                  <tr key={row.id}>
                    <td className="min-w-40 font-medium text-primary">
                      {row.name}
                    </td>
                    {[
                      row.debt,
                      row.current,
                      row.days30,
                      row.days60,
                      row.days90,
                      row.older,
                      row.unknown,
                    ].map((value, index) => (
                      <td
                        key={index}
                        className={`whitespace-nowrap tabular-nums ${index >= 2 && index <= 5 && value ? "text-danger" : ""}`}
                      >
                        {money(value)}
                      </td>
                    ))}
                    <td>
                      <Button
                        className="bt-icon-button"
                        variant="ghost"
                        title="Nhắc công nợ"
                        aria-label={`Nhắc công nợ ${row.name}`}
                        loading={busy === row.id}
                        disabled={!!busy || !row.overdue}
                        onClick={() => void remind(row.id)}
                      >
                        <Bell size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.cancelledOrders.length > 0 && (
            <section className="mt-7">
              <h2 className="mb-3 text-base font-semibold text-primary">
                Lý do hủy đơn
              </h2>
              <div className="divide-y divide-border">
                {data.cancelledOrders.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap gap-4 py-3 text-sm"
                  >
                    <strong className="text-primary">{row.id}</strong>
                    <span className="break-words text-text-secondary">
                      {row.reason}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
