# Ke hoach bat dau xay dung website B2B/B2C

Tai lieu nay dung de bat dau cong viec phat trien he thong dua tren `docs/project.md`.
Muc tieu la tao MVP co the van hanh thu tai chi nhanh Quy Nhon trong 90 ngay.

## Cap nhat thu tu trien khai

Cap nhat 05/10/2026: Next.js nam ngay tai goc repo baotin-b2b-fe, khong con
frontend/ hay npm wrapper. Backend NestJS/TypeORM/JWT da ket noi Supabase va
seed mock, quan ly rieng trong repo baotin-b2b-be. Doc
[backend-integration.md](backend-integration.md) cho hien trang API va cach chay.
Roadmap ben duoi giu lich su giai doan frontend-first, khong phai hien trang API.

- Duyet frontend tuong tac voi du lieu mau truoc khi ket noi backend.
- Chuan component, danh sach route, gioi han mock va checklist backend: `docs/frontend-platform.md`.
- Dashboard quan tri noi bo de duyet UI: `/admin`; pham vi va luong thao tac mau: `docs/admin-preview.md`. Khong nham voi `/account` cua khach B2B.
- Luong Inside Sales tao/sua don mau: `/admin/orders/new`, `/admin/orders/:id/edit`.
- Xin duyet gia/cong no tu don B2B: `/admin/approvals/new`; duyet snapshot tai `/admin/approvals`, quay lai don de xac nhan truoc khi chuyen kho.
- Tai lieu agent lap ke hoach API sau duyet UI: [api-handoff.md](api-handoff.md). Co inventory mock, readiness/backlog, mapping model, guard va lo trinh; UI chua day du va chua bat dau backend.
- Thu tien/doi chieu va due date mau: `/admin/accounting`; doc `docs/accounting-preview.md`.
- Cau truc thu muc da tach; chi khoi tao API sau khi thong nhat giao dien va hop dong du lieu.
- Ke hoach MVP ben duoi van la roadmap he thong that, khong phai cam ket frontend preview da van hanh that.

## 1. Muc tieu giai doan dau

He thong khong thay the KiotViet ngay lap tuc. Website va API se dong vai tro:

- Catalog san pham cho B2B va B2C.
- Cong dat hang cho khach B2B hien huu.
- Noi tiep nhan don hang B2C.
- Noi Inside Sales xac nhan don truoc khi kho soan hang.
- Noi quan ly gia B2B, gia dac biet va thong tin cong no co ban.

Nguyen tac quan trong:

- KiotViet van la he thong van hanh goc.
- Ma hang tren website phai khop ma hang KiotViet.
- Don B2B khong tu dong xuat kho trong MVP.
- Khach B2B phai dang nhap moi thay gia B2B.
- Khach moi mac dinh khong co han muc cong no.

## 2. Stack ky thuat

Frontend:

- Next.js
- TypeScript
- Tailwind CSS

Backend:

- NestJS
- TypeScript
- TypeORM

Database va ha tang:

- Supabase PostgreSQL
- Supabase Storage cho hinh anh san pham neu can
- Supabase Auth hoac auth rieng trong NestJS

Kien truc hai repo hien tai (lenh npm chay tai goc tung repo):

```txt
baotin-b2b-fe/
  app/, components/, lib/, scripts/, shared/
  docs/, design/, package.json
baotin-b2b-be/
  src/, media/, seed/, scripts/, shared/, test/
  docs/, certs/, package.json
```

## 3. MVP can lam truoc

### 3.1. Module nguoi dung va phan quyen

Vai tro ban dau:

- Admin
- Boss
- Inside Sales
- Warehouse
- Accountant
- B2B Customer
- B2C Customer

Chuc nang:

- Dang nhap bang so dien thoai/email.
- Phan quyen API theo role.
- Moi tai khoan B2B gan voi mot ho so khach hang.

### 3.2. Module khach hang B2B

Can quan ly:

