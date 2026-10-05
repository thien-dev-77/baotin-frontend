# Bao Tin - Frontend review handoff

## Pham vi

Ban Next.js + TypeScript + Tailwind de duyet giao dien va thao tac truoc khi lam backend.
Tu 05/10/2026, App Router va toan bo Next.js nam ngay tai goc repo FE;
khong con frontend/ hay npm wrapper. Backend da noi API va quan ly rieng
trong repo baotin-b2b-be; doc [backend-integration.md](backend-integration.md).
Phan duoi la ban giao preview truoc tich hop. Cac duong dan code tuong doi
voi goc repo FE, lenh npm chay tai goc.
Visual reference: `design/839a8103-bf56-4a25-8271-87e3a8a6a0a8.png` va `design/trangchitiet.png`.

**Day la frontend preview, khong phai he thong da san sang nhan don hang that.**
Dang nhap, gia B2B, cong no, don hang va form lien he hien dung du lieu mau/local storage.

## Trang va route

| Route | Noi dung / thao tac |
| --- | --- |
| `/` | Hero chi anh + sidebar danh muc, B2B quick actions, giai phap, product carousel, 5 nhom khoa (banner + mot hang 5 item + Xem tat ca), huong dan, quy trinh, ho tro. Section "Danh sach san pham" dang an. Search/B2B/tu van/catalog/cam ket dich vu trong header |
| `/category/:slug?subcategory=:name` | Breadcrumb, tieu de, danh muc con, loc, sap xep, grid/list, phan trang; khong banner. Query danh muc con hop le duoc chon san, query la/nhieu gia tri bi bo qua |
| `/search?q=ray+450` | Tim ten/ma/thuong hieu, loc, tab san pham/danh muc/thuong hieu, empty state |
| `/products/:slug` | Gallery, zoom, thong so, gia, so luong, gio, yeu thich, tabs, related, mua cung |
| `/product/:slug` | Alias redirect den route plural da co |
| `/cart` | Cap nhat/xoa so luong, coupon, tong tien, goi y san pham |
| `/checkout` | Thong tin -> nhan hang -> thanh toan, validation, tom tat don |
| `/order/success?id=:id` | Tiep nhan don, ma/tong tien, Inside Sales xac nhan |
| `/order/:id` | Don khach le da luu tren trinh duyet, timeline, dat lai |
| `/login`, `/register` | Form B2B, an/hien mat khau, nho dang nhap, luong tai khoan moi |
| `/account` | Tong quan, don gan day, san pham thuong mua |
| `/account/orders`, `/account/orders/:id` | Tim/loc don, desktop table, mobile list, chi tiet, dat lai |
| `/account/products` | San pham thuong mua, dat nhanh theo ma va so luong |
| `/account/favorites`, `/wishlist` | San pham da luu, nut bo yeu thich, empty state |
| `/account/company` | Luu ten/cong ty/email/phone/ma so thue/dia chi |
| `/account/addresses` | Them, sua, xoa dia chi; luu theo tai khoan |
| `/account/credit` | Cong no/han muc mau, lich su, xuat CSV, tai khoan moi khong co han muc |
| `/account/settings` | Luu tuy chon thong bao; lien he ho tro thay mat khau |
| `/admin` | Dashboard noi bo, chi nhanh/ky, KPI, bieu do va hang doi xu ly; khong dung header/footer ban hang |
| `/admin/orders`, `/admin/approvals` | Tim/loc/CSV don; chi tiet, gate duyet ngoai le, chuyen trang thai, huy co ly do; duyet/tu choi bat buoc y kien |
| `/admin/approvals/new?order=:id&type=credit` | Sales gui gia de nghi theo SKU hoac ngoai le cong no, snapshot va scope cho rieng don; tu choi co the gui lai |
| `/admin/orders/new`, `/admin/orders/:id/edit` | Inside Sales tao ho khach B2B/B2C, SKU/so luong, thong tin nhan hang, source/delivery/payment; sua pending chua gan approval, bat buoc ly do |
| `/admin/warehouse` | Hang doi tat ca don da xac nhan chua ban giao, checklist, bao thieu/xu ly thieu, lich su va CSV; khong thao tac gia/cong no |
| `/admin/products`, `/admin/customers`, `/admin/credit` | Danh muc/anh/trang thai ban, ho so B2B, kich hoat/tam ngung, cong no/qua han/han muc mau |
| `/brand/:slug` | Thuong hieu, banner gon, san pham, loc va sap xep |
| `/promotions` | Banner, promotion cards co loc, san pham giam gia |
| `/guides`, `/guides/:slug` | Huong dan chon hang, san pham goi y, bai lien quan |
| `/contact` | Phone/email/Zalo, chi nhanh, ban do, form tu van mau |
| `/catalog` | Catalog theo nhom, xuat CSV, in/luu PDF qua trinh duyet |
| `/policies/:slug` | Noi dung chinh sach mau, can doanh nghiep duyet |
| `/404`, route khong ton tai | Not found, ve trang chu/xem san pham |

