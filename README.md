# Bao Tin Frontend B2B & B2C

Repo nay chi chua Next.js frontend, TypeScript, Tailwind, Inter va Lucide.
Backend NestJS/TypeORM/JWT va media duoc quan ly rieng tai
[baotin-b2b-be](https://github.com/thien-dev-77/baotin-b2b-be).
Xem [Backend Integration](docs/backend-integration.md) cho contract API.

```txt
app/       Next.js App Router
components/ UI storefront, account va dashboard
lib/       Frontend adapters va mock hien co
scripts/   Playwright QA
shared/    Types va rules dung chung
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
[backend README](https://github.com/thien-dev-77/baotin-b2b-be/blob/main/README.md).
Backend can chay cho API va anh: Next proxy /api/backend/* -> /api/*,
/images/* -> /media/images/* va /media/* -> /media/*.
DATABASE_URL, JWT_SECRET va SEED_PASSWORD chi o backend, khong o frontend env.

`shared/` can cho frontend build, khong phai source NestJS. Types/rules duoc
version trong ca hai repo; khi doi contract can cap nhat ca FE va BE.
Tu 05/10/2026, source Next.js nam ngay tai goc repo; khong con thu muc
frontend/ hay npm wrapper. Backend clone rieng, khong commit vao repo FE.

## Kiem Thu

```sh
npm run lint
npm run build
npm run typecheck
```

Connected browser QA can repo backend rieng. Chay tu goc repo FE:

```sh
# Chi local DB + dev:local API; KHONG chay voi API Supabase
QA_BACKEND_DIR=../baotin-b2b-be npm run test:connected
# Cac QA ben duoi chi cho NEXT_PUBLIC_API_MODE=false
QA_BASE_URL=http://localhost:3010 npm run test:accounting
QA_BASE_URL=http://localhost:3010 npm run test:admin
QA_BASE_URL=http://localhost:3010 npm run test:sales
QA_BASE_URL=http://localhost:3010 npm run test:approvals
QA_BASE_URL=http://localhost:3010 npm run test:warehouse
QA_BASE_URL=http://localhost:3010 npm run test:ui
```

QA_BACKEND_DIR tro toi goc repo BE co package.json, dependencies va
.env.local cua DB test. Mac dinh tim repo baotin-b2b-be ben canh repo FE;
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
Production can persistent media volume o BE va HTTPS cookies.

## Tai Lieu

- [Project](docs/project.md)
- [Bat dau cong viec](docs/start-work.md)
- [Design system](docs/design-system.md)
- [Frontend platform](docs/frontend-platform.md)
- [Dashboard preview](docs/admin-preview.md)
- [Ban giao UI va ke hoach API](docs/api-handoff.md)
- [Thu tien va doi chieu](docs/accounting-preview.md)

**Gioi han:** du lieu mock persisted, auth/orders/admin da noi API; chua dong bo
KiotViet, bang gia thuc, stock ledger, credit ledger hay bank payment.
Khong cong bo du lieu seed/secrets. Tai lieu media ghi ro anh minh hoa va
dieu kien xac minh truoc production. Next.js 14 hien co audit high/critical,
can upgrade va regression-test truoc deploy production.