- Ten khach/xuong/cong ty.
- Nhom khach: xuong noi that, thiet ke-thi cong, tho/doi thi cong.
- So dien thoai, dia chi, nguoi lien he.
- Han muc cong no.
- Thoi han thanh toan.
- Trang thai: moi, dang thu nghiem, dang hoat dong, tam khoa.

### 3.3. Module san pham

Du lieu bat buoc:

- Ma hang.
- Ten san pham.
- Nhom hang.
- Thuong hieu.
- Don vi tinh.
- Hinh anh.
- Thong so ky thuat.
- Trang thai cong khai.
- San pham lien quan.

Quy tac:

- Bat dau voi 250-400 ma san pham da sach du lieu.
- San pham chua du thong tin de trang thai an.
- Tim kiem theo ma, ten, thuong hieu, nhom hang.

### 3.4. Module gia

Can ho tro:

- Gia B2C cong khai.
- Gia B2B sau dang nhap.
- Gia theo nhom khach.
- Gia rieng theo khach.
- Yeu cau xin gia dac biet.

Quy tac:

- Khong hien gia B2B cho khach chua dang nhap.
- Gia dac biet phai co trang thai cho duyet.
- Chi Boss/Admin duoc duyet gia dac biet.

### 3.5. Module gio hang va don hang

Chuc nang:

- Them san pham vao gio.
- Tao don hang.
- Dat lai don cu.
- Tai bao gia/don hang sau khi don duoc xac nhan.

Trang thai don hang ban dau:

```txt
draft
pending_confirmation
waiting_approval
confirmed
picking
ready_to_ship
delivering
completed
cancelled
```

Quy tac:

- Moi don online vao trang thai `pending_confirmation`.
- Inside Sales phai xac nhan truoc khi kho soan hang.
- Neu co gia dac biet hoac vuot cong no thi chuyen `waiting_approval`.

### 3.6. Module van hanh noi bo

Cho Inside Sales:

- Xem don moi.
- Tao don ho khach.
- Sua so luong/gia trong pham vi duoc phep.
- Gui yeu cau duyet gia dac biet.

Cho kho:

- Xem don da xac nhan.
- Cap nhat trang thai soan hang.
- Bao thieu hang/sai hang.

Cho ke toan:

- Xem cong no.
- Cap nhat thanh toan.
- Canh bao don vuot han muc.

Cho Boss/Admin:

- Duyet gia dac biet.
- Duyet cong no ngoai chinh sach.
- Xem KPI van hanh.

## 4. Database ban dau

Cac bang nen tao o MVP:

```txt
users
roles
user_roles

customers
customer_contacts
customer_groups
credit_limits

product_categories
products
product_images
product_specs
product_related

price_lists
product_prices
customer_special_prices
special_price_requests

carts
cart_items

orders
order_items
order_status_logs

payments
```

Quan he chinh:

- `users` co the gan voi `customers`.
- `customers` thuoc `customer_groups`.
- `products` thuoc `product_categories`.
- `orders` thuoc `customers` hoac khach B2C.
- `order_items` gan voi `products`.
- `special_price_requests` gan voi `orders` hoac `order_items`.

## 5. API can co trong giai doan dau

Auth:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Products:

- `GET /products`
- `GET /products/:id`
- `POST /admin/products`
- `PATCH /admin/products/:id`

Customers:

- `GET /admin/customers`
- `GET /admin/customers/:id`
- `POST /admin/customers`
- `PATCH /admin/customers/:id`

Cart:

- `GET /cart`
- `POST /cart/items`
- `PATCH /cart/items/:id`
- `DELETE /cart/items/:id`

Orders:

- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /admin/orders/:id/status`

Approvals:

- `POST /orders/:id/special-price-requests`
- `GET /admin/approvals`
- `POST /admin/approvals/:id/approve`
- `POST /admin/approvals/:id/reject`

## 6. Man hinh frontend can lam

Khach hang:

- Trang danh sach san pham.
- Trang chi tiet san pham.
- Gio hang.
- Tao don.
- Lich su don hang.
- Dat lai don cu.
- Trang cong no cho B2B.

Noi bo:

- Dashboard don hang.
- Quan ly san pham.
- Quan ly khach B2B.
- Chi tiet don hang.
- Man hinh duyet gia dac biet.
- Man hinh kho soan hang.

B2C:

- Trang nhom giai phap.
- Trang huong dan chon san pham.
- Trang san pham ban le.
- Gio hang/dat hang.

## 7. Ke hoach 4 tuan dau

### Tuan 1: Khoi tao nen tang

- Dung hai repo FE/BE rieng, source va package.json ngay tai goc tung repo.
- Khoi tao `backend/` voi NestJS sau khi duyet UI va hop dong du lieu.
- Giu Next.js hien co tai goc repo FE, khong tao web app thu hai.
- Cai Tailwind CSS.
- Ket noi Supabase PostgreSQL.
- Cau hinh TypeORM.
- Tao entity/migration dau tien.
- Tao file `.env.example`.

Ket qua can co:

- Chay duoc frontend.
- Chay duoc backend.
- Backend ket noi duoc database.
- Co health check API.

### Tuan 2: San pham va catalog

- Tao bang san pham, nhom hang, hinh anh, thong so.
- Tao API danh sach/chi tiet san pham.
- Tao admin CRUD san pham.
- Tao trang catalog mobile-first.
- Tao tim kiem/loc co ban.

Ket qua can co:

- Import thu duoc danh sach san pham mau.
- Khach xem duoc catalog.
- San pham an/hien thi theo trang thai.

### Tuan 3: Khach B2B, gia va gio hang

- Tao khach hang B2B.
- Tao bang gia B2C/B2B.
- Hien gia theo loai tai khoan.
- Tao gio hang.
- Tao don hang cho xac nhan.

Ket qua can co:

- B2C thay gia ban le.
- B2B dang nhap thay gia B2B.
- Tao duoc don hang `pending_confirmation`.

### Tuan 4: Van hanh don hang

- Inside Sales xem va xac nhan don.
- Tao workflow duyet gia dac biet.
- Kho xem don da xac nhan.
- Ke toan xem cong no co ban.
- Tao lich su trang thai don.

Ket qua can co:

- Mot don hang di duoc tu luc tao den luc hoan tat.
- Co log trang thai don.
- Co man hinh noi bo de xu ly don.

## 8. Viec can chuan bi song song voi code

Du lieu:

- File san pham 250-400 ma dau tien.
- File khach B2B thu nghiem 20-30 khach.
- Bang gia B2B/B2C.
- Chinh sach gia dac biet.
- Chinh sach cong no.

Noi dung:

- Hinh anh san pham.
- Thong so ky thuat.
- Video/tai lieu lap dat neu co.
- Nhom giai phap B2C dau tien.

Van hanh:

- Ai la Inside Sales phu trach don online.
- Ai duyet gia dac biet.
- Ai cap nhat trang thai kho.
- Ai doi chieu thanh toan.

## 9. Tieu chuan hoan thanh MVP

MVP duoc xem la dat khi:

- Khach B2B dang nhap va xem duoc gia rieng.
- Khach tim san pham va tao don duoc tren dien thoai.
- Don online khong di thang xuong kho khi chua xac nhan.
- Inside Sales xac nhan duoc don.
- Kho cap nhat duoc trang thai soan hang.
- Boss/Admin duyet duoc gia dac biet.
- Ke toan xem duoc cong no/hinh thuc thanh toan co ban.
- Co the chay thu voi 20-30 khach B2B dau tien.

## 10. Buoc tiep theo

Sau tai lieu nay, buoc tiep theo la khoi tao source code:

1. Dung cau truc frontend/backend hien co; chi khoi tao API sau duyet UI.
2. Tao NestJS API.
3. Tao Next.js web.
4. Cai Tailwind CSS.
5. Cau hinh TypeORM + Supabase PostgreSQL.
6. Tao entity dau tien: user, customer, product, order.
7. Tao API health check va trang frontend dau tien.

Khi bat dau lam frontend, can doc them `docs/design-system.md` va `docs/ui-ux-rules.md` de thong nhat font, mau sac, radius, component, responsive va cac flow quan trong.
