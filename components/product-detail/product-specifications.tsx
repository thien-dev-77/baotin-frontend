import type { ProductSpecification } from "@/lib/product-detail";
import { productContentHtml } from "@/lib/product-content";
import { SafeHtml } from "@/components/safe-html";

export function ProductSpecifications({ specifications, technicalDetails }: { specifications: ProductSpecification[]; technicalDetails?: string }) {
  return (
    <>
      <h2 id="specifications" className="scroll-mt-32 text-base font-bold text-primary">Thông số kỹ thuật</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-border">
        <table aria-labelledby="specifications" className="bt-table table-fixed">
          <tbody>
            {specifications.map(([label, value]) => (
              <tr key={label} className="border-b border-border last:border-b-0">
                <th scope="row" className="!w-28 align-top sm:!w-40">{label}</th>
                <td className="!align-top [overflow-wrap:anywhere]">
                  {label === "Thông số" && technicalDetails?.trim() ? (
                    <SafeHtml html={productContentHtml(technicalDetails)} className="bt-product-rich-text text-sm leading-7 text-text-secondary" />
                  ) : value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
