# Quy tac UX/UI cho website B2B/B2C

Code/components nam ngay tai goc repo FE; tai lieu va anh tham chieu
giu tai `docs/` va `design/`. Anh website luu tai BE va phuc vu qua rewrite.

Tai lieu nay quy dinh cach thiet ke giao dien cho he thong B2B/B2C. Muc tieu la giu san pham de dung tren dien thoai, thao tac nhanh cho khach B2B, va ro rang voi khach B2C khong biet ma hang ky thuat.

## 1. Nguyen tac tong the

- Mobile-first: khach B2B va B2C se dung dien thoai rat nhieu.
- Don gian, ro trang thai, it chu thich dai dong.
- Khong thiet ke nhu landing page marketing o man hinh chinh cua he thong.
- B2B uu tien toc do tim hang, dat lai don cu, xem gia rieng va cong no.
- B2C uu tien giai thich theo nhu cau, bo giai phap va huong dan chon.
- Noi bo uu tien bang danh sach, loc, tim kiem, trang thai va thao tac nhanh.
- Khong dua qua nhieu san pham chua du du lieu len giao dien.

## 2. Doi tuong su dung

### 2.1. Khach B2B

Nguoi dung:

- Chu xuong noi that.
- Nhan vien mua hang cua cong ty thiet ke-thi cong.
- Tho moc, doi thi cong.

Nhu cau chinh:

- Tim nhanh dung ma hang.
- Xem gia cua rieng minh.
- Dat lai don cu.
- Kiem tra tinh trang don.
- Xem cong no/hạn thanh toan.

Quy tac UI:

- O tim kiem phai noi bat.
- Ma hang phai hien ro hon mo ta dai.
- Nut them vao gio phai de bam tren mobile.
- Don cu va san pham thuong mua phai de truy cap.
- Gia B2B khong hien neu chua dang nhap.

### 2.2. Khach B2C

Nguoi dung:

- Chu nha dang lam noi that.
- Khach tim phu kien bep, LED, ray, ban le, khoa cao cap.

Nhu cau chinh:

- Hieu nen chon san pham nao.
- So sanh co ban/kha/cao cap.
- Xem hinh that, video, huong dan do kich thuoc.
- Nhan tu van nhanh.

Quy tac UI:

- Hien thi theo bo giai phap thay vi chi danh sach ma hang.
- Moi nhom san pham nen co noi dung huong dan ngan.
- Hinh anh thuc te phai ro, khong dung anh qua toi hoac qua chung chung.
- CTA chinh: dat hang, nhan Zalo, yeu cau tu van.

### 2.3. Nhan vien noi bo

Nguoi dung:

- Inside Sales.
- Kho.
- Ke toan.
- Boss/Admin.

Nhu cau chinh:

- Xem viec can xu ly ngay.
- Loc don theo trang thai.
- Xac nhan don nhanh.
- Duyet ngoai le.
- Cap nhat trang thai kho/thanh toan.

Quy tac UI:

- Dung dashboard dang bang du lieu.
- Khong dung layout trang tri nhieu.
- Trang thai don phai co mau va nhan ro.
- Cac nut thao tac phai sat voi dong du lieu lien quan.

## 3. Huong thiet ke hinh anh va cam giac thuong hieu

Cam giac can co:

- Tin cay.
- Gon gang.
- Chuyen nghiep.
- De thao tac.
- Phu hop nganh phu kien noi that, vat tu, B2B.

Can tranh:

- Giao dien qua mau me.
- Hero qua lon lam cham viec tim san pham.
- Qua nhieu card trang tri.
- Anh stock chung chung khong thay ro san pham.
- Text dai giai thich tinh nang tren tung man hinh.

Huong hinh anh:

- Anh san pham nen nen sach, sang, thay ro hinh dang.
- Anh lap dat thuc te nen dung cho B2C va trang chi tiet san pham.
- Moi san pham can it nhat 1 anh chinh ro ma hang.
- Neu san pham co bien the mau/kich thuoc, anh khong duoc gay nham lan.

## 4. Mau sac

Bang mau theo visual reference va `docs/design-system.md`:

```txt
Primary: #0F3157
Primary dark: #08233F
Blue: #1677D2
Blue hover: #0E65B8
Success: #168A5A
Warning: #F59E0B
Danger: #D92D20
Text strong: #102A43
Text normal: #52667A
Text muted: #7B8A9A
Border: #E2E8F0
Background: #F5F8FC
Light blue: #F0F6FD
Surface: #FFFFFF
```

Quy tac:

