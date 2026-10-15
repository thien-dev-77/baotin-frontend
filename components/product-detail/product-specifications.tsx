import type { ProductSpecification } from "@/lib/product-detail";

export function ProductSpecifications({ specifications }: { specifications: ProductSpecification[] }) {
  return (
    <>
      <h2 id="specifications" className="scroll-mt-32 text-base font-bold text-primary">Thông số kỹ thuật</h2>
      {specifications.length ? (
        <div className="mt-3 overflow-hidden rounded-md border border-border">
          <table aria-labelledby="specifications" className="bt-table table-fixed">
            <tbody>
              {specifications.map(([label, value], index) => (
                <tr key={`${index}-${label}`} className="border-b border-border last:border-b-0">
                  <th scope="row" className="!w-2/5 align-top [overflow-wrap:anywhere] sm:!w-56">{label}</th>
                  <td className="!align-top whitespace-pre-line leading-6 [overflow-wrap:anywhere]">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-secondary">Thông số kỹ thuật đang được cập nhật.</p>
      )}
    </>
  );
}
