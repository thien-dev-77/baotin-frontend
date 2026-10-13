# Mẫu Excel Catalog

File: [bao-tin-catalog-mau-v2.xlsx](../public/templates/bao-tin-catalog-mau-v2.xlsx).
Trong admin **Sản phẩm** và **Danh mục sản phẩm**, chọn **Tải mẫu Excel**.
URL tải: `/templates/bao-tin-catalog-mau-v2.xlsx`. File v1 cũ vẫn được giữ để
không làm hỏng link đã tải trước đây; v2 là contract cho công việc tiếp theo.

Đây là file chuẩn bị dữ liệu, không phải chức năng import đã triển khai.
Hiện hệ thống chỉ hỗ trợ thêm/sửa từng sản phẩm, danh mục qua UI/API và xuất CSV.
Chưa có màn hình upload Excel hoặc API import mẫu này. Backend đã có CLI riêng
cho sheet đầu của bảng Fulco và đã nhập 242 SKU private; CLI đó không phải importer
cho contract v2 bên dưới. Xem [thao tác hàng loạt](product-bulk-actions.md).
File không tự thay đổi database và không chứa dữ liệu production.

## Các Sheet

| Sheet | Nội dung |
| --- | --- |
| `HuongDan` | Hướng dẫn tiếng Việt, giải thích từng cột và các điều kiện công khai |
| `DanhMuc` | Sheet trống để điền danh mục mới, một dòng mỗi danh mục |
| `SanPham` | Sheet trống để điền sản phẩm mới, một dòng mỗi sản phẩm |
| `ViDuDanhMuc` | 8 danh mục tham khảo dựa trên mock catalog, không phải dữ liệu live |
| `ViDuSanPham` | 4 sản phẩm mẫu: LED dây, ray âm, rổ kéo và tay nắm |

Sheet nhập liệu có 500 dòng định dạng sẵn, bộ lọc, cố định hàng tiêu đề,
ghi chú từng cột và kiểm tra ô cho độ dài, số nguyên, CK 0-99.99 (tối đa hai
chữ số thập phân), lựa chọn `TRUE/FALSE`. Ô giá sau CK B2C/B2B có công thức
và được khóa; các ô nhập liệu vẫn sửa được. Sheet protection tránh sửa nhầm,
không phải cơ chế bảo mật.
500 dòng không phải giới hạn của một API import, vì API đó chưa có.
Các ví dụ dùng mã `MAU-...` và trạng thái `FALSE` để không tự công khai.
Không nhập các sheet `ViDu*`; chỉ dùng làm tham khảo.

## Quy Tắc Điền

1. Giữ nguyên tên sheet và tiêu đề hàng 1. Dữ liệu bắt đầu ở hàng 2.
2. Chuẩn bị danh mục trước. Với danh mục đã có, lấy đúng `slug` và tên nhóm
   trong admin; không tạo lại 8 danh mục ví dụ.
3. `code` là Text để giữ số 0 đầu. `code` và `slug` không được trùng dữ liệu có sẵn.
4. Giá là số nguyên VND, ví dụ `45000`, không nhập `45.000đ`.
   Điền `listPrice`, `b2cDiscount`, `b2bDiscount`. CK 15% điền số `15`, không
   nhập text `15%`. Hai giá sau CK tự tính độc lập từ giá niêm yết, không cộng dồn.
5. `gallery` và `subcategories` ngăn cách bằng ` | `.
6. `published=FALSE` giữ sản phẩm riêng tư khi chuẩn bị; `TRUE` chỉ khi đủ nội dung.
7. Ảnh phải được upload lên backend trước. Điền URL tương đối đã tồn tại, không
   chèn bitmap trong Excel, không dùng tên file trên máy hay link ngoài.

Ví dụ `gallery`:

```text
/media/uploads/anh-dai-dien.webp | /media/uploads/anh-chi-tiet.webp
```

