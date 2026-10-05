# Bao Tin Frontend B2B & B2C

Repo nay chi chua Next.js frontend, TypeScript, Tailwind, Inter va Lucide.
Backend NestJS/TypeORM/JWT va media duoc quan ly rieng tai
[baotin-backend](https://github.com/thien-dev-77/baotin-backend).
Xem [Backend Integration](docs/backend-integration.md) cho contract API.
Ban cap nhat uu tien 1-6: [Operations UI](docs/operations-rollout.md).
Next.js 16.3.8, React 19.3.0; dung Node LTS >=22.13.

```txt
app/       Next.js App Router
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
[backend README](https://github.com/thien-dev-77/baotin-backend/blob/main/README.md).
Backend can chay cho API va anh: Next proxy /api/backend/* -> /api/*,
/images/* -> /media/images/* va /media/* -> /media/*.
Proxy dung Route Handlers + server fetch, khong dung external rewrites.
lib/backend-proxy.ts giu JSON, HTTP status, multipart va cookies; bo header
compression/content-length tu upstream. API luon private/no-store de CDN
khong cache response rong hoac session; upstream null/HTML/rong tra 502 JSON.
DATABASE_URL, JWT_SECRET va SEED_PASSWORD chi o backend, khong o frontend env.

API mode render catalog cong khai tren server cho home, category, search va
cac product cards: RootLayout fetch catalog truc tiep tu BACKEND_URL,
cache no-store, timeout 8 giay, khong forward cookie hay customerPrice vao HTML.
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
QA_BASE_URL=http://localhost:3041 npm run test:ssr
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
dieu kien xac minh truoc production. Runtime audit FE/BE hien 0 vulnerabilities;
FE full audit con 7 high dev tools/braces chua co ban fix. Khong audit force downgrade.