Co `app/loading.tsx`, `app/error.tsx` va empty states theo tung luong.

## Component va du lieu

`app/layout.tsx` cung cap Inter va `CommerceProvider`. `SiteFrame` render header/footer ban hang mot lan cho cac route storefront/account, va bo qua cho `/admin`.
Dashboard dung `AdminProvider`/`AdminShell` rieng, state mau tach biet; xem `docs/admin-preview.md`.
Inventory mock, backlog UI, mapping du lieu va huong dan agent lap ke hoach API
sau duyet giao dien: [api-handoff.md](api-handoff.md). Chua co API hien huu;
don checkout va admin hien van tach biet, khong phai luong end-to-end server.

- Header/navigation: `SiteHeader`, `CategoryMenu`, `SearchBox`; tai su dung `Logo`. `HomeCategorySidebar` va dropdown dung chung `CategoryLinks`.
- San pham: mot `ProductCard`, `ProductGrid`, `PriceDisplay` cho moi trang; `ProductCarousel` dung lai. Desktop 5 cot/item; tablet 3 cot, mobile 2 cot. Card co anh phu kin (`object-fit: cover`), "Xem san pham" khi hover/focus tren desktop co chuot; tablet/mobile va touch an nut, bam anh/ten vao chi tiet. Khong them vao gio tren card. Mua hang tai trang chi tiet.
- UI: `Button`, `Breadcrumb`, `PageHeading`, `Field`, `QuantityStepper`, `Tabs`, `Pagination`, `Modal`, `EmptyState`, `ErrorState`.
- Don hang: `OrderTotals`, `OrderStatusBadge`, `OrdersTable`, `CommerceLoading`.
- Noi dung: `SectionHeading`, `GuideCard`, `PromotionCard`, `HeroVisual`.
- `CatalogListing` dung cho category/search/brand/promotions; khong tao listing rieng moi trang.
- `AuthView`, `AccountShell`, cac view trong `account-pages.tsx` dung chung ho so/context.

Khong co backend API san co de tai su dung. Tai su dung ma/ten san pham, section data va reference cua repo.
`lib/catalog.ts` cung cap types, catalog 63 san pham, 8 danh muc, 3 thuong hieu, 4 huong dan va helper tim/gia.
`lib/lock-catalog.ts` bo sung 5 nhom khoa va 25 SKU; `CategoryProductSection` dung lai `ProductCard`, khong tao card rieng.
`lib/home-data.ts` giu data section trang chu va du lieu san pham cu lam dau vao.
`CommerceProvider` cung cap thao tac gio/yeu thich/ho so/don hang cho cac view.

### Product Detail

`components/product-detail.tsx` ghep bo cuc, dieu phoi tab/danh gia va do header bang `ResizeObserver` de cap nhat offset sticky/anchor.
Grid chung chua gallery + overview o cot trai, thong so + tabs ngay ben duoi; purchase panel o cot phai va span ca hai hang.
Tablet/mobile giu thu tu gallery/overview -> purchase -> thong so/tabs. Khoi mua kem va san pham lien quan nam duoi grid trong cung container.
Cac phan rieng nam trong `components/product-detail/`:

