# Backend Integration

Cap nhat 04/10/2026. Stack theo yeu cau: NestJS, TypeScript, TypeORM
synchronize, Supabase PostgreSQL, JWT; seed mock cu va luu anh tren backend.
Giu giao dien frontend. Tai lieu nay thay hien trang preview trong api-handoff.md.
Tu 05/10/2026, source backend nam trong repo baotin-backend; repo baotin-frontend
chua app/, components/, lib/, scripts/, tests/ va docs/design ngay tai goc;
khong con thu muc frontend/ hay npm wrapper. Trong repo BE, src/, media/,
scripts/, seed/, certs/, test/ va package.json nam tai GOC repo, khong con
backend/ trung gian. Workspace local cu van co backend/ ignored; duong dan
source BE ben duoi tinh tu goc repo BE, khong phai file duoc push len FE.

## Ket Noi Va Chay

API hien dung Supabase **Session pooler** port 5432 theo URL nguoi dung
cung cap, luu rieng trong .env cua BE ignored (mode 600; workspace cu dung
backend/.env). TLS da xac minh
CA + hostname, DB_SSL=true, DB_SSL_CA_FILE=./certs/prod-ca-2021.crt; khong
tat verify. CA cong khai tai tu URL dashboard chinh thuc, provenance va
fingerprint trong certs/README.md cua BE.
Schema baotin_app ban dau khong co bang; TypeORM da synchronize 11 bang,
seed 63 products, 8 categories, 7 customers, 18 orders, 3 approvals va
12 users. Khong thay doi public/auth/storage.
Supabase direct host khong truy cap duoc tu mang may nay; khong can direct
host khi da dung Session pooler. .env.local cua BE va PostgreSQL
127.0.0.1:5441/baotin_dev van giu rieng cho integration tests.
Doc: https://supabase.com/docs/guides/database/connecting-to-postgres

