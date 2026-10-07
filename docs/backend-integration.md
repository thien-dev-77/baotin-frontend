# Backend Integration

Cap nhat 07/10/2026: doc [Experience Rollout](experience-rollout.md) cho thong bao,
B2B xin gia/thuong mua, PDF, tu van, CMS/reviews, KPI/tuoi no va Kiot read-only polling.

Cap nhat 05/10/2026: uu tien 1-6 da co code UI/API. Doc
[Operations Rollout](operations-rollout.md) cho rules, env, tests va checklist deploy.
Schema/ledger moi chi duoc dong bo o local; chua ap dung vao Supabase trong dot nay.

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
- FE lib/store/: Redux Toolkit auth slice, typed hooks, per-layout store factory.
- FE components/store-provider.tsx: client Redux provider, never a server singleton.
- FE components/admin/api-admin-provider.tsx: state va commands API.

Schema rieng baotin_app, cam public/auth/storage. Tao schema neu chua co,
goi synchronize() khi DB_SYNCHRONIZE=true, khong dropSchema/migration.
SYNCHRONIZE CO THE LAM MAT DU LIEU KHI DOI ENTITY: backup truoc thay doi,
khong xem cau hinh nay la an toan production.

11 bang ban dau: products, categories, customers, users, sessions, orders, approvals,
receipts, audit_events, leads, newsletter_subscriptions. Them 8 bang operations:
price_policies, inventory_balances, credit_balances, ledger_entries, password_resets,
integration_links, integration_runs, integration_outbox. Tong 19 bang khi deploy schema moi.
Ownership/branch/version/timestamps la columns; payload JSONB giu contract mock.
Commands validate references va transaction tren server.

63 SKU, 8 categories, 7 B2B customers, 18 orders, 3 approvals export tu
lib/catalog.ts va lib/admin-preview.ts o goc repo FE bang
`FRONTEND_DIR=../baotin-frontend npm run fixtures` tai goc BE.
INSERT ON CONFLICT DO NOTHING, khong overwrite khi restart,
khong lay localStorage lam seed; seed bi cam o production.
Seed orders bo sung **pickup details minh hoa** tu contact fixture va note
seed; phone khach le demo, khong che dia chi giao that. Snapshot stock/debt la
so du dau ky; giao dich moi dung ledger va reservations. Stock fallback chi Quy Nhon.
Guide/slide/solutions/reviews API mode da persisted trong backend; preview giu mock FE.

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
ghi de auth moi; logout/401 strip B2B prices.
Guest co initial catalog hop le khong fetch lai catalog luc hydrate.
`npm run test:ssr` kiem tra HTML khi tat JS, session loi/cham, personalization,
logout va screenshots desktop/mobile; chi chay QA_BASE_URL local.

### Frontend Auth Redux

Redux Toolkit `auth` la nguon duy nhat cho user/ready/checking/error trong API
mode; CommerceProvider expose `sessionUser`/customer tu Redux de cac view cu
khong can doi contract. Store tao rieng theo root layout/request, duoc giu khi
client navigation; khong tao singleton dung chung tren server.

- GET /auth/session chi bootstrap mot lan khi load/F5; dedupe React Strict Mode.
  Khong goi lai khi focus, chuyen trang hay cap nhat trang thai admin.
- Login/register lay user tu POST response; logout lay `{ user: null }` tu POST.
  Profile PATCH cung cap nhat Redux truc tiep. Khong them GET session sau login/logout.
- Refresh auth chi khi nguoi dung retry, doi mat khau/quyen cua chinh minh, hoac
  tab khac thong bao da doi auth. Refresh 503 giu user da xac thuc va hien retry.
- Protected API 401 clear Redux, orders/favorites va B2B prices; auth form 401
  (mat khau sai) va 403 (khong du quyen) khong tu dang xuat. Revision tai thoi
  diem request ngan 401 cu lam mat login moi.
- JWT chi o cookie HttpOnly. Khong luu JWT hay auth user/role vao Redux Persist,
  localStorage hoac sessionStorage. Storage `baotin-auth-event` chi chua type va
  nonce de dong bo tab; `baotin-customer` chi thuoc che do preview, khong phai auth that.
- Redux chi quyet dinh UI; backend van verify JWT/session revoke va doc quyen tu DB
  moi request. Bang sessions backend va contract cookie KHONG thay doi.

