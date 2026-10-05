# Ban giao UI va lap ke hoach API

Cap nhat: 04/10/2026. Tai lieu song, can cap nhat sau moi luong UI duoc duyet.

**Cap nhat giai doan:** nguoi dung da yeu cau backend. NestJS/TypeORM/JWT,
seed mock va media backend da them. Doc `docs/backend-integration.md` cho
hien trang API/env/tests/backlog. Phan duoi giu nhu ban giao UI preview
truoc tich hop, khong xem "chua co API/localStorage-only" la API mode hien tai.
Supabase da ket noi qua Session pooler, TLS verify, schema baotin_app da
synchronize va seed mock. Integration tests van dung PostgreSQL local;
khong chay cac test ghi du lieu voi API Supabase. Chua co KiotViet.

## 1. Muc dich va dieu kien bat dau

Huong dan agent tiep theo doc UI, tai su dung mock hien co va lap ke hoach
NestJS + TypeScript + TypeORM + Supabase PostgreSQL **sau khi UI duoc duyet**.
Day khong phai hop dong API da chot, schema production hay lenh khoi tao backend.
Nguoi dung uu tien hoan thien giao dien truoc; khong tu chuyen giai doan.

Cau truc repo FE tu 05/10/2026: Next.js ngay tai goc repo (app/, components/,
lib/, scripts/, package.json), types/rules trong `shared/`; khong con frontend/.
Backend nam rieng tai https://github.com/thien-dev-77/baotin-b2b-be.
Cac duong dan code trong tai lieu nay tuong doi voi goc repo FE; tai lieu va
design van o root. Doc them `docs/accounting-preview.md` cho luong thu tien.

**UI chua day du theo project.md.** Muc 3 ghi ro backlog. Mock trong trinh duyet
khong phai nguon gia, ton, cong no, danh tinh hay phan quyen tin cay.

Thu tu doc:

1. `docs/project.md`: nghiep vu, vai tro, pilot Quy Nhon, KiotViet la nguon goc.
2. `docs/start-work.md`: thu tu frontend truoc va stack backend du kien.
3. `docs/design-system.md`, `docs/ui-ux-rules.md`: style/component can giu nguyen.
4. `docs/frontend-platform.md`: route storefront/account, luong va gioi han mock.
5. `docs/admin-preview.md`: Sales, phe duyet, kho, guard va thao tac mau.
6. Tai lieu nay va code nguon ben duoi; doi chieu code thuc te truoc khi de xuat.

Khong dung hinh thiet ke thay cho hop dong nghiep vu; khong danh dau hoan thanh
UI chi vi route render duoc. Can duyet ca du lieu, validation va trang thai loi.

## 2. Nguon mock phai tai su dung

| Nguon | Du lieu/trach nhiem | Cach dung cho API sau nay |
| --- | --- | --- |
| `lib/catalog.ts` | `Product`, `Customer`, `Order`; catalog 63 SKU, 8 danh muc, 3 thuong hieu, 4 guide; `priceFor`, `mockOrders` | Dau vao fixture/seed development va contract test; giu ma/slug/nhom, khong tao catalog thu hai |
| `lib/home-data.ts` | Slide, section, giai phap, 10 san pham goc lam dau vao catalog | Noi dung homepage, khong xem 10 muc nay la catalog doc lap |
| `lib/lock-catalog.ts` | 5 nhom khoa, 25 SKU da duoc ghep vao catalog | Khong seed lai 25 SKU lan hai |
| `lib/product-detail.ts` | Thong so, review, related/bundle minh hoa | Tach du lieu noi dung va relation khoi API mua hang |
| `lib/admin-preview.ts` | 7 khach B2B, 18 don, 3 yeu cau; 3 chi nhanh; enum/guard/parser/CSV | Fixture nghiep vu Sales/phe duyet/credit; ma khach hien la ID demo |
| `lib/admin-sales.ts` | `SalesDraft`, `SalesDetails`, tao/sua don, gia adapter va parser | Map form sang command API, khong gui unitPrice/total tu form lam gia tin cay |
| `lib/admin-approval.ts` | Request draft/snapshot, latest theo loai, gia sau duyet, guard va parser | Fixture xin gia/cong no; API phai revalidate revision va scope tren server |
| `lib/admin-warehouse.ts` | Checklist, bao thieu, gate, lich su | Fixture kho; khong coi history la audit server |
| `lib/admin-accounting.ts` | Receipt draft/reconcile/void, projection paid/pending, parser | Dung lai don hien co; chua tru debt snapshot hay dong bo ledger |
| `components/commerce-provider.tsx` | Gio, favorites, session/ho so, don checkout | Diem thay adapter storefront; giu hanh vi view |
| `components/admin/admin-provider.tsx` | Orders/customers/approvals/products/warehouse, thao tac admin | Diem thay adapter admin; giu component va style |
| `components/account-pages.tsx`, `components/auth-view.tsx` | Ho so, dia chi, settings va login/register preview | Doc ca field form truoc khi thiet ke DTO |