Chay backend tai goc repo theo https://github.com/thien-dev-77/baotin-backend/blob/main/README.md.
Tai goc repo FE, .env.local theo .env.example:
NEXT_PUBLIC_API_MODE=true, BACKEND_URL=http://127.0.0.1:4000.
Root `npm run dev -- --port 3010`; API localhost:4000/api/health.
Next proxy /api/backend/* -> /api/* va images/media. Khong public DB/JWT env.
Proxy la Node Route Handlers tai app/api/backend, app/images va app/media,
server fetch toi BACKEND_URL. Khong con external rewrites trong next.config.
Giu multipart, Origin/CSRF va Set-Cookie; API private/no-store, JSON rong/null
hoac HTML tu upstream tra 502. Khong forward content-length/content-encoding
cua response decoded, tranh mat body JSON/anh tren hosting proxy.
Backend hien bind 127.0.0.1, deploy container can cau hinh bind/proxy rieng.
API_MODE=false la preview cu; anh van can media server cua BE. Khong tu fallback
mock khi API loi; doi NEXT_PUBLIC_* can restart/rebuild frontend.

## Cau Truc Va Seed

- BE src/database: DataSource, entities va SeedService.
- BE src/auth/catalog/orders/admin/account/media: modules nghiep vu.
- FE lib/types.ts va lib/api-types.ts: types va API response contract.
- FE lib/admin-*.ts, lib/order-rules.ts, lib/pricing.ts: UI/preview validation.
- BE src/types/: types cua backend; src/admin/rules/: business rules.
- BE src/catalog/pricing.ts: seed pricing tren server; hai repo khong import nhau.
- FE lib/api-client.ts: fetch same-origin, cookie, errors.
- FE lib/backend-proxy.ts: API/media proxy, cookies, safe paths, timeout.
- FE lib/server-api.ts: catalog/product SSR, hidden SKU 404.
- FE lib/commerce-api.ts: validate catalog/session responses, strip private prices.
- FE components/admin/api-admin-provider.tsx: state va commands API.

Schema rieng baotin_app, cam public/auth/storage. Tao schema neu chua co,
goi synchronize() khi DB_SYNCHRONIZE=true, khong dropSchema/migration.
SYNCHRONIZE CO THE LAM MAT DU LIEU KHI DOI ENTITY: backup truoc thay doi,
khong xem cau hinh nay la an toan production.

11 bang: products, categories, customers, users, sessions, orders, approvals,
receipts, audit_events, leads, newsletter_subscriptions. Ownership/branch/version/timestamps la columns;
payload JSONB giu contract mock. Chua normalized ledger/FK day du.
Commands validate references va transaction tren server.

63 SKU, 8 categories, 7 B2B customers, 18 orders, 3 approvals export tu
lib/catalog.ts va lib/admin-preview.ts o goc repo FE bang
`FRONTEND_DIR=../baotin-frontend npm run fixtures` tai goc BE.
INSERT ON CONFLICT DO NOTHING, khong overwrite khi restart,
khong lay localStorage lam seed; seed bi cam o production.
Seed orders bo sung **pickup details minh hoa** tu contact fixture va note
seed; phone khach le demo, khong che dia chi giao that. Stock/debt la snapshot
mock. Guide/slide/solutions/reviews van o frontend, chua co CMS API.

## Auth Va Quyen

Passwords scrypt salted. Cookie baotin_session HttpOnly, SameSite=Lax,
JWT HS256 2 gio, fixed issuer/audience, session ID persisted DB. Remember
chi giu cookie toi 2 gio, khong gia han token. Logout revoke session.
Role/branches/customerId doc tu DB moi request, khong tin client.
Khach moi pending, limit/debt=0; activate khong tu cap han muc, suspended bi chan.
API mode bo qua preview identity/orders trong localStorage.
Cart/favorites cache API dung key baotin-commerce-api-v1; preview cu giu
nguyen baotin-commerce-v1, khong xoa don demo cu khi chuyen che do.

Tu 05/10/2026, RootLayout lay catalog public server-side va truyen vao
CommerceProvider de HTML dau tien co san product cards. Request server
khong forward cookie, dung no-store + timeout 8 giay; customerPrice luon
bi loai tru truoc serialize. Khong cache/SSR profile, orders hay B2B prices.
Client validate session truoc khi doc user; `{ user: null }` la guest hop le,
nhung body null, HTML va shape sai phai hien loi co the retry. Catalog,
orders, favorites cap nhat doc lap, co version guard chong response cu
ghi de session moi; logout/session invalid strip B2B prices.
Guest co initial catalog hop le khong fetch lai catalog luc hydrate.
`npm run test:ssr` kiem tra HTML khi tat JS, session loi/cham, personalization,
logout va screenshots desktop/mobile; chi chay QA_BASE_URL local.

Guest orders thuoc HTTPOnly UUID cookie baotin_guest, khong truy van bang
ma don cong khai; mat cookie mat quyen xem guest orders. Staff login /admin,
B2B khong co admin access. Branch chi thao tac theo user.branches.

| Role | Lenh |
| --- | --- |
| admin | Tat ca tren branches duoc gan |
| boss | Duyet gia/cong no, customer status, publication |
| sales | Tao/sua/xac nhan/huy, xin duyet, customer, publication, kho |
| warehouse | Queue da confirm: pick, shortage, soan/ban giao |
| accountant | Receipt, reconcile, void, due date |
| b2b | Own account/orders/preferences va personalized catalog |

Kho bi redaction prices/debt/approvals/receipts, UI chi mo kho. Staff khac
hien co read model chung theo branch; server gioi han write roles. Mot so
nut van hien cho role khong du quyen va tra 403; can permission-aware UI
chi tiet truoc production. Chua co user/role management screen.

Writes can Origin trong FRONTEND_ORIGINS va X-BaoTin-Client:web; DTO
whitelist/forbidNonWhitelisted. Auth/register/upload co rate limit.
Production can HTTPS + COOKIE_SECURE=true; chua co MFA/recovery email.

## API Contract

| Method | Backend path | Input / view |
| --- | --- | --- |
| GET | /api/health | API va DB health |
| POST | /api/auth/login | identity, password, remember? |
| POST | /api/auth/register | name/company/phone/email/password |
| GET | /api/auth/session | user/customer/role/branches |
| POST | /api/auth/logout | Revoke session |
| GET | /api/catalog | Published catalog, customerPrice sau auth active |
| GET | /api/catalog/:slug | Retail detail cho SSR |
| POST | /api/orders/quote | items(productId/quantity), delivery, coupon |
| POST | /api/orders | Quote input + customer/payment/note/expectedTotal? |
| GET | /api/orders | Own B2B hoac guest orders |
| GET | /api/admin/state | Scoped state, today server |
| POST | /api/admin/commands | action/branch/id?/expectedRevision?/payload |
| GET | /api/account | Profile/preferences/own reconciled payments |
| PATCH | /api/account/profile | name/company/phone/email/tax/address |
| PATCH | /api/account/preferences | addresses/settings/favorites |
| POST | /api/media/products/:id/image | Multipart image, authorized staff |
| POST | /api/contact/consultations | name/phone/email/message, persisted lead |
| POST | /api/contact/newsletter | email, subscription idempotent |
| GET | /api/contact/consultations | Admin/boss/Sales Quy Nhon, 100 leads moi nhat |

Gia/stock/phi/coupon tinh server, khong nhan unitPrice/total/customerId.
expectedTotal de phat hien gia doi. Idempotency-Key UUID bat buoc, unique DB;
cung request tra cung don, khac body/owner tra 409. Checkout/admin/account
chung orders service. Website order chua ho tro sua o Sales editor (can requote
policy). Sales form tao ho chua tinh shipping/coupon/thue.

14 admin commands xem src/admin/admin.dto.ts cua BE, rules xem src/admin/rules/.
Order commands can expectedRevision, stale tra 409. PostgreSQL advisory
transaction lock serialize pilot commands (mot lock/DB); can row locks khi scale.
Price/credit approval co snapshot, khong tu confirm/xuat kho. Receipt validate
amount/reference, reconcile/void/audit persisted; KHONG tru opening debt mock.
Ngay admin va receipts lay server time Asia/Ho_Chi_Minh, khong previewDate.

## Media

Anh goc da chuyen frontend/public/images -> media/images trong repo BE, relative
URL /images/* duoc Next Route Handler proxy. Upload /media/uploads/UUID.webp, URL luu
Product.image/gallery, binary luu disk backend, khong luu PostgreSQL.
Max5MB JPEG/PNG/WebP, Sharp validate bytes max20MP, rotate, resize<=2000px,
encodeWebP; bo filename client, khong SVG. Admin products co upload control.
media/images version trong Git; uploads ignored. Can persistent volume va
backup cung DB, khong dung ephemeral serverless filesystem. Chua delete/reorder
gallery API; anh cu giu trong gallery. Mock assets chua verify moi SKU.

FE dung next/image voi sharp, sizes cho card/gallery/banner. Mac dinh lazy,
priority chi cho hero dau va gallery chinh; slide chua xem chua mount.
/_next/image toi uu source tu Route Handler /images hoac /media, binary
van luu o backend. Clear CDN cache sau redeploy neu /images/* van 422.

## Kiem Thu Va Gioi Han

Supabase smoke ngay 04/10/2026 da pass: TLS authorized, health va catalog
qua Next proxy, user IDs API khop DB Supabase, JWT HttpOnly, login/logout
admin/B2B, dashboard va bao gia server. Playwright storefront/detail o
1440/768/390/320px: anh khong loi, khong tran ngang, font Inter; login admin,
B2B account reload, san pham lien quan va bundle load. Chi tao/huy auth
sessions, khong tao/sua don hay du lieu kinh doanh. Sau QA van 63 products,
18 orders, 12 users, sessions=0; TypeORM schema diff co 0 lenh can dong bo.
Screenshots /tmp/bao-tin-ui-qa/supabase. Khong thay the full integration tests
bang smoke-test nay.

Tai goc repo BE: `npm test` cho passwords/domain guards.
`npm run test:api` tai goc BE: JWT/CSRF/branch/roles, ownership/pending, server quote,
idempotency/revision, checkout->Sales->warehouse->account, approval/receipt,
publication/upload/logout. Chi local DB, cleanup ban ghi test.
`npm run test:connected`: Playwright desktop/tablet/mobile, checkout/Sales/account
reload, images, HTTPOnly cookie, accounting/upload control. Screenshots /tmp.
Tai goc repo FE, dung `QA_BACKEND_DIR=../baotin-backend npm run test:connected`.
Mac dinh tim repo BE ben canh FE; workspace cu can set QA_BACKEND_DIR toi
thu muc backend thuc te.
Hai bo test ghi/xoa du lieu va chi duoc chay voi API `dev:local` + database
`.env.local`; dung API Supabase truoc khi chay. Frontend proxy phai tro den
API local cho connected QA. Hostname API localhost khong co nghia DB local.
Preview QA cu can API_MODE=false, khong chung assertion cho API mode.

Chua production-ready: can KiotViet sync,
gia group/customer/effectivity, stock theo branch + tru/hoan ton, credit ledger
va reserve han muc cac don dang mo (hien guard chi snapshot mock), bank/refund,
notifications, CMS/reviews, password recovery/MFA, staff management, fine-grained
read permissions, pagination/OpenAPI, deployment/backup/observability.
Contact/newsletter da luu DB, chua gui email/thong bao va chua co man hinh
xu ly leads. Reviews submit tren product van la preview client, khong persisted.
Frontend Next.js 14.2.35 hien bi npm audit bao high/critical. Can nang len
ban patched duoc ho tro va regression-test truoc deploy; chua lam major
framework upgrade trong dot noi API nay. Backend runtime audit hien 0 vulnerabilities.
Khong mo ban that chi vi local tests pass hoac Supabase da ket noi.

DB credential da gui qua chat: nen rotate password va cap nhat ignored env;
khong commit/log credential. Production dung DB user rieng, khong postgres
superuser, tach seed accounts khoi tai khoan kinh doanh.