- Primary dung cho logo, tieu de, navigation va footer.
- Blue dung cho hanh dong chinh, lien ket va focus.
- Danger dung cho gia uu dai, huy/xoa va canh bao nghiem trong; khong dung cho icon danh muc.
- Trang thai don hang dung mau nhat quan tren toan he thong.
- Nen noi dung chu yeu la trang; xanh dung cho navigation va hanh dong, do dung cho gia uu dai va canh bao.

## 5. Typography

Font de xuat:

- Inter, tai local qua `@fontsource/inter`, bao gom ky tu tieng Viet.

Quy tac:

- Body text: 14-16px.
- Bang noi bo: 13-14px.
- Tieu de trang: 24-32px.
- Tieu de panel: 16-18px; ten san pham 14px, gia 18px.
- Khong dung chu qua lon trong dashboard.
- Letter-spacing: 0.
- Khong scale font theo viewport width.

## 6. Layout

### 6.1. Mobile

- Header gon, co tim kiem hoac nut mo tim kiem.
- Bottom navigation cho khach hang neu can: Trang chu, San pham, Gio hang, Don hang, Tai khoan.
- Nut chinh co chieu cao toi thieu 44px.
- Bo loc san pham nen mo bang bottom sheet hoac drawer.
- Gio hang nen co thanh tong tien/dat hang co dinh o duoi.

### 6.2. Desktop

- Catalog co sidebar loc ben trai.
- Container 1240px, man hinh >=1440px dung 1280px; le desktop 24px, tablet 16px, mobile 12px.
- Dashboard noi bo dung sidebar navigation.
- Bang du lieu can co filter, search, pagination.

### 6.3. Admin/noi bo

- Khong dung hero.
- Khong dung section trang tri.
- Man hinh dau tien la cong viec can xu ly.
- Dung table/list thay vi card lon neu du lieu can so sanh.

## 7. Component rules

### Button

- Primary button dung cho hanh dong chinh: Dat hang, Xac nhan don, Duyet.
- Secondary button dung cho hanh dong phu: Luu nhap, Quay lai.
- Danger button dung cho Huy don, Xoa, Tu choi.
- Nut icon can co tooltip neu y nghia khong ro.
- Khong de text trong button bi tran tren mobile.

### Input va form

- Label phai ro rang.
- Loi nhap lieu hien ngay gan field.
- So luong san pham dung stepper `- / +` kem input so.
- Tien te can format VND.
- So dien thoai can format de doc, nhung luu du lieu dang chuan.

### Card

- Card chi dung cho san pham, don hang tom tat, hoac block thong tin doc lap.
- Card dung radius 10px theo reference; control 6-8px.
- Khong long card trong card.
- Khong bien moi section thanh card.

### Table

- Moi table can co cot trang thai neu la don hang/khach/san pham.
- Cot hanh dong nam ben phai.
- Dong co the click vao chi tiet neu hop ly.
- Mobile co the chuyen table thanh list item gon.

### Badge va status

Trang thai don hang:

```txt
draft: Nhap
pending_confirmation: Cho xac nhan
waiting_approval: Cho duyet
confirmed: Da xac nhan
picking: Dang soan
ready_to_ship: San sang giao
delivering: Dang giao
completed: Hoan tat
cancelled: Da huy
```

Quy tac:

- Moi status co label tieng Viet ngan.
- Dung cung mau status o tat ca man hinh.
- Khong chi dua vao mau; label phai ro.

## 8. Man hinh khach hang

### 8.1. Catalog san pham

Bat buoc co:

- Tim kiem theo ma hang/ten/thuong hieu.
- Loc theo nhom hang.
- Loc theo thuong hieu.
- Loc theo tinh trang con hang neu co du lieu.
- Sap xep theo pho bien, moi, gia.

Moi item san pham can co:

- Anh chinh.
- Ma hang.
- Ten san pham.
- Don vi tinh.
- Gia neu duoc phep xem.
- Nut them vao gio.

### 8.2. Chi tiet san pham

Bat buoc co:

- Anh san pham.
- Ma hang.
- Ten san pham.
- Gia theo tai khoan.
- Don vi tinh.
- So luong va nut them vao gio.
- Thong so ky thuat.
- San pham lien quan.
- Tai lieu/video neu co.

B2C nen co them:

- Huong dan chon ngan.
- Goi y bo san pham lien quan.
- Nut nhan Zalo/yeu cau tu van.

### 8.3. Gio hang

Bat buoc co:

- Danh sach san pham.
- So luong.
- Don gia neu duoc phep xem.
- Tong tien tam tinh.
- Ghi chu don hang.
- Hinh thuc nhan hang.
- Nut gui don.

Quy tac:

- Don B2B hien thong bao: don se duoc Inside Sales xac nhan.
- Neu co san pham can xin gia, phai hien ro trang thai.

### 8.4. Don hang cua toi

