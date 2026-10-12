# Bao Tin Frontend B2B & B2C

Repo nay chi chua Next.js frontend, TypeScript, Tailwind, Inter va Lucide.
Backend NestJS/TypeORM/JWT va media duoc quan ly rieng tai
[baotin-backend](https://github.com/thien-dev-77/baotin-backend).
Xem [Backend Integration](docs/backend-integration.md) cho contract API.
Ban cap nhat uu tien 1-6: [Operations UI](docs/operations-rollout.md).
Them/sua san pham, nhieu anh va hien thi rieng tu:
[Product Management UI](docs/product-management.md).
File Excel mau de chuan bi san pham va danh muc:
[Catalog Excel Template](docs/catalog-excel-template.md).
Gia niem yet, CK B2C/B2B va thu tu uu tien bang gia:
[Product Pricing](docs/product-pricing.md).
Phan trang, cache rieng va trang thai tai admin:
[Admin Performance](docs/admin-performance.md).
Next.js 16.3.8, React 19.3.0; dung Node LTS >=22.13.

## Cap Nhat 12/10/2026

Code moi duoc push len nhanh **develop** cua ca frontend va backend.
Chon nhanh nay tren GitHub de xem README/code moi; chua merge vao main.

- Admin san pham co 5 cot: gia niem yet, CK B2C, gia sau CK B2C,
  CK B2B va gia sau CK B2B. Form nhap gia/CK, hai gia sau CK chi doc.
- CK B2C va B2B tinh doc lap tu gia niem yet. Backend tu tinh gia;
  bang gia theo khach/nhom/chi nhanh van uu tien hon CK B2B mac dinh.
- Sua noi dung san pham cu khong tu doi gia. Chi chuyen sang cong thuc moi
  khi sua phan gia/CK; don hang da luu giu nguyen gia snapshot.
- Card va trang chi tiet dung gia thuc te API tra ve. Khach chua dang nhap
  khong thay CK B2B; nhan giam gia tren card khop voi gia cua khach.
- CSV va [Excel mau v2](public/templates/bao-tin-catalog-mau-v2.xlsx) co du
  thong tin gia. Excel co cong thuc va o ket qua duoc khoa; chua co upload/import Excel.
- Admin danh sach dung API phan trang va dashboard rieng, khong tai toan bo
  `/admin/state`. Tai lai nen giu bang, bo loc va vi tri cuon; form canh bao
  thay doi chua luu. Da sua loi lan nhap dau o CK bi quay ve gia tri cu.

```txt
app/       Next.js App Router
  (storefront)/ Layout SSR va cac route ban hang/tai khoan
  admin/       Layout rieng, khong fetch catalog storefront
components/ UI storefront, account va dashboard
lib/       Types, frontend adapters, validation va mock hien co
scripts/   Playwright QA
tests/     Unit tests cho rule frontend
docs/      Nghiep vu, design system, quy tac UI, ban giao API
design/    Anh thiet ke tham chieu
package.json, package-lock.json va cau hinh Next.js/Tailwind/TypeScript o goc
```

## Chay Frontend

```sh
npm ci
# Tao .env.local tai goc theo .env.example
npm run dev -- --port 3010
```

Website: http://localhost:3010. Quan tri: http://localhost:3010/admin.
Thu tien va doi chieu: http://localhost:3010/admin/accounting.
Frontend env: NEXT_PUBLIC_API_MODE=true, BACKEND_URL=http://127.0.0.1:4000.
Chay API tu repo backend theo
[backend README](https://github.com/thien-dev-77/baotin-backend/blob/develop/README.md).
Backend can chay cho API va anh: Next proxy /api/backend/* -> /api/*,
/images/* -> /media/images/* va /media/* -> /media/*.
Proxy dung Route Handlers + server fetch, khong dung external rewrites.
lib/backend-proxy.ts giu JSON, HTTP status, multipart va cookies; bo header
compression/content-length tu upstream. API luon private/no-store de CDN
khong cache response rong hoac session; upstream null/HTML/rong tra 502 JSON.
DATABASE_URL, JWT_SECRET va SEED_PASSWORD chi o backend, khong o frontend env.

API mode render catalog cong khai tren server cho home, category, search va
cac product cards: layout `app/(storefront)/layout.tsx` fetch catalog truc tiep
tu BACKEND_URL. RootLayout chi chua providers chung; layout admin khong tai
catalog storefront. Cache DTO cong khai 15 giay, timeout 8 giay, khong forward
cookie hay gia/CK B2B vao HTML cong khai.
CMS cache 60 giay; lenh ghi thanh cong qua proxy expire cache ngay. API browser,
account/admin, checkout va chi tiet san pham van no-store.
CommerceProvider nhan du lieu ban dau, sau hydrate chi bo sung session/gia B2B,
orders va favorites doc lap. Khong doi orders/account de hien thi san pham.
Response null/HTML/malformed session hien loi co nut thu lai, khong doc `.user`
tu null. API down khong tu fallback sang san pham mock; preview van giu nguyen.

Anh dung next/image + sharp production, sizes/srcset theo tung vung. Card,
category, thumbnails va noi dung duoi man hinh lazy-load; hero dau tien va
gallery chinh priority. Hero chi mount slide da xem de khong tai ca 3 slide
ngay luc mo trang. data-image-src giu URL goc cho QA/debug.

FE tu quan ly types trong lib/types.ts, API responses trong lib/api-types.ts
va validation trong lib/admin-*.ts. BE co types/rules rieng trong src/;
khong import code giua hai repo. Khi doi API can cap nhat DTO va FE adapter,
kiem tra contract tuong thich. Xem [Code structure](docs/code-structure.md).
Tu 05/10/2026, source Next.js nam ngay tai goc repo; khong con thu muc
frontend/ hay npm wrapper. Backend clone rieng, khong commit vao repo FE.

## Kiem Thu

```sh
npm run lint
npm run build
npm run typecheck
npm run test:domain
# Sau khi chay frontend voi API mode va backend local
QA_BASE_URL=http://127.0.0.1:3010 npm run test:ssr
# API mode: browser QA voi API mock, khong sua database
QA_BASE_URL=http://127.0.0.1:3010 npm run test:admin-loading
QA_BASE_URL=http://127.0.0.1:3010 npm run test:pricing
npm run test:catalog-template
```

Connected browser QA can repo backend rieng. Chay tu goc repo FE:

```sh
# Chi local DB + dev:local API; KHONG chay voi API Supabase
QA_BACKEND_DIR=../baotin-backend npm run test:connected
# Cac QA ben duoi chi cho NEXT_PUBLIC_API_MODE=false
QA_BASE_URL=http://localhost:3010 npm run test:accounting
QA_BASE_URL=http://localhost:3010 npm run test:admin
QA_BASE_URL=http://localhost:3010 npm run test:sales
QA_BASE_URL=http://localhost:3010 npm run test:approvals
QA_BASE_URL=http://localhost:3010 npm run test:warehouse
QA_BASE_URL=http://localhost:3010 npm run test:ui
```

QA_BACKEND_DIR tro toi goc repo BE co package.json, dependencies va
.env.local cua DB test. Mac dinh tim repo baotin-backend ben canh repo FE;
workspace cu can truyen QA_BACKEND_DIR toi thu muc backend thuc te.
API/unit tests backend chay trong repo BE, khong co script backend o root FE.
Anh van can media server cua BE. QA browser can server dang chay va Chromium
Playwright; lan dau chay `npx playwright install chromium`.
Khong build/dev tren cung distDir: build voi NEXT_DIST_DIR=.next-build neu
dev server dang chay. Chay typecheck sau build khi Next da sinh xong types.

## Deploy

Ban cap nhat hien tai nam tren **develop**, khong phai main.
Chon Repository `thien-dev-77/baotin-frontend` va Branch `develop` tren server.
Deploy backend `thien-dev-77/baotin-backend` tu nhanh `develop` truoc,
kiem tra health, sau do build/redeploy frontend de DTO gia/CK tuong thich.
Commit README tren develop khong cap nhat deployment dang theo doi main.
Neu chua thay thay doi, kiem tra branch va commit trong deployment log;
chay redeploy tu commit moi sau khi luu dung cau hinh branch.

Chon **Root Directory = .** (hoac de trong), khong chon frontend/.
Install `npm ci`, build `npm run build`, start `npm run start` khi tu host Node.
Frontend env tai goc theo .env.example; BACKEND_URL tro toi backend host.
BACKEND_URL phai co http:// hoac https://; tren cloud dung HTTPS backend.
Sau thay doi proxy/next-image, build va redeploy FE; clear CDN cache neu con
response API rong hoac /images/* 422 tu deploy cu. Khong cache /api/backend/*.
Su dung npm ci voi optional native dependencies cua sharp (khong --omit=optional).
Production can persistent media volume o BE va HTTPS cookies.

## Tai Lieu

- [Project](docs/project.md)
- [Thong bao, CMS va cac luong UI/API moi](docs/experience-rollout.md)
- [Quan ly khach B2B, Sales phu trach va khach thu nghiem](docs/customer-management.md)
- [Quan ly danh muc, anh dai dien va nhom san pham](docs/category-management.md)
- [Gia niem yet, CK B2C/B2B va bang gia rieng](docs/product-pricing.md)
- [Toi uu tai du lieu va UX admin](docs/admin-performance.md)
- [Excel mau catalog v2](docs/catalog-excel-template.md)
- [Cau truc code](docs/code-structure.md)
- [Bat dau cong viec](docs/start-work.md)
- [Design system](docs/design-system.md)
- [Frontend platform](docs/frontend-platform.md)
- [Dashboard preview](docs/admin-preview.md)
- [Ban giao UI va ke hoach API](docs/api-handoff.md)
- [Thu tien va doi chieu](docs/accounting-preview.md)

**Gioi han:** du lieu mock persisted; da co bang gia customer/group/branch,
stock/credit ledger, reservations, account management/recovery va website edit/requote.
KiotViet connector can credentials va acceptance; SMTP can cau hinh de gui that.
Chua co auto Kiot stock/debt/status sync hay bank/refund.
Khong cong bo du lieu seed/secrets. Tai lieu media ghi ro anh minh hoa va
dieu kien xac minh truoc production. Chay `npm audit --omit=dev` va `npm audit`
tren dependency lock hien tai truoc deployment; khong audit force downgrade.

## Performance

SSR/catalog, font and homepage data optimizations: [performance-optimization.md](docs/performance-optimization.md).