Ảnh đầu tiên là đại diện; tối đa 20 ảnh, không trùng nhau, JPEG/PNG/WebP.
Mỗi request upload nhận tối đa 10 ảnh.
URL upload thực tế được API `/media/product-images` trả về, không tự đặt đường dẫn.
Các URL `/images/...` trong ví dụ là ảnh mẫu đã đóng gói ở backend.

## Mapping Backend

| Sheet | Cột |
| --- | --- |
| `DanhMuc` | `slug`, `name`, `image`, `description`, `subcategories`, `visible`, `sortOrder` |
| `SanPham` | `name`, `code`, `slug`, `category`, `subcategory`, `brand`, `unit`, `listPrice`, `b2cDiscount`, `price` (tự tính), `b2bDiscount`, `b2bPrice` (tự tính), `specification`, `material`, `color`, `size`, `origin`, `description`, `gallery`, `featured`, `published` |

Các cột nhập liệu khớp field của `CategoryDto` và `ProductDto` backend;
`b2bPrice` chỉ để tham khảo, không gửi vào DTO. Backend tự tính `price` và
`oldPrice` từ ba field giá/CK, không tin cached result của Excel. Workbook dùng
văn bản phân cách cho hai field mảng; parser tương lai phải chuyển thành `string[]`.
Boolean có thể là giá trị Excel boolean hoặc text `TRUE`/`FALSE` từ dropdown;
parser phải đọc nghiêm ngặt, không dùng `Boolean("FALSE")`.
Các chuỗi tùy chọn trống cần map thành `""`; `gallery`/`subcategories` trống thành
`[]`. CK và giá phải đọc là số; không chuyển field giá/CK trống thành `0`.

Giá B2B trong sheet là giá mặc định sản phẩm; bảng giá riêng theo khách/nhóm/chi
nhánh vẫn được ưu tiên. Xem [quy tắc giá](product-pricing.md).
Không có `stock`, công nợ, `id` hoặc `revision`. Mẫu này dành cho chuẩn bị
dữ liệu tạo mới. Kho vẫn do nghiệp vụ ledger quản lý; cập nhật sản phẩm cũ cần một
luồng kiểm tra revision và bảo vệ code/unit đã được sử dụng, không tự ghi đè theo SKU.

Sản phẩm công khai cần tên, SKU, danh mục, brand, unit, giá > 0, specification và
gallery hợp lệ. Danh mục hiển thị cần image tồn tại. `visible=FALSE` không tự ẩn
sản phẩm trong danh mục; `published=FALSE` mới ẩn sản phẩm.

## Bước Import Tiếp Theo

Khi triển khai importer, dùng workbook này làm contract v2 và tái sử dụng validation
backend hiện có. Chỉ đọc `DanhMuc`/`SanPham`, bỏ dòng hoàn toàn trống, từ chối công
thức trong cột nhập liệu. Riêng hai cột đầu ra `price`/`b2bPrice` có công thức
mẫu: bỏ qua chúng và tính lại từ ba field đầu vào, không lấy cached result.
Dòng có toàn bộ ô nhập liệu trống là dòng trống dù còn công thức đầu ra.
Cần màn hình xem trước lỗi theo sheet/dòng/cột và
xác nhận trước khi ghi; không tự nhập mẫu, xóa dữ liệu hay ghi đè hàng đang có.
Giữ phân quyền: admin/boss tạo danh mục; admin/boss/sales tạo sản phẩm.
Chỉ ghi dữ liệu sau khi toàn bộ batch hợp lệ; không bỏ qua âm thầm dòng lỗi.

## Bảo Trì

```sh
npm run catalog:template
npm run test:catalog-template
```

Generator dùng [ExcelJS](https://github.com/exceljs/exceljs), chỉ là dev dependency,
không đọc database, không phụ thuộc repo backend và không đưa vào bundle trình duyệt.
Sửa định nghĩa cột và ví dụ trong `scripts/`, tạo lại file `.xlsx` và kiểm thử khi
DTO backend thay đổi. Commit cả generator và workbook để server chỉ cần phục vụ
file tĩnh, không tạo Excel mỗi lần tải.
