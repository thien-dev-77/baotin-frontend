# Bao Tin design system

Code Next.js nam ngay tai goc repo FE; cac duong dan code trong tai lieu
tuong doi voi goc. `docs/` va `design/` giu nguyen; anh duoc phuc vu tu BE
qua Next.js rewrite, xem [backend-integration.md](backend-integration.md).

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
- Header/nav: 12px, weight 500-600; dropdown item 16px.
- H1 desktop homepage: 30px, weight 700.
- H1 desktop product: 20-22px, weight 700.
- H1 mobile homepage: 26px; trang noi dung 24px.
- H2 desktop: 17-18px, uppercase neu la homepage section title.
- H3/card title: 14-16px, weight 600.
- Product price: 18px, weight 700.
- Khong dung letter spacing am.
- Khong dung text qua dam cho toan bo UI; chi dung 700/800 cho logo, H1, section title.

## 3. Mau sac

Primary:

```txt
Primary: #0F3157
Primary dark: #08233F
Blue: #1677D2
Blue hover: #0E65B8
```

Background:

```txt
Page: #FFFFFF
Section: #F5F8FC
Section blue: #F0F6FD
```

Text:

```txt
Strong: #102A43
Secondary: #52667A
Muted: #7B8A9A
```

Border/shadow:

```txt
Border: #E2E8F0
Card shadow: 0 2px 10px rgba(15, 49, 87, 0.06)
Hover shadow: 0 8px 24px rgba(15, 49, 87, 0.10)
Panel shadow: 0 18px 44px rgba(15, 49, 87, 0.18)
```

Status:

```txt
Success: #168A5A
Danger: #D92D20
```

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
- Card san pham va category dung radius 8-10px de giao dien gon va gan voi mockup.
- Dropdown danh muc rong 320px, radius 8px; item chinh 44px, lien ket phu 36px, trigger 32px.
- Homepage desktop: sidebar danh muc 256px ben trai hero, gap 16px, ca hai cao 408px. Tieu de va ten danh muc dung font 14px, line-height 20px. Dung chung `CategoryLinks` voi dropdown, nhung dropdown giu font 16px.
- Hero chi co slide anh va control chuyen slide, khong text/caption, search hay overlay mau. Desktop cao 408px; tablet/mobile ti le 16:7.
- Search, B2B, tu van, catalog va 3 cam ket dich vu chi nam trong header. Mobile co hang lien ket nhanh gon.
- Tablet/mobile an sidebar va dung menu trong header; slide ho tro vuot, ban phim va click den danh muc.
- Trang category khong co banner: breadcrumb, tieu de/mo ta, danh muc con, bo loc va danh sach san pham.
- Section "Danh sach san pham" tren trang chu dang an; giu carousel va 5 nhom khoa. ProductGrid dung chung tren cac trang: desktop >=1024px 5 cot, tablet 3 cot, mobile 2 cot; dang list khong doi. Carousel desktop hien 5 item.
- Nam nhom khoa: moi banner co mot hang 5 san pham desktop; tablet/mobile cuon ngang.
- Anh `ProductCard` phu kin vung anh, khong padding, `object-fit: cover`. "Xem san pham" chi hien giua anh khi hover/focus tren desktop >=1024px co chuot (`hover: hover`, `pointer: fine`). Tablet/mobile va thiet bi cam ung an hoan toan nut nay; bam anh hoac ten de vao chi tiet. Card khong co nut them vao gio; mua hang tai trang chi tiet.
- Gia trong card <=150px dung 16px theo container query de khong tran chu; card rong giu 18px. Font va spacing khac giu nguyen.
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

- Nen `#1677D2`.
- Chu trang.
- Height 40-44px.
- Radius 8px.
- Weight 600.

Secondary:

- Nen trang.
- Border `#CBD5E1`.
- Text primary.
- Hover sang `#F0F6FD`.

Danger:

- Chi dung cho huy/xoa/tu choi.

### Card

Default:

- Background white.
- Border `#E2E8F0`.
- Radius 8-10px.
- Shadow nhe.
- Hover translateY -2px.

### Dropdown/panel

- Dropdown danh muc: width 320px, radius 8px, shadow nhe hai lop.
- Hien/an bang opacity va translateY 4px trong 160-180ms, khong scale chu hay blur trang.
- 8 danh muc chinh: item 44px, icon xanh 21px, font Inter 16px weight 500.
- Tach lien ket phu bang divider: item 36px, icon 18px, font 14px weight 500.
- Title 13px weight 600, khong uppercase; header co dinh khi list can cuon.
- Viewport desktop cao tu 768px khong can scrollbar; man hinh thap dung scrollbar mong trong list, khong nam sat mep panel.
- Mouse click khong tu focus item dau; ban phim Arrow Up/Down, Home/End, Escape, Tab; dropdown danh dau danh muc hien tai.
- Trigger van bam duoc de dong; click ngoai dong menu, backdrop nhe chi che phan duoi header.

### Product card

- Anh phu kin vung anh bang `object-fit: cover`, khong keo gian sai ti le.
- Ten toi da 2 dong.
- Ma san pham 12px muted.
- Gia 18px bold.
- Wishlist 28px; khong che gia/ma hang. Khong co nut gio hang tren card.
- Chi dung `components/product-card.tsx` cho trang chu, listing, related, wishlist va account.
- Guest hien gia ban le; gia B2B demo chi hien sau dang nhap. Gia that phai lay tu server da xac thuc.

### Section heading

- H2 uppercase.
- 17-18px desktop, 16-18px mobile.
- Subtitle 11-12px.
- Link phai 11-12px blue.

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

Product detail:

- Breadcrumb tren cung.
- Desktop dung grid chung hai cot: noi dung ben trai, khoi gia/mua hang sticky ben phai. Dau cot noi dung chia gallery va thong tin tom tat.
- Bang thong so va tabs nam ngay duoi gallery/thong tin, trong cung cot noi dung va container; khong tao container long nhau.
- Khoi mua hang bam duoi header voi khoang cach 16px, dung lai khi het cot noi dung. Man hinh thap cho cuon noi dung khoi mua hang bang chuot/ban phim; tablet/mobile khong sticky va dat mua hang truoc bang thong so.
- Ma hang va tinh trang hang hien ro.
- Gia B2C/B2B khong bi lan.
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

Responsive:

- Desktop >=1024px: header hai hang, sidebar loc, detail co cot noi dung va sidebar mua hang sticky.
- Tablet 640-1023px: toolbar loc, grid ba cot, account menu drawer.
- Mobile <640px: grid hai cot, search fullscreen, filter bottom sheet, cart item dung doc, tong tien co dinh.
- Homepage danh muc/giai phap/carousel cho phep cuon ngang; quy trinh dat hang dung doc tren mobile.
- Modal chi mount noi dung khi mo; native dialog giu focus va Escape, body khoa cuon.
- Respect `prefers-reduced-motion`; khong scale font theo viewport width.

Tailwind tokens:

- `primary`
- `primary-dark`
- `blue-brand`
- `blue-hover`
- `section`
- `section-blue`
- `text-strong`
- `text-secondary`
- `text-muted`
- `border`
- `danger`
- `success`