`npm run test:auth` kiem tra so request, navigation/F5, login/register/logout,
cross-tab, 401/403, malformed response va race bootstrap. `test:domain` gom unit
Redux isolation/error/revision. Cac test auth mock client API, khong ghi DB that.
Store/provider theo [huong dan Redux Toolkit cho Next.js](https://redux.js.org/usage/nextjs).

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
chi tiet truoc production. /admin/users da co tao/sua/vai tro/chi nhanh/disable/reset
password; doi thong tin quyen/mat khau thu hoi sessions. Can giu it nhat mot admin active.

Writes can Origin trong FRONTEND_ORIGINS va X-BaoTin-Client:web; DTO
whitelist/forbidNonWhitelisted. Auth/register/upload co rate limit.
Production can HTTPS; cookie Secure tu dong o production. Da co change-password
va recovery email token mot lan, TTL 30 phut; can SMTP_URL/EMAIL_FROM/FRONTEND_URL.
Chua co MFA. Khong cau hinh SMTP thi tra 503, khong bao gui email thanh cong gia.

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
| POST | /api/admin/products | Create product, private/public content fields |
| PATCH | /api/admin/products/:id | Edit product/gallery/visibility; current revision required |
| POST | /api/media/product-images | Multipart images, up to 10 files |
| GET | /api/account | Profile/preferences/own credit ledger entries |
| PATCH | /api/account/profile | name/company/phone/email/tax/address |
| PATCH | /api/account/preferences | addresses/settings/favorites |
| POST | /api/media/products/:id/image | Multipart image, authorized staff |
| POST | /api/contact/consultations | name/phone/email/message, persisted lead |
| POST | /api/contact/newsletter | email, subscription idempotent |
| GET | /api/contact/consultations | Admin/boss/Sales Quy Nhon, 100 leads moi nhat |

Gia/stock/phi/coupon tinh server, khong nhan unitPrice/total/customerId.
expectedTotal de phat hien gia doi. Idempotency-Key UUID bat buoc, unique DB;
cung request tra cung don, khac body/owner tra 409. Checkout/admin/account
chung orders service. Website order cho xac nhan, khong gan approval, da ho tro
sua o Sales editor qua /api/admin/orders/quote; expectedTotal/revision bat buoc khi sua.
Shipping/coupon tinh lai o server; khong doi customer/source. Sales-only giu price snapshot.
Tax theo business policy hien tai chua tach rieng.

14 admin commands xem src/admin/admin.dto.ts cua BE, rules xem src/admin/rules/.
Order commands can expectedRevision, stale tra 409. PostgreSQL advisory
transaction lock serialize pilot commands (mot lock/DB); can row locks khi scale.
Price/credit approval co snapshot, khong tu confirm/xuat kho. Receipt validate
amount/reference, reconcile/void/audit persisted; doi chieu tru debt cua don cong no,
void hoan lai mot lan. Confirm giu stock/han muc; ban giao moi tru ton va ghi no.
Ngay admin va receipts lay server time Asia/Ho_Chi_Minh, khong previewDate.

## Media

Anh goc da chuyen frontend/public/images -> media/images trong repo BE, relative
URL /images/* duoc Next Route Handler proxy. Upload /media/uploads/UUID.webp, URL luu
Product.image/gallery, binary luu disk backend, khong luu PostgreSQL.
Max5MB JPEG/PNG/WebP, Sharp validate bytes max20MP, rotate, resize<=2000px,
encodeWebP; bo filename client, khong SVG. Admin products co upload control.
media/images version trong Git; uploads ignored. Can persistent volume va
backup cung DB, khong dung ephemeral serverless filesystem. Product editor da co
upload nhieu anh, chon cover, doi thu tu va xoa khoi gallery qua PATCH product.
Anh bi bo khoi gallery va upload chua gan san pham van giu tren disk; chua co
orphan cleanup tu dong. Mock assets chua verify moi SKU.
Che do rieng tu an san pham khoi catalog/SSR/quote, khong bao mat URL file anh.
Chi tiet: [Product Management UI](product-management.md).

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

Chua production-ready: KiotViet connector da co preview/mapping/gia retail/export
va outbox doi chieu, nhung chua co credentials de kiem tra vendor that. Chua tu dong
sync stock/debt/status theo nguon van hanh, return/refund/bank, MFA,
fine-grained read permissions, pagination/OpenAPI, deployment/backup/observability.
Gia branch/group/customer/effectivity, ledger/reservations, staff management,
change-password/recovery va sua don website da implement; xem operations-rollout.md.
Contact da co man hinh xu ly leads va thong bao noi bo. Reviews API mode luu DB
va cho admin kiem duyet. Newsletter chua gui email that.
Frontend da nang Next.js 16.3.8, React 19.3.0; SSR/async params/images va UI
regression da test. Runtime audit FE/BE hien 0 vulnerabilities. FE full audit con
7 high trong dev glob tools/braces chua co ban fix; khong audit fix --force downgrade.
Gui email va KiotViet that van can credentials/acceptance; khong chay test tren Supabase.
Khong mo ban that chi vi local tests pass hoac Supabase da ket noi.

DB credential da gui qua chat: nen rotate password va cap nhat ignored env;
khong commit/log credential. Production dung DB user rieng, khong postgres
superuser, tach seed accounts khoi tai khoan kinh doanh.
