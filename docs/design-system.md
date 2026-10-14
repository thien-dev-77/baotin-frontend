# Bao Tin design system

Code Next.js nam ngay tai goc repo FE; cac duong dan code trong tai lieu
tuong doi voi goc. `docs/` va `design/` giu nguyen; anh duoc phuc vu tu BE
qua Next.js Route Handler proxy va next/image, xem [backend-integration.md](backend-integration.md).

Tai lieu nay la chuan giao dien dung chung cho website B2B/B2C. Khi lam trang moi, uu tien dung cac token va component style trong file nay truoc khi tao style rieng.

## 1. Huong thiet ke

- Professional B2B commerce.
- Clean e-commerce, thong tin day du nhung khong roi.
- Phu hop nganh phu kien noi that, vat tu, catalog ky thuat.
- Khong lam nhu SaaS landing page.
- Khong lam nhu dashboard noi bo cho phan khach hang.

Cam giac can co:

- Tin cay.
- Gon gang.
- Ky thuat nhung de tiep can.
- Cao cap vua phai, khong xa xi.
- Dense vua du cho B2B.

## 2. Font

Font chinh:

```txt
Inter
Fallback: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
```

Quy tac:

- Body: 14px, line-height 1.5; metadata 12px, label phu 11-12px.
- Header/nav: dieu huong chinh 13px/20px weight 500-600, utility/nhan icon 11px/16px; dropdown item 16px.
- H1 desktop homepage: 30px, weight 700.
- H1 desktop product: 20-22px, weight 700.
- H1 mobile homepage: 26px; trang noi dung 24px.
- H2 desktop: 17-18px, uppercase neu la homepage section title.
- H3: 14-16px, weight 600. Ten san pham dung Regular 400 de de doc.
- Product price: 20px, weight 700; purchase panel 26px.
- Khong dung letter spacing am.
- Heading dung weight 600-700, body 400-500. Khong dung text qua dam cho toan bo UI.

## 3. Mau sac

Primary:

```txt
Brand yellow: #FFC400
Brand hover: #E5B000
Secondary black / heading / navigation / footer: #171717
```

Background:

```txt
Page: #FFFFFF
Section: #FAFAF7
Dark: #171717
```

Text:

```txt
Heading: #171717
Body: #525252
Muted: #737373
On dark: #FFFFFF
```

Border/shadow:

```txt
Border: #E5E5E5
Border hover: #FFC400
Card shadow: 0 2px 10px rgba(23, 23, 23, 0.06)
Hover shadow: 0 8px 24px rgba(23, 23, 23, 0.10)
Panel shadow: 0 18px 44px rgba(23, 23, 23, 0.18)
```

Status:

```txt
Success: #168A5A
Danger: #D92D20
```

- Ty le muc tieu: 70% white/off-white, 20% black/gray, 10% yellow.
- Vang chi cho CTA, icon, vien, nhan giam gia va diem nhan; khong phu vang hero hay section lon.
- Nut vang dung chu den `#171717`, khong chu trang. Lien ket tren nen trang dung chu den va underline/vien vang khi hover, khong dung chu vang nho.
- Nut "Nhan tu van / Qua Zalo" o header la ngoai le mau kenh: nen `#0068FF`, hover `#0056D6`, chu trang va icon SVG Zalo goc. Ap dung ca desktop/mobile; mau xanh nay khong thay token thuong hieu vang o cac CTA mua hang.
- Green/red chi cho trang thai thanh cong, loi va thao tac nguy hiem; khong dung lam mau thuong hieu hay gia san pham.
- Focus co outline den 2px; input/selection co vien vang. Khong chi dua vao mau de truyen dat active/loading/error.
- Token mau nam trong `tailwind.config.ts` va `:root` cua `app/globals.css`; khi doi phai cap nhat ca hai va chay branding QA. Khong them mau xanh/navy hardcode o component.

## 3.1. Logo va favicon