Tai su dung **mock co san trong repo**, khong lay localStorage cua nguoi dung
lam seed. Neu can fixture serializable, tao export/adapter tu cac nguon tren,
khong chep cung 63 SKU sang file JSON de roi bi lech du lieu.

Moc admin: `previewDate = 2026-10-04`; 7/30 ngay tinh tu moc nay, khong phai
dong ho thuc. Don Sales moi dung cung moc de vao bao cao. History dung gio
trinh duyet. Khi noi API, doi sang timestamp server va khoang ngay ro rang.

Storage preview:

| Key | Noi dung | Gioi han |
| --- | --- | --- |
| `baotin-commerce-v1` | Cart, favorites, coupon, don checkout | Rieng browser; khong chia se voi admin |
| `baotin-customer` | Session B2B localStorage/sessionStorage | Khong co auth that; khong luu password |
| `baotin-profile-*` | Ho so theo identity preview | Khong phai customer directory KiotViet |
| `baotin-addresses-{customerId}` | Dia chi nhan hang | Client-only |
| `baotin-settings-{customerId}` | Ba tuy chon thong bao | Client-only |
| `baotin-admin-preview-v1` | Status overrides, approval decisions, publication, warehouse, `salesOrders`, `orderEdits`, `approvalRequests`, `receipts`, `paymentDueDates` | Client-only; schema cu van doc duoc |

Admin Sales luu toi da 500 don tao ho; parser bo ID/SKU/price/qty/details sai,
tinh lai total. Reset admin chi xoa thay doi admin, khong xoa commerce.
Validation nay chi giup demo on dinh, **khong phai bao mat server**.

Anh/brand/thong tin lien he/chinh sach hien co gioi han minh hoa. Doc
`docs/image-assets.md` va `docs/lock-category-assets.md` truoc khi import
media. Mot so SKU dung anh nhom; khong gan nhan anh da xac minh dung bien the.

## 3. UI readiness va backlog

"Co UI mock" khong dong nghia nguoi dung da duyet hay co API. Agent phai
cap nhat bang nay theo code va phan hoi moi nhat, khong chi doc lich su chat.

