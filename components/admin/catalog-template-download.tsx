import { FileSpreadsheet } from "lucide-react";
import { CATALOG_TEMPLATE_FILENAME, CATALOG_TEMPLATE_URL } from "@/lib/catalog-template.mjs";

export function CatalogTemplateDownload() {
  return (
    <a
      href={CATALOG_TEMPLATE_URL}
      download={CATALOG_TEMPLATE_FILENAME}
      className="bt-button-secondary"
      title="Tải file Excel mẫu sản phẩm và danh mục"
    >
      <FileSpreadsheet size={16} />
      Tải mẫu Excel
    </a>
  );
}