- `components/logo.tsx` dung Next Image voi `public/logo-baotin.png`, ti le goc 919:271. Khong ve lai, doi mau, crop hay keo gian logo.
- Header: rong 220px desktop >=1280px, 192px tablet/desktop hep, 152px mobile; admin dung `Logo compact` rong 176px. Chieu cao theo ti le anh, Next Image sizes khop voi chieu rong hien thi.
- `Logo inverted` dung `public/logo-baotin-white.png` o footer den, cung ti le 919:271. Nen trong suot, khong co khung trang/padding va khong dung filter lam bien doi artwork. Logo footer lazy-load; logo header/admin eager.
- Favicon, shortcut va Apple touch icon dung `public/favicon-baotin.png` qua `metadata.icons` trong `app/layout.tsx`. Hai asset nay nam o FE, khong phu thuoc media backend.
- Moi icon Zalo o header, ho tro nhanh, trang Lien he va product detail dung `components/zalo-icon.tsx` voi `public/zalo-icon.svg`. Giu nguyen artwork xanh/trang cua Zalo, khong ve lai bang MessageCircle/chu Zalo hay dat trong vong tron vang. SVG nay la asset co dinh, Next Image `unoptimized`, alt rong va aria-hidden vi link da co nhan; khong bat dangerouslyAllowSVG cho anh san pham. Co kich thuoc co dinh 18-32px theo ngu canh. Du lieu lien ket Zalo dung `isZalo: true` de renderer chon dung icon.

## 4. Radius

```txt
Control: 6-8px
Card: 8-10px
Panel/dropdown/modal: 10-20px
Hero/image block: 14-16px
Circle button: 999px
```

Quy tac:

- Button/input khong nen qua tron.
- Card san pham dung radius 3px, vien xam 1px, nen trang, khong shadow; card category giu radius 8px.
- Dropdown danh muc rong 320px, radius 8px; item chinh 44px, lien ket phu 36px. Trigger rong 220px/cao 44px, nen `Brand`, chu `Primary` 13px/600, hover/open dung `Brand Hover`.
- Homepage desktop: sidebar danh muc 256px ben trai hero, gap 16px, ca hai cao 408px. Tieu de va ten danh muc dung font 14px, line-height 20px. Duoi moi danh muc cha hien toi da 2 ten danh muc con, font 12px/16px mau Secondary, 1 dong ellipsis; tooltip giu day du ten. Lay tu cay danh muc trong API, fallback nhom subcategory cu neu chua co danh muc con. Link "Xem tat ca danh muc" co dinh o cuoi sidebar, danh sach cuon ben trong khi nhieu muc; khong tang chieu cao hero. Dung chung `CategoryLinks` voi dropdown, nhung dropdown/mobile khong hien preview va dropdown giu font 16px.
- Sidebar hover: `CategoryLinks flyout` mo panel con sang phai, hover delay 80ms va close delay 180ms de di chuot qua khe giua cac cot. Portal vao body de khong bi cat boi vung cuon; toi da 3 panel cho cay 4 cap. Panel rong toi da 272px, tu giam rong tren desktop hep de cac cot khong chong nhau; gioi han chieu cao/vi tri theo viewport, nen trang, radius 6px, font 14px/20px Regular. Giu preview khi mo de sidebar khong doi chieu cao. Mui ten phai mo va focus muc dau; len/xuong, Home/End chuyen muc; trai/Escape dong mot cap va tra focus. Click nut mui ten ho tro thiet bi touch desktop. Click ben ngoai, roi focus, cuon sidebar/trang, resize hoac chuyen trang thi dong; cuon panel chi dong cap sau. Hover chi ap dung desktop co chuot; dropdown va menu mobile van mo cay inline bang nut bam. Khong phat sinh API request khi hover.
- Hero chi co slide anh va control chuyen slide, khong text/caption, search hay overlay mau. Desktop cao 408px; tablet/mobile ti le 16:7.
- Header desktop co 3 hang: utility 36px nen `Section` (tagline, ho tro B2B, tai lieu, chinh sach, Zalo xanh), hang logo/tim kiem/tai khoan 88px, dieu huong 56px voi trigger danh muc vang. Search nen `Section`, cao 46px, nut icon Search vang 48px co aria-label/title. Dang nhap, yeu thich va gio hang dung icon 24px/nhan 11px, badge gio hang vang hien so luong thuc (gio trong hien 0, >99 hien 99+). CTA `Nhan bao gia` vang mo `/contact#consultation`; hotline >=1280px dung `storeContact`, khong che dieu huong o desktop hep. Link thuong hieu lay tu brand API, khong co dinh Hafele. Dieu huong chi dung trang co that, khong tao lien ket Du an/Tin tuc rong. Link header prefetch=false de khong tai API cac trang chua mo.
- Mobile: logo/hang icon 64px, search 40px va 3 lien ket nhanh (dang nhap, bao gia, Zalo); menu drawer giu danh muc long nhau, catalog, yeu thich, tai khoan va cac lien ket chinh. Khong lap search hay CTA o hero.
- Khi da dang nhap, icon thong bao desktop co nhan va can hang voi tai khoan/gio hang. Badge nam trong vung nut de khong tran hay de len control ben canh; van dung API count/Redux auth hien co, khong tai danh sach thong bao khi chua vao inbox. `NotificationBell withLabel` chi doi cach render trong header, default o admin/mobile khong doi.
- Tablet/mobile an sidebar va dung menu trong header; slide ho tro vuot, ban phim va click den danh muc.
- Trang category khong co banner: breadcrumb, tieu de/mo ta, danh muc con, bo loc va danh sach san pham.
- Section "Danh sach san pham" tren trang chu dang an; giu carousel va toi da 5 section danh muc co san pham cong khai, theo thu tu danh muc trong admin. Listing danh muc/tim kiem/thuong hieu/khuyen mai dung `ProductGrid desktopColumns={4}`: desktop >=1024px 4 cot, tablet 3 cot, mobile 2 cot. Cac grid khac mac dinh 5 cot desktop; section danh muc va carousel homepage van hien 5 item.
- Section danh muc khong co banner: tieu de uppercase ben trai, "Xem tat ca" ben phai, duong ke xam va lien ket subcategory nen xam o duoi. Khong goi API rieng cho moi section; du lieu lay tu catalog bootstrap.
- Tieu de `ProductCard` dung Inter Regular 400, 15px/22px, toi da 2 dong; card hep dung 14px/22px. Khong dung Medium/SemiBold cho ten san pham, khong them letter spacing va khong gach chan khi hover title.
- Anh `ProductCard` dung khung ti le 4:3, `object-fit: contain`, padding 6px de giam khoang trang nhung khong cat san pham. Noi dung padding 10px (8px tren card rat hep); spacing gia 6px, danh gia/tag 8px. Tag cao theo noi dung, khong dat min-height 64px hay de trong hai hang; ma hang/don vi cach noi dung toi thieu 10px va can cuoi row. "Xem chi tiet" la nut den chu trang cao 36px, rong theo noi dung, can giua va cach day anh 10px, radius 4px; Inter 13px/20px weight 500, card <=160px dung 12px; icon Eye 16px net 1.6. Khong phu thanh vang het chieu rong anh. Hover vien vang, keyboard focus vien trang ben trong; fade/slide 180ms tren desktop >=1024px co chuot (`hover: hover`, `pointer: fine`). Wishlist dich len 46px de khong che nut. Tablet/mobile va thiet bi cam ung an hoan toan nut nay; bam anh hoac ten de vao chi tiet. Card khong co nut them vao gio; mua hang tai trang chi tiet. Nut nam absolute, khong day noi dung card khi xuat hien; reduced motion tat transition.
- Gia ban mau den `Primary` 20px, gia niem yet mau `Muted` gach ngang ben canh; card hep tu dong xuong 17px/14px theo container query. Gia goc chi hien khi cao hon gia ban thuc te cua khach. Nhan giam gia dung nen `Brand`, chu den; yeu thich dung vang. Khong dung mau `Danger` cho gia, nhan khuyen mai hay hanh dong mua hang.
- Khong long card trong card.