| Luong | Hien trang | Con thieu truoc khi chot API |
| --- | --- | --- |
| Catalog/search/detail/cart/checkout | Co UI va tuong tac mock | Gia/ton/phi/khuyen mai that, errors, re-quote va SKU assets |
| Login/register/account/reorder/favorites | Co UI mock | Auth, recovery/change password, identity/ownership that |
| Sales tao don ho | `/admin/orders/new`; khach B2B/khach le, SKU, quantity, nguoi nhan, giao, payment, note | Can duyet form; queue can goi/bo sung thong tin, assigned Sales, phi/thue |
| Sales sua don | `/admin/orders/:id/edit`; chi pending chua gan approval, co ly do | Can duyet; order revision va rut/huy approval neu can sua |
| Xac nhan/huy don | Co gate va history mau | Revision/conflict, dong bo/transaction, cancellation policy khi da soan |
| Kho | Queue, checklist, mot shortage dang mo, xu ly, ban giao | Bien ban/nguoi van chuyen/chung tu, partial pick/multiple shortage neu can |
| Duyet ngoai le | `/admin/approvals/new`; Sales gui gia theo SKU/cong no theo don, snapshot, duyet/tu choi/gui lai | Can duyet UI; chua co rut request, expiry, server revision/auth, khach tu xin gia tren account |
| Gia B2B | `priceFor` mock dung chung; khong co UI quan ly gia | **Chua co** bang gia nhom/khach, hieu luc, luu vet, quyen xem |
| Cong no/thu tien | Snapshot limit/debt/overdue; `/admin/accounting` thu tung phan theo don, doi chieu, huy co ly do, due date, CSV | Can duyet; ledger/no goc, bank import, split transaction, refund, discrepancy queue/audit due date |
| Ho so B2B admin | Xem, kich hoat/tam ngung | **Chua co** them/sua ho so, Sales phu trach, pilot, contacts/addresses, credit terms |
| San pham admin | Xem/loc/CSV, toggle published rieng admin | **Chua co** edit content/media/docs/related/completeness gate va sync status |
| Bao gia/print don | Catalog CSV/in co; don khong co mau chung | **Chua co** tai/in bao gia/don, expiration/revision, approved prices |
| Nhan vien/RBAC | Tat ca admin dang la demo truy cap duoc | **Chua co** login nhan vien, user/role/branch screens va permission states |
| B2C solutions | Homepage cards va noi dung huong dan | Chua co detail bo giai phap/so sanh co ban-kha-cao cap hoan chinh |
| KPI/feedback | Dashboard tong quan theo fixture | Chua co metrics self-order/confirmation SLA/error reason/pilot feedback |

Thu tu UI tiep theo de xuat: ho so B2B/gia rieng
-> product content -> bao gia -> staff/RBAC; bo sung khach B2B tu xin gia.
Thong nhat
voi nguoi dung truoc khi doi pham vi. Khong bat dau backend de lap cho UI thieu.

## 4. Du lieu va diem khong tuong thich

### 4.1. San pham

`Product`: id/slug/name/code/category/subcategory/image/gallery/brand,
specification/material/color/size/origin, price/oldPrice/unit/stock/featured.
Publication la admin override, chua an product tren storefront. Stock la so
mock chung, **khong theo chi nhanh**. `priceFor` giam khoang 10% va lam tron
500 VND cho B2B; day KHONG phai chinh sach gia Bao Tin.

API can tach public catalog khoi personalized quote. Khong serialize gia
B2B trong guest HTML/JS/static props/public cache. Gia rieng phai lay sau auth
va cach ly cache theo customer/branch. Don luu price snapshot server.

Website khong duoc tu tao SKU moi; `BT-*` trong fixture chi la ma demo.
Sau nay map SKU voi external KiotViet ID, checksum/updatedAt/sync status;
kiem tra duplicate code va unit, khong sua ma goc de hop mock.

### 4.2. Khach hang

Storefront `Customer` dung company/name/email/phone/tax/address,
`pending|active`, creditLimit/debt, role b2b. Admin `AdminCustomer` dung
name/contact/group/branch, `Cho duyet|Dang hoat dong|Tam ngung`, limit/debt/overdue.
Chua co ID mapping giua hai model. **Khong noi bang ten/phone tu dong**.
Can canonical customer ID + KiotViet ID + account membership/contact relation,
assigned Sales, pilot flag, credit terms, approval status, addresses.

Khach moi han muc 0. Kich hoat account khong tu cap han muc. Gioi han/no/due
phai den tu nguon van hanh va chi hien cho dung customer/role.

### 4.3. Don hang

