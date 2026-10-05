# Dashboard Quan Tri Bao Tin

## Pham Vi

Dashboard noi bo tai `/admin`, tach biet voi `/account` danh cho khach B2B.
Lien ket "Quan tri (demo)" nam trong footer website ban hang.

Day la frontend Next.js de duyet giao dien. Khong co dang nhap nhan vien, API,
du lieu that, dong bo KiotViet hay phan quyen van hanh. Ngay moc du lieu mau:
04/10/2026. Ten, so dien thoai, don hang va cong no deu la du lieu minh hoa.

## Cac Trang

| Route | Noi dung |
| --- | --- |
| `/admin` | Gia tri don, don cho xac nhan, cong no, yeu cau duyet, bieu do va hang doi xu ly |
| `/admin/orders` | Tim/loc don, phan trang, CSV, chi tiet va chuyen trang thai |
| `/admin/orders/new` | Inside Sales tao ho don B2B/B2C tu Zalo/dien thoai/cua hang |
| `/admin/orders/:id/edit` | Sua SKU/so luong va thong tin nhan/thanh toan cua don pending chua gan approval |
| `/admin/warehouse` | Don da xac nhan, checklist soan hang, bao thieu/xu ly thieu, ban giao va CSV |
| `/admin/products` | Anh/SKU, danh muc, gia ban le, ton mau, trang thai ban/an |
| `/admin/customers` | Khach B2B, ho so, kich hoat/tam ngung tai khoan mau |
| `/admin/credit` | Cong no, qua han, vuot han muc, ho so khach va CSV |
| `/admin/accounting` | Lap phieu thu, doi chieu/chenh lech, huy phieu, don can thu va han thanh toan |
| `/admin/approvals` | Duyet/tu choi gia dac biet va ngoai le cong no, bat buoc y kien |
| `/admin/approvals/new?order=:id&type=credit` | Sales gui yeu cau gia dac biet theo SKU hoac ngoai le cong no cho don pending B2B |

Chi nhanh loc don/khach/yeu cau. Ky 7/30 ngay loc don va bieu do; cong no la
snapshot hien tai, khong phai tong don trong ky. Danh muc san pham dung chung
toan website, khong gia lap ton kho/gia theo chi nhanh.
Hang doi kho loc theo chi nhanh va lay tat ca don chua ban giao, ke ca don cu
ngoai ky bao cao. Khong hien don cho Inside Sales xac nhan, don da huy/hoan tat.

## Tuong Tac Mau