| File | Trach nhiem |
| --- | --- |
| `product-gallery.tsx` | Thumbnail, doi anh, zoom; tu quan ly photo/zoom |
| `product-overview.tsx` | Ten/thuong hieu, thong so tom tat, nut nhay den danh gia |
| `product-purchase-panel.tsx` | Gia guest/B2B, so luong, them gio, yeu thich; sticky desktop, cuon noi dung tren man hinh thap |
| `product-service-benefits.tsx` | Cam ket/giao hang/doi tra/ho tro |
| `product-specifications.tsx` | Bang thong so, anchor `specifications` |
| `product-information-tabs.tsx` | Mo ta, tai CSV, FAQ, tab danh gia |
| `product-reviews.tsx` | Danh sach va modal/form danh gia |
| `related-products.tsx` | Hang ngang cuoi trang, 4 card desktop, cuon ngang tablet/mobile; dung lai `ProductCard` |
| `product-bundle.tsx` | Checkbox mua kem, gia B2B va them cac muc duoc chon |

`lib/product-detail.ts` giu types, thong so, review mau va helper related/bundle.
Review data giu o trang cha de khong mat khi doi tab; so luong/gallery/checkbox giu o component so huu.
Route giu `key={product.id}` de reset state khi chuyen sang san pham khac.
Bo cuc moi giu nguyen noi dung, CSV va luong commerce; khong them backend hay doi gia/ton kho.

Anh dang render la asset local trong `public/images/catalog`, `public/images/solutions` va `public/images/locks`.
Chi tach vung anh tu reference, khong render screenshot giao dien thanh mot anh nen.
Anh demo co do phan giai thap va nhieu SKU dung chung anh nhom: can thay bang anh goc dung ma truoc production.
25 anh khoa lay tu HafeleHome, gia la snapshot de duyet UI, ton kho/gia B2B van mock. Can duyet quyen su dung anh, bien the va bang gia Bao Tin truoc production; xem `docs/lock-category-assets.md`.

## Quy tac B2B va luu tru

- Guest chi thay gia ban le va CTA dang nhap B2B. Khong co bang gia B2B that trong catalog public.
- `priceFor()` la gia demo, khong phai gia rieng cua doanh nghiep hay co che bao mat.
- Login preview chap nhan email/so dien thoai hop le va mat khau >=6 ky tu. Khong kiem tra mat khau voi server.
- Password khong duoc luu. Dung thong tin thu nghiem, khong nhap mat khau/du lieu khach hang that.
- Login mo phong doi tac hien huu; register tao tai khoan `pending`, han muc/cong no bang 0, khong co don cu mau.
- Moi don checkout co trang thai `Cho xac nhan`; Inside Sales xac nhan truoc khi kho soan hang.
- Gia trong order la snapshot tai luc dat; reorder dung gia/tinh trang san pham hien tai.
- Thanh toan cong no chi hien cho tai khoan B2B co han muc demo; khong thu tien hay tru han muc that.
- Coupon thu nghiem: `BAOTIN10`, giam 10%, toi da 100.000 VND.
- Phan giu lieu: `baotin-commerce-v1` (gio/yeu thich/don/coupon), `baotin-customer` (session), `baotin-profile-*` (ho so demo theo email/phone).
- Dang xuat xoa session; ho so da luu van giu tren browser. Dang nhap lai dung email/phone da luu khong tu doi tai khoan pending thanh active.
- Dia chi va settings dung key theo customer ID; xoa storage/site data de reset ban duyet.
- Nho dang nhap dung localStorage; khong nho dung sessionStorage. Day khong phai phien dang nhap bao mat.
- Contact/newsletter/review la thao tac frontend; khong gui email/Zalo, khong luu len server.
- Phone, dia chi cua hang, ban do va chinh sach hien la noi dung mau, can thay thong tin da duyet.

## Responsive va accessibility