Storefront `Order` co subtotal/shipping/discount/total, customer snapshot day du,
delivery/payment/note, date ISO. Admin `AdminOrder` co customerId/name,
branch/date, B2B|B2C, source, items, total, credit, approvalId/cancelReason.
Sales bo sung optional `details`: recipient/phone/address/delivery/payment/note.
Don seed cu khong co details, khong tu che dia chi/phone cho seed. Sua don cu
yeu cau bo sung thong tin. Sales total chi la tien hang, chua phi/thue/coupon.
Seed admin giu nguyen gia minh hoa cu; don Sales moi dung price adapter B2B.

**Checkout khach va admin KHONG cung tap don.** `placeOrder` chi ghi commerce;
admin tao don chi ghi admin. Sau API phai dung mot order service va views theo
quyen. Tranh "bridge" hai localStorage va coi la tich hop da xong.

ID seed `BT26100001`...; ID Sales `BTM26100001`... la ma preview. Khong dung
bo dem browser cho production; server phat ID va display number unique.

API model can co order ID, display number, customer/branch/actor/source,
revision, timestamps, item SKU/unit/variant/price snapshot, fulfillment,
payment/credit status, shipping/tax/discount, totals, exception links va
cancellation reason. Danh sach nay la **de xuat**, can chot sau duyet UI.

### 4.4. Phe duyet, kho va ke toan

`AdminApproval` seed cu chi co type/order/customer/branch/requestedBy/reason,
status/decisionReason. Gia cua ba seed nay giu nguyen khi duyet vi khong co
muc gia de nghi; khong tu che requested price cho seed.

Yeu cau tao moi `YCM0001`... co createdAt va `snapshot`:

- Price: kind=price, lines(productId/quantity/unitPrice/requestedPrice), total,
  requestedTotal. Moi SKU gia nguyen duong <= gia hien tai, it nhat mot SKU
  giam. Duyet cap nhat gia va total cua rieng don; catalog/bang gia khach khong doi.
- Credit: kind=credit, items(productId/quantity), amount cua don, debt/limit/overdue
  tai luc gui. Chi don cong no B2B active co han muc >0 va vuot/qua han;
  khong tang limit/no that. Amount la ceiling cho don duoc duyet.
- Mot don co the co ca hai loai. `approvalId` hien chi la link dai dien;
  provider/guard lay **yeu cau moi nhat theo tung loai** tu orderId.
  Khong thiet ke quan he 1-order-1-approval dua vao field cu.
- Khong gui trung khi pending/approved cung loai. Sau tu choi co the gui lai,
  giu request cu trong danh sach va history; gate dung request moi nhat.
- Tao/duyet/tu choi ghi history mau. Order da gan request van khoa sua, ke ca
  khi tu choi; hien gui lai de nghi, chua co rut/huy request de sua qty/payment.
- Khong duyet don da huy/khach khoa/chi nhanh khac. Van co the tu choi co ly do
  de dong request cua don huy hoac account tam ngung. Khong tu dong dong request
  khi huy don; chua co workflow auto-invalidation/expiry.
- Parser kiem SKU/qty/gia/customer/branch/snapshot; total tinh lai. Browser
  co the bi sua, day khong phai signed snapshot hay phe duyet tin cay.

Kho luu checks theo SKU, mot issue productId/quantity/note/reportedAt,
resolvedAt/resolution va history toi da 50. Checkbox = du toan bo quantity
cua SKU, khong phai picked quantity. Demo khong tru stock hay tang debt.

Debt/overdue la snapshot customer, khong tinh tu adminOrders. Khong suy ra
phieu thu/cong no that tu total don. API sau nay can ledger, receipt allocation,
due date, reconciliation va audit; chot quy tac KiotViet truoc khi tao bang.

Mock moi luu `receipts` (toi da 500) va `paymentDueDates` trong admin storage v1.
Chi thu don da xac nhan, mot phieu/mot don, partial receipt; pending giu amount,
reconciled moi tinh paid, mismatch khong xac nhan, void co ly do va giu audit.
Reference/ma doi chieu unique theo branch+method tren phieu con hieu luc.
Don co phieu con hieu luc khong huy; thu tien khong chuyen stage/no/limit/stock.
Due date chi don credit da xac nhan, khong truoc order date; khong auto default
terms. Doc accounting-preview de xem gioi han void/refund va snapshot debt.