## 5. Container va spacing

Container:

```txt
Desktop: max-width 1240px, width calc(100% - 48px)
Large desktop: max-width 1280px
Tablet: width calc(100% - 32px)
Mobile: width calc(100% - 24px)
```

Section spacing:

```txt
Desktop margin-top: 16-22px cho homepage; 24-32px cho cac trang noi dung.
Mobile margin-top: 16-24px.
```

Rule:

- Cac section homepage phai can cung container.
- Khong tao khoang trong qua lon.
- B2B user can quet nhanh nhieu san pham/danh muc.

## 6. Component chuan

### Button

Primary:

- Nen `#FFC400`, hover `#E5B000`.
- Chu den `#171717`.
- Height 40-44px.
- Radius 8px.
- Weight 600.

Secondary:

- Nen trang.
- Border `#E5E5E5`.
- Text primary.
- Hover nen `#FAFAF7`, vien `#FFC400`; chu van den.

Danger:

- Chi dung cho huy/xoa/tu choi.

### Card

Default:

- Background white.
- Border `#E5E5E5`, hover `#FFC400`.
- Radius 8-10px.
- Shadow nhe.
- Hover translateY -2px.

### Dropdown/panel

- Dropdown danh muc: width 320px, radius 8px, shadow nhe hai lop.
- Hien/an bang opacity va translateY 4px trong 160-180ms, khong scale chu hay blur trang.
- Danh muc chinh lay tu API: item 44px, icon vang 21px, font Inter 16px weight 500.
- Tach lien ket phu bang divider: item 36px, icon 18px, font 14px weight 500.
- Title 13px weight 600, khong uppercase; header co dinh khi list can cuon.
- Viewport desktop cao tu 768px khong can scrollbar; man hinh thap dung scrollbar mong trong list, khong nam sat mep panel.
- Mouse click khong tu focus item dau; ban phim Arrow Up/Down, Home/End, Escape, Tab; dropdown danh dau danh muc hien tai.
- Trigger van bam duoc de dong; click ngoai dong menu, backdrop nhe chi che phan duoi header.

### Product card

- Anh lon nen trang, `object-fit: contain`, khong cat hoac keo gian san pham.
- Ten toi da 2 dong, Inter 15px/22px weight 400; card hep dung 14px. Hover khong gach chan title.
- Gia ban den 20px bold, gia niem yet xam gach ngang. Badge vang chu den "GIAM -x%" o goc phai tren anh; chi hien khi co giam gia that.
- Danh gia chi dung `reviewSummary` tu API catalog (chi tinh review da duyet). Backend cu chua tra summary thi an hang danh gia, khong gia lap so sao/count.
- Tag thuoc tinh lay tu variantAttributes, kich thuoc, chat lieu va mau; toi da 4 tag, bo trung va placeholder. Khong tu them tinh nang san pham.
- Ma san pham va don vi 11px muted o chan card.
- Wishlist 40px o goc phai duoi anh; tren desktop khi thanh "Xem chi tiet" hien, wishlist dich len tren thanh de khong bi che. Khong che badge hay gia/ma hang. Khong co nut gio hang tren card.
- Chi dung `components/product-card.tsx` cho trang chu, listing, related, wishlist va account.
- Guest hien gia ban le; gia B2B demo chi hien sau dang nhap. Gia that phai lay tu server da xac thuc.

### Section heading