Bat buoc co:

- Danh sach don.
- Trang thai.
- Ngay tao.
- Tong tien.
- Nut xem chi tiet.
- Nut dat lai voi khach B2B.

## 9. Man hinh noi bo

### 9.1. Dashboard Inside Sales

Can hien thi:

- Don moi cho xac nhan.
- Don cho duyet gia/cong no.
- Don can goi khach.
- Don dang bi thieu thong tin.

Thao tac chinh:

- Xem chi tiet.
- Xac nhan don.
- Gui yeu cau duyet.
- Huy don co ly do.

### 9.2. Dashboard kho

Can hien thi:

- Don da xac nhan cho soan.
- Don dang soan.
- Don san sang giao.
- Don co van de ve hang.

Thao tac chinh:

- Bat dau soan.
- Bao thieu hang.
- Danh dau soan xong.
- Ban giao giao hang.

### 9.3. Dashboard ke toan

Can hien thi:

- Khach vuot han muc.
- Khach qua han thanh toan.
- Don cho doi chieu thanh toan.
- Lich su thanh toan.

### 9.4. Dashboard Boss/Admin

Can hien thi:

- Yeu cau gia dac biet.
- Yeu cau cong no ngoai chinh sach.
- KPI don hang.
- KPI loi/huy don.

## 10. UX flow quan trong

### 10.1. B2B tu dat don

```txt
Dang nhap
-> Tim san pham
-> Them vao gio
-> Kiem tra gio hang
-> Gui don
-> Cho Inside Sales xac nhan
-> Theo doi trang thai
```

### 10.2. B2B dat lai don cu

```txt
Dang nhap
-> Don hang cua toi
-> Chon don cu
-> Dat lai
-> Dieu chinh so luong
-> Gui don moi
```

### 10.3. B2C mua theo giai phap

```txt
Chon nhom giai phap
-> Doc huong dan ngan
-> Xem goi san pham
-> Chon san pham
-> Them vao gio/nhan tu van
-> Gui don
```

### 10.4. Inside Sales xac nhan don

```txt
Mo don moi
-> Kiem tra khach/gia/ton/cong no
-> Sua thong tin neu can
-> Gui duyet neu co ngoai le
-> Xac nhan don
-> Chuyen kho soan hang
```

## 11. Noi dung va microcopy

Quy tac viet chu:

- Ngan, ro, dung ngon ngu nguoi mua hang.
- Khong dung qua nhieu tu ky thuat voi B2C.
- B2B co the uu tien ma hang va thong so.
- Loi he thong phai noi ro can lam gi tiep theo.

Vi du:

- Dung: `Don hang dang cho Inside Sales xac nhan.`
- Dung: `San pham nay can lien he de bao gia.`
- Dung: `Vuot han muc cong no, can duyet truoc khi xac nhan.`
- Tranh: `Co loi xay ra.`

## 12. Accessibility va do on dinh

- Tat ca input can co label.
- Mau chu va nen phai du tuong phan.
- Nut/icon can co accessible label.
- Focus state phai ro khi dung ban phim.
- Loading state can ro rang.
- Empty state phai co huong dan tiep theo.
- Khong de layout nhay khi anh san pham dang tai.
- Anh san pham can co kich thuoc on dinh.

## 13. Responsive checklist

Truoc khi hoan thanh moi man hinh, can kiem tra:

- Mobile 360px.
- Mobile 390px.
- Tablet 768px.
- Desktop 1280px.
- Desktop 1440px.

Can dat:

- Khong co text tran khoi button/card.
- Khong co nut qua nho de bam tren mobile.
- Khong co header/footer che noi dung.
- Gio hang va tong tien de thao tac tren mobile.
- Bang noi bo van doc duoc hoac chuyen sang list hop ly.

## 14. Khong lam trong MVP

- Khong lam app mobile rieng.
- Khong lam animation phuc tap.
- Khong lam landing page dai truoc khi co catalog dung duoc.
- Khong hien gia B2B cong khai.
- Khong tu dong cho kho soan don khi Inside Sales chua xac nhan.
- Khong lam UI qua trang tri lam cham thao tac dat hang.

## 15. Tieu chuan UI truoc khi release thu nghiem

Man hinh duoc xem la dat khi:

- Khach B2B tim duoc san pham trong vai giay neu biet ma hang.
- Khach B2B tao duoc don tren dien thoai.
- Khach B2C hieu duoc nhom san pham phu hop voi nhu cau.
- Inside Sales nhin thay ngay don nao can xu ly.
- Kho nhin thay ngay don nao can soan.
- Ke toan nhin thay khach/don nao co van de cong no.
- Boss/Admin duyet ngoai le ma khong can hoi lai thong tin co ban.