## 5. State va quy tac bat buoc

Admin: Cho xac nhan -> Cho soan hang -> Dang soan -> San sang giao -> Dang giao
-> Hoan tat. Da huy la terminal; huy truoc Dang giao, bat buoc ly do.
Customer hien dung Cho xac nhan/Dang xu ly/Dang giao/Da giao/Da huy.
De xuat projection: ba stage soan -> Dang xu ly, Hoan tat -> Da giao.
Dung enum code on dinh trong API, label tieng Viet o view; mapping can duoc duyet.

1. Don moi tu checkout hay Sales deu cho xac nhan, khong tu dong chuyen kho.
2. Xac nhan kiem account active, SKU/variant/unit/quantity/stock/gia/credit,
   giao hang va thanh toan; thieu thong tin thi giu don de Sales bo sung.
3. Demo van cho seed cu thieu details qua gate; **khong mang ngoai le nay vao API**.
4. Gia dac biet/cross-limit/overdue phai Boss duyet truoc khi xac nhan.
   Demo cho luu don pending thieu ton/vuong credit, khong cho xac nhan.
   Phe duyet gia khong thay the phe duyet credit; hai request duoc kiem doc lap.
5. Sua pending chi duoc khi chua approval; customer/branch/source co dinh,
   don gia cu giu nguyen, SKU them moi lay gia mock hien tai, bat buoc ly do.
   API can revision + re-quote/invalidate approval khi policy cho sua.
6. B2B co bon delivery type trong `salesDeliveries`; B2C chi giao noi thanh
   hoac nhan tai cua hang. Co delivery khac pickup thi bat buoc dia chi/diem nhan.
7. B2C/khach B2B han muc 0 khong mua no. Demo khong cap han muc khi active.
8. Kho chi don da xac nhan; khong sua gia/qty/SKU/credit. Soan xong va ban giao
   chi khi tat ca SKU du va khong shortage dang mo; gate dung ca trang Sales.
9. Bao thieu bo check SKU; chi resolve khi kiem lai du hang va co ket qua xu ly.
10. Phe duyet khong tu xac nhan; receipt khong tu cap han muc; handoff khong
    tu coi la da giao. Khong tru ton/tang no hai lan khi retry thao tac.

Moi command server can actor/branch/ownership check, validation, revision,
idempotency khi tao/xac nhan/thu tien, audit bat bien va conflict response.
Khong tin `role`, `branch`, `unitPrice`, `total`, `debt`, approval/status client.

## 6. Ban do thao tac sang API du kien

**Chi de xuat, chua co endpoint nao duoi day duoc cai dat.** Khong dung generic
PATCH status de bo qua guard. Chot HTTP/resource/DTO/OpenAPI sau UI acceptance.

