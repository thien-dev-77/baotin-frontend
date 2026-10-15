import DOMPurify from "isomorphic-dompurify";
import { productContentHtml } from "@/lib/product-content";
import type { ProductSpecification } from "@/lib/product-detail";

const blockElements = new Set(["P", "DIV", "LI", "UL", "OL", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "FIGURE", "TABLE", "TBODY", "TFOOT"]);
const specificationLabel = "Thông số";

function technicalContentText(node: Node): string {
  if (node.nodeName === "#text") return node.textContent || "";
  if (node.nodeName === "BR") return "\n";

  const children = Array.from(node.childNodes);
  if (node.nodeName === "TR") {
    const cells = children
      .filter(child => child.nodeName === "TD" || child.nodeName === "TH")
      .map(child => technicalContentText(child).replace(/\s+/g, " ").trim());
    return `\n${cells.join("\t")}\n`;
  }

  const text = children.map(technicalContentText).join("");
  return blockElements.has(node.nodeName) ? `\n${text}\n` : text;
}

// Convert only the storefront presentation; keep the original CKEditor content intact.
export function getTechnicalSpecificationRows(content?: string): ProductSpecification[] {
  if (!content?.trim()) return [];

  const body = DOMPurify.sanitize(productContentHtml(content), {
    ALLOWED_TAGS: ["p", "br", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "table", "thead", "tbody", "tfoot", "tr", "td", "th"],
    ALLOWED_ATTR: [],
    RETURN_DOM: true,
  });
  const rows: ProductSpecification[] = [];
  const lines = technicalContentText(body).split(/\r\n?|\n/).map(line => line.replace(/\u00a0/g, " ").trim()).filter(Boolean);

  for (const line of lines) {
    const tableCells = line.split("\t");
    if (tableCells.length > 1) {
      rows.push([tableCells[0], tableCells.slice(1).join(" · ")]);
      continue;
    }

    const separator = /^(?:https?:\/\/|mailto:|tel:)/i.test(line) ? -1 : line.search(/[:：]/);
    if (separator > 0) {
      const label = line.slice(0, separator).replace(/^(?:[•*·-]\s+)+/, "").trim();
      const value = line.slice(separator + 1).trim();
      rows.push([label || specificationLabel, value]);
      continue;
    }

    const previous = rows.at(-1);
    if (previous) {
      previous[1] = [previous[1], line].filter(Boolean).join("\n");
      continue;
    }
    rows.push([specificationLabel, line]);
  }

  return rows;
}
