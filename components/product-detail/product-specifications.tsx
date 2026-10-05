import type { ProductSpecification } from "@/lib/product-detail";

export function ProductSpecifications({ specifications }: { specifications: ProductSpecification[] }) {
  return (
    <>
      <h2 id="specifications" className="scroll-mt-32 text-base font-bold text-primary">Thông số kỹ thuật</h2>
      <div className="mt-3 overflow-hidden rounded-md border border-border">
        <table className="bt-table">
          <tbody>
            {specifications.map(([label, value]) => (
              <tr key={label}>
                <th scope="row" className="!w-40">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