- Desktop >=1024px: header co hang cam ket dich vu, search va lien ket B2B/tu van/catalog, hang danh muc; sidebar loc, detail co cot noi dung + purchase sticky; table don hang. Homepage: sidebar 256px ben trai banner chi anh, gap 16px, cung cao 408px.
- Tablet 640-1023px: toolbar loc, grid ba cot, account menu drawer.
- Mobile <640px: logo/gio/menu, search fullscreen, filter bottom sheet, product grid hai cot.
- Cart mobile item doc va thanh tong tien co dinh; checkout mot cot; timeline doc.
- Native dialog trap focus, Escape, khoa scroll; chi mount noi dung khi mo.
- Category menu: Arrow Up/Down, Home/End, Escape va tra focus.
- Autocomplete: Arrow Up/Down, Enter, Escape; tab co ban phim, nut icon co accessible name.
- Form co label va native validation; khong dung placeholder thay label.
- Respect reduced motion; khong dung font theo viewport width.

## Chay va kiem tra

```sh
NEXT_DIST_DIR=.next-preview npm run dev -- --port 3010
npm run lint
npm run typecheck
npm run test:menu
npm run test:cards
npm run test:home-locks
npm run test:detail
npm run build
npm run start -- --port 3010
QA_BASE_URL=http://localhost:3010 QA_PASS=review npm run test:ui
```

Chay dev HOAC build/start, khong chay dev va build tren cung `.next` cung luc.
Preview cong 3010 dung `.next-preview` rieng; build/start mac dinh dung `.next`.
Khong chay hai dev server cung distDir. `NEXT_DIST_DIR` la tuy chon, khong doi output build mac dinh.
Playwright can Chromium: `npx playwright install chromium` neu may chua co.
Co the truyen `PW_CHROMIUM_PATH` den executable Chromium da cai san.
QA chi tao/sua du lieu trong browser context thu nghiem, khong sua localStorage cua trinh duyet nguoi dung.

Script `scripts/ui-qa.mjs` kiem tra:

- Gio luu sau reload, coupon hop le/khong hop le, validation checkout.
- Checkout guest/B2B, shipping, tong tien va trang thai cho Inside Sales.
- Gallery/zoom/tabs, login/register/logout, tai khoan moi khong tu cap cong no.
- Luu profile/ma so thue/dia chi, them dia chi, reorder.
- Loc san pham, grid/list, autocomplete/menu bang ban phim, slider.
- 29 route tinh huong tren 5 viewport: 1440x900, 1280x800, 1024x768, 768x1024, 390x844.
- Chi mot header/footer, anh tai duoc, khong tran ngang, khong co JS pageerror.
- Mobile filter/menu/search, Escape, mo lai va chon ket qua.

Anh chup va report JSON nam trong `/tmp/bao-tin-ui-qa/<QA_PASS>/`.

QA rieng dropdown: `scripts/category-menu-qa.mjs` / `npm run test:menu`.
Kiem tra 4 viewport desktop (gom man hinh thap 1024x600), 3 tablet/mobile (gom 320px),
toggle, click ngoai, Arrow/Home/End/Escape/Tab, focus, dieu huong, active state,
resize va reduced motion. Kiem tra them sidebar homepage, can hang/chieu cao,
link bang ban phim, slider chi anh, crossfade, vuot mobile, link cua anh, search va dich vu chi nam trong header.
Anh/report luu o `/tmp/bao-tin-ui-qa/category-menu/`.

QA card dung chung: `scripts/product-card-qa.mjs` / `npm run test:cards`.
Kiem tra 6 viewport (1440, 1280, 1024, 768, 390, 320px), grid desktop 5 cot,
carousel 5 item, anh phu kin, CTA hover/focus/touch, card list/related,
yeu thich, dieu huong chi tiet, mua hang tai trang chi tiet va trang thai het hang.
Anh/report luu o `/tmp/bao-tin-ui-qa/product-cards/`.

QA 5 nhom khoa: `scripts/home-lock-categories-qa.mjs` / `npm run test:home-locks`.
Kiem tra 6 viewport (1440, 1280, 1024, 768, 390, 320px), banner khong cat chu,
5 item tren mot hang, cuon ngang tablet/mobile, 25 anh tai duoc, CTA chi tiet,
banner/Xem tat ca loc dung nhom sau reload, query khong hop le, 25 route chi tiet va them gio.
Anh/report luu o `/tmp/bao-tin-ui-qa/home-lock-categories/`.

