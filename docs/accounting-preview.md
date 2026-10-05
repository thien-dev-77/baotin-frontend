# Thu Tien Va Doi Chieu (UI Mock)

Route: `/admin/accounting`. Ma nguon ngay tai goc repo FE.
Ngay moc 04/10/2026; receipts bat dau rong, dung cac don/khach mock hien co.
Khong tu tao phieu thu lich su tu total don hay snapshot debt cua khach.

## Luong Duyet

1. Tab Don can thu: don da xac nhan cua chi nhanh, con tien chua doi chieu.
2. Lap phieu cho mot don: amount VND nguyen duong, ngay, method, reference, note.
3. Phieu PTM0001... vao Cho doi chieu; chua duoc tinh la da thanh toan.
4. Ke toan nhap so tien thuc nhan, ma doi chieu va ket qua kiem tra.
5. Chi xac nhan khi so tien khop. Chenh lech hien canh bao va khong ghi nhan paid.
6. Thu tung phan bang nhieu phieu, khong vuot total sau khi tru phieu con hieu luc.
7. Huy phieu pending/da doi chieu can ly do; giu reconciliation va cancellation.
8. Don mua no da xac nhan co the dat/sua ngay den han; khong tu suy ra credit terms.

Tab phieu loc theo chi nhanh va ky 7/30 ngay; tab Don can thu lay tat ca don
cua chi nhanh, ke ca ngoai ky. Tong con phai thu tinh tren tat ca don da xac nhan.
Ngay den han bang ngay moc chua coi la qua han; chi date < previewDate.
Bo loc, tim kiem, phan trang, CSV, dialog/Escape va bang cuon ngang mobile.

## Quy Tac

- Khong thu don pending/huy; B2B/B2C deu duoc thu sau xac nhan.
- Thu tien khong tu chuyen trang thai don, khong cap/tang han muc cong no.
- available = total - reconciled - pending; remaining = total - reconciled.
- Pending giu phan tien da lap phieu de tranh lap vuot; chua tang paid.
- Reference khong trung trong cung chi nhanh + method, khong phan biet hoa thuong.
- Ma doi chieu cung khong trung trong cung chi nhanh + method tren phieu con hieu luc.
- Phieu huy duoc giu lai nhung khong chiem so tien/reference, khong coi la refund that.
- Don co phieu con hieu luc khong huy duoc; can xu ly phieu truoc. Huy don van
  theo gate trang thai Sales. Audit phieu huy van con sau reload khi don da huy.
- Ngay thu tu ngay tao don den ngay moc; due date khong truoc ngay tao don.
- Toi da 500 phieu trong storage; parser validate field/branch/order/date/amount,
  status/audit, duplicate va tong allocation; bo payload khong hop le.
- Storage cu chua receipts/paymentDueDates van doc duoc; reset khong xoa commerce.

## Bien Gioi Du Lieu

`AdminCustomer.debt/overdue/limit` la snapshot doc lap tu fixture; receipts theo
don khong tru so du nay. Khong cong snapshot debt voi tong don va coi la so no
that. Cong no account storefront cung chua duoc ket noi voi admin ledger.
Ngay thu la business date mock; created/reconciled/canceledAt dung gio browser.
Chua co import sao ke, ledger KiotViet, refund, VAT/phi, split mot giao dich
cho nhieu don, upload chung tu, doi soat ngan hang hay danh tinh ke toan that.
Draft chenh lech chi la form canh bao, chua co hang doi discrepancy duoc luu.
Han thanh toan co state, chua co audit rieng/reason cho thay doi han.

## Code Va API Handoff

- `lib/admin-accounting.ts`: types, validation, payment projection, parser.
- `components/admin/admin-provider.tsx`: create/reconcile/void/due actions.
- `admin-accounting.tsx`, `admin-receipt-form.tsx`, `admin-receipt-detail.tsx`:
  queue, form va review trong `components/admin/`.
- `scripts/admin-accounting-qa.mjs`: 5 viewport, partial/mismatch/duplicate,
  reload, cancel, due, branch, CSV, legacy/corrupt storage/reset isolation.

De xuat API sau duyet: GET receipts/outstanding, POST receipts,
POST receipts/:id/reconcile, POST receipts/:id/void, order due-date command.
Server phai verify order/revision/role/branch, money, receipt allocation,
unique transaction, idempotency, immutable audit va transaction ledger.
Chot void/refund/reversal va nguon so du KiotViet truoc khi tao schema.
Khong port thao tac client "huy phieu" thanh refund that khong co doi soat.