- Tao don: chon khach dang hoat dong cua chi nhanh hoac khach le B2C, tim SKU trong catalog hien co, them/xoa/sua so luong 1-999. Nguon Zalo/dien thoai/cua hang/Inside Sales.
- Bat buoc nguoi nhan/phone, dia chi khi khong pickup. B2B co 4 hinh thuc nhan hang; B2C chi noi thanh/cua hang. Cong no chi cho khach B2B co han muc >0.
- Don Sales moi luon cho xac nhan, dung ngay moc 04/10/2026 va ma BTM2610...; luu toi da 500 don mau. Gia dung adapter `priceFor` hien co, khong tu sua don gia. Total chi tien hang, chua phi/thue.
- Co the luu don thieu ton/vuong cong no de Sales xu ly; xac nhan van bi chan. Don B2B pending co nut "Xin duyet ngoai le" mo form request moi.
- Sua don pending chua gan approval: customer/branch/source co dinh, giu don gia cua SKU cu, SKU them moi theo adapter hien tai, bat buoc ly do. Don da xac nhan khong sua trong man nay. Don seed cu thieu details can bo sung phone/recipient khi sua, khong tu che dia chi.
- Don tao/sua xuat hien trong admin va vao queue kho sau xac nhan; khong dong bo sang don checkout/account storefront. Don admin seed cu giu gia cu, khong reprice toan bo fixture.
- Don: cho xac nhan -> cho soan -> dang soan -> san sang giao -> dang giao -> hoan tat.
- Inside Sales chua duoc xac nhan neu tai khoan bi khoa, thieu ton, chua duyet ngoai le hoac vuong cong no.
- Duyet yeu cau khong tu dong chuyen don sang kho. Can quay lai don va xac nhan.
- Sales chon don B2B active cua chi nhanh, gia de nghi theo tung SKU hoac cong no (vuot/qua han), bat buoc ly do. Gia nguyen duong khong vuot gia hien tai, it nhat mot SKU giam. Credit chi cho don mua no da co han muc >0.
- Yeu cau moi luu snapshot SKU/qty/gia hoac debt/limit/overdue/amount; duyet gia cap nhat gia va total cua RIENG don. Khong doi catalog, bang gia khach, han muc hay debt. Ba seed cu YC001-003 khong co gia de nghi, giu nguyen gia khi duyet.
- Co the can ca hai loai request tren mot don; tat ca loai ngoai le moi nhat phai duoc duyet. Gia duoc duyet khong bo qua gate cong no/ton/account. Ngoai le credit chi trong ceiling amount cua don, khong cap han muc moi.
- Khong gui trung loai pending/approved. Sau tu choi gui lai request moi, giu ban cu trong danh sach/history; gate dung request moi nhat theo loai. Chua co rut request/expiry/revision, don gan request van khoa sua.
- Chi nhanh khac, account khoa hoac don khong pending khong duoc duyet. Co the tu choi co ly do de dong yeu cau cua don huy/account khoa; khong tu dong huy request theo don.
- `approvalRequests` luu toi da 500 request moi trong storage v1. Parser bo request sai ID/SKU/qty/price/customer/branch, tinh lai total va doc storage cu chua co field nay.
- Huy don truoc khi dang giao, bat buoc ly do. Don hoan tat/huy khong chuyen tiep.
- Kho bat dau soan truoc khi tick checklist. Moi checkbox xac nhan du toan bo so luong cua mot ma hang; khong sua so luong dat, gia hoac cong no.
- Chi soan xong/ban giao khi tat ca ma hang da duoc kiem du va khong con bao thieu chua xu ly. Gate ap dung ca trong trang don hang chung.
- Bao thieu: chon SKU trong don, so luong nguyen duong khong vuot so luong dat, ghi chu bat buoc. Moi don co toi da mot bao thieu dang mo.
- Bao thieu bo tick ma hang tuong ung; can kiem lai ma do va nhap ket qua xu ly truoc khi xac nhan da du hang. Don san sang giao cung bi chan neu phat hien thieu.
- Sau ban giao, don roi hang doi kho. Mua/ban, huy, xac nhan Inside Sales va xac nhan giao thanh cong khong nam trong thao tac cua man hinh kho.
- Lich su ghi cac thao tac don/checklist/bao thieu/xu ly, toi da 50 su kien moi nhat, gio tu trinh duyet va actor "Nhan vien demo". Day khong phai audit log tin cay hay danh tinh nhan vien that.
- Kich hoat khach khong tu dong cap han muc cong no.
- Trang thai san pham chi cap nhat trong dashboard demo; chua an san pham tren storefront.
- Khong tao thanh toan hay tru ton kho/cap nhat cong no that khi thao tac mau.
- `baotin-admin-preview-v1` luu thay doi mau trong localStorage, tach khoi gio hang/tai khoan khach.
- Nut khoi phuc co hop thoai xac nhan va khong xoa du lieu khach hang storefront.

## Component Va Style

Cac duong dan code ben duoi tuong doi voi goc repo FE tu 05/10/2026.
Thu tien: [accounting-preview.md](accounting-preview.md); debt goc khong doi
theo receipts. `npm run ...` chay truc tiep tai goc, khong con npm wrapper.

- `components/site-frame.tsx`: chon storefront hoac khung admin theo pathname.
- `app/admin/layout.tsx`: provider + shell, metadata noindex.
- `components/admin/admin-shell.tsx`: sidebar/topbar, chi nhanh/ky, menu mobile.
- `components/admin/admin-provider.tsx`: trang thai mau va cac thao tac.
- `components/admin/admin-dashboard.tsx`: tong quan.
- `components/admin/admin-order-table.tsx`, `admin-order-dialog.tsx`: bang va chi tiet don dung chung.
- `components/admin/admin-order-items.tsx`: anh/ma/so luong va checklist; man hinh kho khong hien gia/cong no.
- `components/admin/admin-warehouse.tsx`, `admin-warehouse-issue.tsx`: hang doi va bao thieu/xu ly thieu.
- `components/admin/admin-order-history.tsx`: lich su thao tac mau.
- `components/admin/admin-orders.tsx`, `admin-products.tsx`, `admin-customers.tsx`, `admin-approvals.tsx`: cac man hinh.
- `components/admin/admin-sales-order.tsx`, `admin-sales-products.tsx`: form tao/sua don va picker catalog dung chung.
- `components/admin/admin-approval-request.tsx`, `admin-approval-snapshot.tsx`: form gui va du lieu de nghi cho nguoi duyet.
- `components/admin/admin-ui.tsx`: heading, search, status, table, pagination.
- `lib/admin-preview.ts`: fixture, validation, quy tac chan don va xuat CSV.
- `lib/admin-warehouse.ts`: types, checklist, gate, validation storage va lich su kho.
- `lib/admin-sales.ts`: draft/details, adapter gia, validation tao/sua va rehydrate storage; khong phai DTO hay bang gia production.
- `lib/admin-approval.ts`: snapshot, latest request theo loai, projection gia duoc duyet, scope/gate va parser.
- `app/globals.css`: `.bt-admin*`, font Inter va token mau hien co; trang thai xanh la/do/vang.

