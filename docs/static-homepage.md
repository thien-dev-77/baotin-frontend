# Static homepage handoff

Trang chu tinh da duoc dung bang Next.js + Tailwind de duyet UX/UI truoc khi lam backend.

Code Next.js nam ngay tai goc repo FE; `design/` giu nguyen o root.
Cac duong dan code ben duoi tuong doi voi goc repo. Anh da chuyen sang BE;
API mode hien tai xem [backend-integration.md](backend-integration.md).
Phan duoi ghi lai ban giao homepage tinh truoc tich hop API.

## Muc tieu

- Duyet giao dien truoc.
- Chua ket noi API/backend.
- Su dung mock data trong `lib/home-data.ts`.
- Bám visual reference trong `design/839a8103-bf56-4a25-8271-87e3a8a6a0a8.png`.

## Section da co

1. Header desktop: thanh cam ket, hang logo/search/dich vu va hang dieu huong danh muc.
2. Mobile header co logo, gio hang, menu va search.
3. Desktop co sidebar 8 danh muc ben trai hero (256px + banner, gap 16px, cao 408px). Hero chi con slide anh, mui ten va dots; khong chu/search/overlay. Tablet/mobile dung menu header, banner ti le 16:7.
4. Search, B2B/tu van/catalog va 3 cam ket dich vu o header; mobile co hang lien ket nhanh.
5. B2B quick actions.
6. Danh muc san pham chinh.
7. Bo giai phap cho B2C.
8. San pham ban chay/thuong mua.
9. Section "Danh sach san pham" dang an theo yeu cau; catalog va card dung chung tren cac trang khac khong thay doi.
10. Nam nhom khoa: Khoa dien tu, Khoa cua, Khoa tu, Tay nam cua, Phu kien cua. Moi nhom co banner, mot hang 5 san pham desktop; tablet/mobile cuon ngang. Banner va "Xem tat ca" mo danh muc con da loc.
11. Huong dan chon nhanh.
12. Quy trinh dat hang.
13. Ho tro nhanh.
14. Footer.

## File chinh

- `app/page.tsx`: giao dien trang chu.
- `app/globals.css`: CSS global va container.
- `lib/home-data.ts`: mock data cho section.
- `components/logo.tsx`: logo component.
- `components/search-box.tsx`: search va autocomplete UI.
- `components/section-heading.tsx`: heading section dung chung.
- `components/hero-visual.tsx`: hero slider co tuong tac.
- `components/product-showcase.tsx`: product carousel va tab san pham.
- `components/category-product-section.tsx`: banner + mot hang `ProductCard` dung chung + link danh muc.
- `lib/lock-catalog.ts`: 5 nhom va 25 SKU khoa; nguon anh/gia trong `docs/lock-category-assets.md`.
- `components/category-menu.tsx`: dropdown danh muc san pham.
- `docs/design-system.md`: chuan font, mau, radius, component cho cac trang tiep theo.

## Luu y

- Anh dang render dung asset local trong `public/images/catalog`, `public/images/solutions` va `public/images/locks`, khong phu thuoc URL remote.
- Khi co anh san pham goc, thay trong `lib/catalog.ts`; asset crop tu reference chi phuc vu duyet giao dien.
- Backend sau nay chi can thay mock data bang API response.
- B2B pricing hien dang la UI demo, chua co auth/phan quyen.
- Ban mo rong cac trang va huong dan kiem tra nam trong `docs/frontend-platform.md`.