- H2 uppercase.
- 17-18px desktop, 16-18px mobile.
- Subtitle 11-12px.
- Link phai 11-12px den, hover underline vang.

## 7. Interaction

- Hover card: nhe, khong dramatic.
- Slider: arrow phai click duoc, scroll smooth.
- Tab san pham: active state ro.
- Search: focus hien dropdown.
- Dropdown danh muc: click mo/dong, Escape dong, click overlay dong.

## 8. Page rules

Homepage:

- Search la hanh dong chinh.
- Danh muc va B2B quick actions nam trong first scroll.
- Product carousel co tabs.
- Section san pham theo danh muc tren homepage an root `phu-kien-noi-that` (Phu kien moc noi that). Chi loc tai `HomeCategoryProducts` truoc gioi han so section; khong doi visibility API, sidebar/menu, tile danh muc, catalog hay admin. Cac section con lai van hien binh thuong.
- Quy trinh va ho tro nam trong mot band full-width nen `Section`, padding doc 24px va mot container chung. Quy trinh dung ordered list 5 buoc: desktop >=1024px 5 cot deu, moc so vang 28px/radius 4px o trai, ten buoc 13px/20px weight 600 va mo ta 12px/18px can hang; khong duong noi dai hay mui ten chen text. Tablet/mobile dung danh sach doc. Ho tro nhanh la 4 lien ket khong co khung card lon, icon 28px va text can tren, cao toi thieu 90px: desktop 4 cot voi divider doc, tablet 2 cot, mobile 1 cot voi divider ngang. So dien thoai va gio goi duoc xep cung hang khi du cho; noi dung van xuong dong khi hep.

Product detail:

- Breadcrumb tren cung.
- Desktop dung grid chung hai cot: noi dung ben trai, khoi gia/mua hang sticky ben phai. Dau cot noi dung chia gallery va thong tin tom tat.
- Thong tin tom tat chi hien thuong hieu, ten, danh gia va mo ta ngan; khong lap tag thong so hay bang thong so o tren. Lua chon bien the nam ngay sau mo ta ngan.
- Bien the dang chon dung nen/vien `Brand`, chu `Primary` va aria-current; lua chon khac nen trang, hover nen/vien `Brand`, khong gach chan. Hover bien the dang chon dung `Brand Hover`. Keyboard focus co outline `Primary` 2px, offset 2px. Giu lien ket toi SKU thuc va minimum touch target 40px.
- Bang thong so va tabs nam ngay duoi gallery/thong tin, trong cung cot noi dung va container; khong tao container long nhau.
- Khoi mua hang bam duoi header voi khoang cach 16px, dung lai khi het cot noi dung. Man hinh thap cho cuon noi dung khoi mua hang bang chuot/ban phim; tablet/mobile khong sticky va dat mua hang truoc bang thong so.
- Ma hang va tinh trang hang hien ro.
- Gia B2C/B2B khong bi lan.
- Duoi nut them gio hang co hai lien ket "Chat Zalo" va "Goi cho toi", nen trang, vien `Border`, text `Primary` 13px/20px weight 500, radius 6px; hover nen `Section`, vien `Brand`, chu den. Zalo dung SVG goc 24px; icon PhoneCall den 20px/net 1.8, ca hai nam trong khung icon 24px. Khong dung icon tron vang hay icon dien thoai vang. Chu viet thuong theo nhan, khong ep in hoa. Hai nut rong bang nhau, cao toi thieu 48px. Link Zalo mo tab moi; nut goi dung `tel:`. Van hien khi san pham het hang. Nut them gio hang giu nen `Brand` chu den de phan biet hanh dong chinh; gia mua dung `Primary`, khong dung `Danger`.
- So dien thoai va link Zalo dung chung tu `lib/store-contact.ts`, dong bo voi trang Lien he va ho tro trang chu.
- Thong so ky thuat dang bang.
- San pham lien quan nam cuoi trang duoi khoi mua kem, dung `ProductCard` theo hang ngang (4 item hien tai), cuon ngang tren tablet/mobile.