Sidebar desktop, menu dialog tablet/mobile. Bang cuon ngang trong container,
khong keo tran toan trang. Khong dung hero hay bo cuc marketing trong admin.

## Truoc Khi Ket Noi Backend

Doc [api-handoff.md](api-handoff.md) de xem phan UI con thieu, mock inventory,
khac biet model commerce/admin va de xuat contract. Khong coi tat ca UI da xong.

1. Bao ve tat ca `/admin` va API bang xac thuc server; localStorage khong phai phan quyen.
2. RBAC cho Inside Sales, kho, ke toan va chu doanh nghiep; kiem tra chi nhanh tren server.
3. KiotViet la nguon van hanh; khong cho website tu y sua gia, ton hoac cong no.
4. Server kiem tra lai gia/ton/cong no va transition, idempotency/transaction khi xac nhan.
5. Audit log nguoi thao tac, thoi gian, ly do, trang thai truoc/sau; race/conflict va retry.
6. Duyet cong no/gia dac biet theo quyen that; kho chi nhan don da duoc Inside Sales xac nhan.
7. Thay fixture va ngay moc bang API; them loading/error/permission-denied va test integration.

`robots: noindex` chi la SEO, khong bao ve truy cap. Khong dua du lieu kinh doanh
that vao ban demo cong khai hien tai.

## Kiem Thu Giao Dien

- `npm run test:admin`: 8 route x 5 viewport (1440, 1024, 768, 390, 320px).
- Kiem tra menu/Escape/focus, font/overflow/anh, bo loc/phan trang/CSV, gate duyet,
  cac buoc xu ly don, huy co ly do, ngoai le cong no va tai khoan B2B tam ngung.
- Kiem tra trang thai san pham/khach, reload/persistence, reset khong xoa commerce,
  localStorage hong va bo qua field la trong override mau.
- Da pass tren production build `.next-preview`. Report va anh chup:
  `/tmp/bao-tin-ui-qa/admin/report.json`.
- Hoi quy storefront/account: `QA_BASE_URL=http://localhost:3010 QA_PASS=admin-and-image-refresh npm run test:ui`.
  29 route x 5 viewport, 145 anh chup, `issues: []`.
- Lint, typecheck va production build pass. Khong thay the test backend, audit
  accessibility day du hay kiem tra Safari/Firefox.

`npm run test:warehouse` kiem tra them checklist/bao thieu/xu ly/ban giao tren
5 viewport, gate ca trang don chung, input so luong sai, reload/CSV/lich su,
don cu ngoai ky, tuong thich localStorage v1 chua co field kho, payload hong
va khoi phuc du lieu. Report: `/tmp/bao-tin-ui-qa/admin-warehouse/report.json`.

`npm run test:sales` kiem tra tao/sua/reload/xac nhan/chuyen kho tren 5 viewport;
picker search/anh/Escape/focus, recipient/phone/address/SKU validation, B2B
pricing, stock/credit gate, approval edit lock, seed edit, branch scope,
legacy/corrupt storage va reset tach commerce. Report khi chay thanh cong:
`/tmp/bao-tin-ui-qa/admin-sales/report.json`.

QA luot Sales/API handoff: Sales 5 viewport, admin 7 route x 5 viewport,
kho 5 viewport va hoi quy storefront/account deu pass, `issues: []`.
Report storefront: `/tmp/bao-tin-ui-qa/sales-handoff/report.json`.
Lint/typecheck va build `.next-preview` pass. Khong thay the kiem thu API.

`npm run test:approvals`: 5 viewport, form gia/credit, snapshot/anh/font, validation,
duyet co y kien, price scope, gate doc lap hai loai, tu choi/gui lai, order huy,
chi nhanh, storage cu/hong, reload va reset commerce isolation. Report sau khi
chay thanh cong: `/tmp/bao-tin-ui-qa/admin-approvals/report.json`.

QA request moi: `test:approvals`, `test:admin`, `test:sales`, `test:warehouse`
deu pass tren 5 viewport, `issues: []`. Hoi quy storefront/account `approval-requests`
29 route x 5 viewport, 145 anh chup, khong loi. Report:
`/tmp/bao-tin-ui-qa/approval-requests/report.json`. Build/lint/typecheck pass.

QA thu tien va tach thu muc: `test:accounting` pass 5 viewport va guard cho
amount/date sai, thanh toan du, parser branch/audit/duplicate. `test:admin`
8 route x 5 viewport pass. Sales, approvals, warehouse va storefront/account
`accounting-folder-split` pass, `issues: []`. Build/lint/typecheck pass.
Report accounting: `/tmp/bao-tin-ui-qa/admin-accounting/report.json`.
Ghi chu lich su truoc tich hop: source tung nam trong frontend/, backend/
chi co README, npm root chuyen tiep. Hien tai source FE ngay tai goc repo;
API BE quan ly rieng, xem backend-integration.md.