QA chi tiet: `scripts/product-detail-qa.mjs` / `npm run test:detail`.
Kiem tra 6 viewport va 2 man hinh desktop cao 600px: thong so/tabs trong cot noi dung,
related theo hang ngang, purchase sticky khong che header, cuon bang ban phim/chuot va resize.
Kiem tra thumbnail/next/prev/zoom, so luong va ton kho, gia B2B,
danh gia giu qua cac tab, CSV UTF-8 BOM, FAQ, chon mua kem, reset state khi doi san pham,
alias/404 va section trang chu da an. Anh/report o `/tmp/bao-tin-ui-qa/product-detail/`.
Chi truyen `QA_DETAIL_BASELINE_DIR` khi doi chieu voi baseline cung bo cuc; baseline truoc thay doi layout khong con phu hop.

### Ket qua da kiem tra

- `npm run lint`: pass, khong warning/error.
- `npm run typecheck`: pass.
- `npm run build`: pass, tat ca route compile thanh cong.
- QA `handoff-final` tren ban production build tai `http://localhost:3010`: pass, `issues: []`, 29 tinh huong route x 5 viewport = 145 anh chup trang.
- Luong guest: 2 ban le x 28.000 + ship 30.000 = 86.000 VND, don cho xac nhan.
- Luong B2B reorder: 2 ban le x 25.000 + nhan tai cua hang 0 = 50.000 VND, don cho xac nhan.
- Da kiem tra them slider cuon that, phan trang, gia autocomplete B2B, so luong nguyen va focus search mobile sau Escape.
- Dang nhap lai bang so dien thoai giu trang thai pending va han muc 0 cua tai khoan moi; ho so cong ty luu sau reload.
- Hai luot tinh chinh visual: sua the related bi ep cot tren mobile/banner/footer; sau do sua focus search va fullscreen/bottom sheet.
- Tinh chinh anh LED day, de/nap/vit ban le; bo mua kem uu tien phu kien thay vi cac mau ban le thay the.
- Da kiem tra ban do OpenStreetMap sau khi cuon den iframe lazy: tai va hien thi duoc.
- Report cuoi: `/tmp/bao-tin-ui-qa/handoff-final/report.json`; anh desktop/mobile va overlay trong cung folder.
- Sau QA production, da mo lai dev server cong 3010 va smoke test home/detail/wishlist, anh, overflow, menu mobile: pass.
- QA sidebar/homepage: pass, `issues: []`, 4 viewport desktop va 3 tablet/mobile (gom 320px); cung chieu cao 408px tren desktop, slider chi anh, ban phim/vuot/link anh, search va dich vu nam trong header.
- QA sau thay doi hero/header (`image-only-hero`): pass, `issues: []`, 29 tinh huong route x 5 viewport = 145 anh chup; luong mua hang va cac trang dung chung header khong ghi nhan loi.
- Report hero/header: `/tmp/bao-tin-ui-qa/image-only-hero/report.json`. Build moi voi `NEXT_DIST_DIR=.next-preview` thanh cong; da mo lai preview cong 3010.
- Preview da tach output `.next-preview` khoi server cu; QA dieu huong tu lan compile dau khong bi HMR reload. Report: `/tmp/bao-tin-ui-qa/category-menu/report.json`.
- QA card moi: pass, `issues: []`, 6 viewport (gom touch 320px/390px/768px); grid desktop 4 cot, carousel 4 item, anh cover, CTA giua anh hover/focus/touch, khong cart tren card; mua hang tai trang chi tiet van hoat dong.
- QA 5 nhom khoa: pass, `issues: []`, 6 viewport, 20 anh local, mot hang 4 item desktop/cuon ngang tablet-mobile; banner va Xem tat ca mo dung danh muc con, reload giu bo loc, query la/nhieu gia tri khong tao bo loc sai. 20 trang chi tiet va them gio da duoc kiem tra.
- Sau bo sung nhom khoa: lint/typecheck, build `.next-preview` va QA card dung chung deu pass. Report moi: `/tmp/bao-tin-ui-qa/home-lock-categories/report.json`.
- Cap nhat 5 cot: ProductGrid/Carousel/5 nhom khoa dung 5 item moi hang desktop; homepage 15 item, moi nhom khoa 5 SKU; CTA chung "Xem san pham". Gia trong card hep dung container query de khong tran chu.
- QA sau cap nhat 5 cot: lint/typecheck/build pass, test:cards va test:home-locks pass tren 6 viewport. QA `five-column-cards`: 29 tinh huong x 5 viewport, `issues: []`, gio/checkout va cac trang account van hoat dong. Report: `/tmp/bao-tin-ui-qa/five-column-cards/report.json`.
- Regression `product-card-refresh`: pass, `issues: []`, 29 tinh huong route x 5 viewport = 145 anh chup. Report: `/tmp/bao-tin-ui-qa/product-card-refresh/report.json`; QA card rieng: `/tmp/bao-tin-ui-qa/product-cards/report.json`.
- Sau thay doi card/grid, lint, typecheck va production build voi `NEXT_DIST_DIR=.next-preview` deu pass; preview da mo lai tai cong 3010.
- Refactor product detail thanh cac component gallery/overview/purchase/specifications/tabs/reviews/related/bundle; section "Danh sach san pham" tren home da an, carousel va 5 nhom khoa van giu nguyen.
- QA detail tren production: pass, `issues: []`, 6 viewport; 6 anh chup trang chi tiet co SHA-256 khop baseline truoc refactor. Gallery/zoom, so luong/ton kho, review qua cac tab, CSV, mua kem, reset state khi doi san pham va gia B2B deu pass. Report: `/tmp/bao-tin-ui-qa/product-detail/report.json`.
- QA card sau khi an section home: pass tren 6 viewport, `issues: []`; home van co carousel 10 san pham, cac listing giu grid 5/3/2 cot. Report: `/tmp/bao-tin-ui-qa/product-cards/report.json`.
- Regression `product-detail-refactor`: pass, 29 tinh huong route x 5 viewport = 145 anh chup, `issues: []`; lint/typecheck va build `.next-preview` deu pass. Report: `/tmp/bao-tin-ui-qa/product-detail-refactor/report.json`.
- Cap nhat layout chi tiet: thong so/tabs nam trong cot noi dung duoi gallery/overview; purchase sticky ben phai; related chuyen thanh hang ngang cuoi trang, khong dung card list.
- QA layout chi tiet tren production: pass, `issues: []`, 6 viewport va 2 desktop cao 600px. Kiem tra container/thu tu mobile, related cuon ngang, offset duoi header, sidebar cuon bang chuot/ban phim va resize; cac luong gallery/review/CSV/commerce van pass. Report: `/tmp/bao-tin-ui-qa/product-detail/report.json`.
- Sau thay doi layout, lint/typecheck/build `.next-preview` va QA card tren 6 viewport deu pass. Report card: `/tmp/bao-tin-ui-qa/product-cards/report.json`.
- Thay anh crop nho bang anh goc local: 3 hero, 8 danh muc chinh va LED/ray am/ro keo/tay nam. Nguon, kich thuoc va gioi han quyen su dung/SKU: `docs/image-assets.md`.
- QA anh: pass tren 6 viewport/cau hinh chuot-touch va mat do 2x/3x. CTA "Xem san pham" an tren tablet/mobile/touch; anh/ten san pham van dieu huong den chi tiet. Report: `/tmp/bao-tin-ui-qa/image-quality/report.json`.
- Dashboard noi bo da co 6 route `/admin`, menu mobile va bang cuon ngang. QA 1440/1024/768/390/320px: pass; kiem tra gate duyet, pipeline, huy, kich hoat/tam ngung, CSV, tim/loc/phan trang, persistence/reset va tach storefront. Report: `/tmp/bao-tin-ui-qa/admin/report.json`.
- Hoi quy `admin-and-image-refresh`: 29 trang x 5 viewport, 145 anh chup, `issues: []`; gio/checkout/B2B/account van hoat dong. Lint, typecheck va build `.next-preview` pass.
- Bo sung `/admin/warehouse`: hang doi theo chi nhanh (khong bo sot don cu), checklist, bao thieu co validation, xu ly thieu, ban giao va lich su thao tac mau. Gate checklist/bao thieu cung ap dung trong trang don hang chung.
- QA kho 5 viewport: pass, `issues: []`, gom reload, CSV, lich su, ready-stage shortage, storage cu/hong va reset. Report: `/tmp/bao-tin-ui-qa/admin-warehouse/report.json`.
- Hoi quy admin sau bo sung kho: 7 route x 5 viewport, `issues: []`; luong duyet/gia/cong no, pipeline/checklist, huy, khach/san pham va reset commerce deu pass. Lint/typecheck/build `.next-preview` pass.
- Bo sung form Inside Sales tao/sua don, picker catalog dung chung va thong tin recipient/delivery/payment trong chi tiet/kho. Gia va fixture cu giu nguyen, don moi cho xac nhan; khong tao backend.
- QA Sales 5 viewport: tao/sua/reload/xac nhan/chuyen kho, validation, B2B pricing/credit/stock, approval lock, chi nhanh, storage cu/hong va reset isolation. Report: `/tmp/bao-tin-ui-qa/admin-sales/report.json`.
- Hoi quy Sales handoff: admin 7 route x 5 viewport, kho 5 viewport va storefront/account deu pass, `issues: []`. Report storefront: `/tmp/bao-tin-ui-qa/sales-handoff/report.json`.
- Tai lieu `docs/api-handoff.md` ghi readiness/backlog UI, mock inventory, model mismatch commerce/admin, quy tac, de xuat API va prompt agent. Chua danh dau toan bo UI hoan tat hay cho phep khoi tao backend.
- Bo sung `/admin/approvals/new`: Sales gui gia de nghi/cong no, snapshot de nguoi duyet xem, price projection cho rieng don, gate hai loai doc lap va gui lai sau tu choi; khong doi bang gia/han muc/debt.
- QA approval 5 viewport: pass, gom input/gate/price scope, branch/order state, reload/storage/reset. Hoi quy admin/Sales/kho va storefront `approval-requests` (29 route x 5 viewport, 145 anh chup) pass. Report: `/tmp/bao-tin-ui-qa/admin-approvals/report.json`, `/tmp/bao-tin-ui-qa/approval-requests/report.json`. Build/lint/typecheck pass.