| UI/action hien tai | Resource/command de xuat | Ghi chu |
| --- | --- | --- |
| Catalog/search/detail | GET products/categories/brands; product detail | Public fields, filter/sort/page; published gate |
| `priceFor`, totals | POST quote | Server lay customer tu session, tinh gia/ton/phi/coupon, quote expiry |
| Login/register/logout/profile | Auth + me/customer profile | Chon Supabase Auth hay Nest auth truoc; khong hai identity owners |
| Cart/favorites/addresses/settings | me resources | Ownership; quy tac guest cart merge can chot |
| Checkout `placeOrder` | POST orders | Quote revision, idempotency, luu customer/price snapshot |
| Account orders/detail/reorder | GET me/orders; reorder -> quote/cart | Khong tin gia/stock cu, khong lo don customer khac |
| Admin list/dashboard | GET admin/orders/dashboard | Branch scope server; period/timezone; aggregate khong ghep page tren client |
| `saveSalesOrder` create | POST admin/orders | Sales actor, on-behalf customer, source, items/details; luon pending |
| `saveSalesOrder` edit | PATCH admin/orders/:id | Allowed fields + reason + expectedRevision; immutable identity/source |
| `advanceOrder` pending | POST admin/orders/:id/confirm | Recheck quote/stock/credit/approval, transaction va KiotViet sync strategy |
| `cancelOrder` | POST admin/orders/:id/cancel | Required reason, stage/role, reservation/exception implications |
| `setCustomerStatus` | Customer activation/suspension commands | Khong tu cap credit; permissions/audit |
| `setPublished` | Product publication command | Data completeness/media, KiotViet code gate, storefront cache invalidation |
| `createApproval` | POST admin/orders/:id/approvals | Price/credit type, SKU/requested price/reason, server luu snapshot/revision/amount scope |
| `decideApproval` | POST approvals/:id/decision | Boss role, revision, reason, requested values va validity |
| Kho start/check/report/resolve/handoff | Fulfillment commands + shortage resource | Warehouse role/branch; optimistic locking, checklist, handoff evidence |
| createReceipt/reconcileReceipt/voidReceipt | Receipt commands + allocation/ledger | Accountant role/branch, idempotency, uniqueness, amount/revision, audit/reversal |
| setPaymentDueDate | Order payment terms command | Server terms policy, expectedRevision, reason/audit; khong tang limit |
| CSV/documents | Export/quote/order document endpoints | Scope auth, UTF-8/formula protection, revision/expiry, template approved |
| Contact/newsletter/reviews | Submission resources | Consent/rate limit/moderation, provider delivery va errors |

UI chua co: customer self-service approval request, price policy, receipts/ledger, edit customers,
content editor, staff administration. Them contract sau khi field/workflow
duoc duyet; khong tu tao DTO dua tren mot modal seed chua du thong tin.

Role boundary: Inside Sales tiep nhan/xac nhan; Warehouse soan/kiem/ban giao;
Accountant thu/doi chieu/canh bao, khong tu tang limit; Boss duyet ngoai le;
customer chi tai khoan/du lieu cua minh. Chi nhanh thuoc grant server, dropdown
hien tai khong phai RBAC. `/admin` noindex khong bao ve truy cap.

## 7. Lo trinh API sau khi UI duoc duyet

1. Audit UI/code va cap nhat readiness; lap danh sach policy chua chot.
2. Chot canonical IDs, state projection, ownership, pricing/credit/delivery,
   approval revisions va KiotViet sync ownership; viet ADR/OpenAPI/DTO tests.
3. Chot auth, RLS/server authorization, Supabase Storage permissions, config/
   secrets/migrations. Khong dua service-role key vao frontend.
4. Tao development seed tu mock hien co: branches -> products/categories ->
   customers -> orders/items -> approvals -> fulfillment. Transaction,
   stable mappings, idempotent upsert, chi development/test, khong seed production.
5. Ket noi catalog/detail/search/quote; giu components/style, thay data boundary
   qua adapter co loading/error/empty/retry; khong fetch rai rac trong card.
6. Auth/customer -> cart/checkout/account -> Sales/order -> approval -> kho ->
   accounting. Moi buoc co fixture contract tests, permissions va regression.
7. KiotViet sync: initial import/delta, reconciliation, external IDs, retry/
   deduplication, sync-failure queue va observability. Tai lieu API KiotViet
   can xac minh chinh thuc tai thoi diem trien khai, khong doan endpoint/limit.
8. Chay pilot Quy Nhon voi du lieu da duyet; monitor SLA/error/credit/price
   leaks; chi mo rong chi nhanh sau review nghiep vu theo project.md.

Cau truc frontend/backend da tach theo yeu cau nguoi dung; khong can di chuyen
Next lan nua. Khi duoc phep lam backend, khoi tao NestJS trong backend/,
giu route/assets/style/fixture va QA; khong tu tao shared package khi chua can.

## 8. Cau hoi can chot voi doanh nghiep