Admin/noi bo:

- Khong dung hero.
- Dung table/list, filter, status badge.
- Style van dung cung mau/radius/font nhung density cao hon.

## 9. Code mapping

CSS global:

- `app/globals.css`

Reusable classes:

- `.bt-container`
- `.bt-card`
- `.bt-panel`
- `.bt-button-primary`
- `.bt-button-secondary`
- `.bt-product-card`
- `.bt-input`
- `.bt-dialog`
- `.bt-sheet`
- `.bt-table`

Component dung chung:

- `SiteHeader`, `SiteFooter`: chi render mot lan trong `app/layout.tsx`.
- `SearchBox`, `CategoryMenu`: tim kiem/menu co ban phim, Escape va focus state.
- `ProductCard`, `ProductGrid`, `PriceDisplay`, `ProductCarousel`.
- `Breadcrumb`, `PageHeading`, `Button`, `Field`, `QuantityStepper`.
- `Modal` (dialog, drawer, bottom sheet, fullscreen), `Tabs`, `Pagination`.
- `EmptyState`, `ErrorState`, `CommerceLoading` va `app/loading.tsx`.
- `OrderTotals`, `OrderStatusBadge`, `OrdersTable`, `PromotionCard`, `GuideCard`.

Admin API actions:

- Dung `Button loading={busy}` cho nut goi API. Bat busy truoc `await`, don dep
  trong `finally` o ca success va error; khong doi label trong luc cho.
- Spinner thay icon dau nut; giu nguyen kich thuoc, accessible name va typography.
  Nut tu dong disabled va co `aria-busy`; icon-only button phai co `aria-label`.
- Lenh admin dung `pendingAction` (action, id, payload) de chi nut vua bam quay.
  Cac lenh khac bi khoa cho den khi thao tac hoan tat; khong bao thanh cong som.
- Dung `Modal busy={busy}` de khoa dong/Escape/backdrop khi dang luu. Khi loi,
  giu form va input, hien thong bao API, mo lai nut de nguoi dung thu lai.
- Upload anh va checkbox kiem hang dung chung `LoadingSpinner`. Nut lam moi va
  thu lai cung hien spinner; retry khong bien mat khi request dang cho.
- Khi cap nhat trang thai hoac refresh cung pham vi, giu nguyen bang, filter,
  pagination va scroll; chi thay du lieu khi API tra ve. Loading toan trang chi
  dung lan dau hoac khi doi tai khoan/quyen/chi nhanh duoc cap phep.
- Refresh that bai van giu du lieu hien tai va hien canh bao kem retry. Khong
  giu du lieu khac pham vi; response cu khong duoc ghi de trang thai vua luu.
- Auth UI doc user tu Redux Toolkit; khong goi kiem tra auth lai khi focus hay
  dieu huong. Loading auth toan trang chi cho bootstrap; kiem tra lai trong nen
  giu giao dien hien tai. 401 protected clear auth, 503 giu user va hien retry.

Responsive:

- Desktop >=1024px: header ba hang, sidebar loc, detail co cot noi dung va sidebar mua hang sticky.
- Tablet 640-1023px: toolbar loc, grid ba cot, account menu drawer.
- Mobile <640px: grid hai cot, search fullscreen, filter bottom sheet, cart item dung doc, tong tien co dinh.
- Homepage danh muc/giai phap/carousel cho phep cuon ngang; quy trinh dat hang dung doc tren mobile.
- Modal chi mount noi dung khi mo; native dialog giu focus va Escape, body khoa cuon.
- Respect `prefers-reduced-motion`; khong scale font theo viewport width.

Tailwind tokens:

- `primary`
- `primary-dark`
- `brand`
- `brand-hover`
- `section`
- `text-strong`
- `text-secondary`
- `text-muted`
- `border`
- `danger`
- `success`