Day la QA Chromium cho frontend preview, khong thay the accessibility audit, cross-browser test hay backend test.

Cap nhat thu tien/tach folder: `/admin/accounting` co phieu thu tung phan,
doi chieu/chenh lech, huy co ly do va han thanh toan. Debt snapshot khong doi.
Doc `docs/accounting-preview.md` (root). QA accounting 5 viewport + guard,
admin 8 route x 5 viewport, Sales/approvals/kho va storefront/account
`accounting-folder-split` pass, `issues: []`; build/lint/typecheck pass.
Ghi chu lich su truoc tich hop: Next.js va QA tung nam trong frontend/ va
backend/ chua co API. Hien tai FE ngay tai goc, BE quan ly rieng va da noi API;
doc backend-integration.md cho hien trang.

## TODO Truoc Production

1. Duyet UI va thay anh goc theo SKU, logo/brand assets, thong tin cua hang/chinh sach/tai lieu ky thuat.
2. Ket noi NestJS/TypeORM/Supabase sau khi chot hop dong du lieu, khong doi component style.
3. Auth that: cookie/session hoac token server, phan quyen customer/role; khong tin role/han muc tu localStorage.
4. Lay gia B2B/gia rieng tu server da xac thuc; khong serialize gia rieng trong guest HTML/JS/public API.
5. Server tinh lai gia, coupon, ship, ton kho; tao don transaction/idempotency, chi tiet don kiem tra quyen so huu.
6. Credit/debt phai den tu he thong van hanh; duyet han muc, gia dac biet va chuyen kho chi sau Inside Sales.
7. Ket noi payment, contact/newsletter, forgot/change password, review moderation va dia chi hanh chinh.
8. Dong bo KiotViet va ket noi du lieu that cho Inside Sales/kho/ke toan/admin. Giao dien quan tri tinh da co tai `/admin`, chi dung du lieu mau; xem `docs/admin-preview.md`.
9. Test backend/integration, accessibility audit day du, Safari/Firefox, performance va SEO truoc go-live.