- Supabase Auth hay Nest auth; staff/customer cung provider khong; invitation,
  phone verification, recovery, multiple contacts cho mot B2B customer?
- Nguon gia rieng/nhom, VAT, currency precision, discount stacking, quote expiry,
  ai duoc xin/duyet gia, per-line hay per-order, gia ap dung sau phe duyet?
- Credit terms/due dates, reservation cua pending/confirmed orders, overdue
  exception rules, receipt allocation, cancellation/refund va no cross-branch?
- Ton kho theo chi nhanh, reservation time, partial/backorder/alternate SKU,
  khi nao tru ton/ghi debt, API KiotViet credentials va conflict ownership?
- Shipping fee/noi thanh coverage, Sale/chanh xe information, ai tra phi,
  evidence khi pickup/handoff/delivered va policy hoi phuc don?
- Data completeness publication, SKU photos rights, approved company addresses/
  contacts, bao gia template va retention/audit rules?

Ghi ro assumption va nguoi duyet trong ke hoach API; khong tu ap chinh sach
"giam 10% cho moi B2B" hay "duyet request thi tu chuyen kho".

## 9. Checklist va kiem thu

- [ ] Tat ca luong UI trong MVP duoc chu don vi duyet; backlog con lai co quyet dinh.
- [ ] Fixture hien co duoc tai su dung, dem SKU khong double seed, mock IDs co mapping.
- [ ] DTO va response khong lo gia/no/contact/don cross-customer/branch.
- [ ] Loading, empty, 401/403/404, validation, out-of-stock, quote expiry,
  409 revision conflict, timeout/retry va sync-failure co UI/test.
- [ ] Hai luong checkout/Sales cung order service va khach/co staff projection dung.
- [ ] Transaction/idempotency, double submit/concurrent confirm/pick/approval/
  receipt, stale quote, revoked account va rollback duoc test tren server.
- [ ] Khong cho kho sua gia/qty, ke toan tu cap limit, customer tu duyet ngoai le.
- [ ] CSV/documents auth/ownership, reset demo isolation, reordering theo gia moi.
- [ ] Browser tests desktop/mobile va UI screenshot khong regress sau adapter.

QA hien co: `npm run test:approvals`, `test:sales`, `test:admin`, `test:warehouse`, `test:ui`,
`test:detail`, `test:cards`, `test:images`. Chu y `test:*` tren UI chi la
Chromium/frontend; khong thay the API/security/cross-browser tests.

Chay dev HOAC build/start tren `.next-preview`, khong chay chung distDir
dong thoi. `QA_BASE_URL=http://localhost:3010` va browser contexts cua QA
tach khoi browser nguoi dung. Sales report: `/tmp/bao-tin-ui-qa/admin-sales/report.json`.
Approval report: `/tmp/bao-tin-ui-qa/admin-approvals/report.json`.

## 10. Prompt ban giao cho agent tiep theo

```text
Doc docs/project.md, start-work.md, design-system.md, ui-ux-rules.md,
frontend-platform.md, admin-preview.md, api-handoff.md va cac mock/providers.
Nguoi dung muon duyet UI truoc, chua cho phep tu khoi tao backend.
Audit readiness theo code va yeu cau moi nhat; cap nhat backlog UI.
Khi UI da duoc duyet va nguoi dung yeu cau API, lap ke hoach NestJS + TypeScript
+ TypeORM + Supabase PostgreSQL dung lai mock hien co lam development fixtures.
Chi ra canonical models, adapter boundaries, auth/RBAC/branch/ownership,
quote/pricing/credit/approval/fulfillment/accounting, KiotViet sync,
transactions/idempotency/audit va tests; ghi assumption/cau hoi can chot.
Khong thay doi style hay tao catalog moi. Khong coi localStorage, priceFor,
mock orders va noindex la production data, auth, pricing policy hay protection.
Checkout va admin hien tach du lieu; API phai thong nhat order service.
Endpoint trong docs chi la de xuat, khong phai API da ton tai.
```
