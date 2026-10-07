"use client";

import { useCommerce } from "@/components/commerce-provider";
import { Button, Field, Modal } from "@/components/ui";
import type { ProductReview } from "@/lib/product-detail";
import { useRef, useState, type ComponentProps, type FormEvent } from "react";
import Link from "next/link";
import { api, apiMode } from "@/lib/api-client";
import { ResourceStatus } from "@/components/admin/admin-resource";

type ProductReviewsProps = {
  productId: string;
  reviews: ProductReview[];
  onAddReview: (review: ProductReview) => void;
  resource?: ComponentProps<typeof ResourceStatus>;
};

export function ProductReviews({
  productId,
  reviews,
  onAddReview,
  resource,
}: ProductReviewsProps) {
  const { notice, customer } = useCommerce();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lock.current) return;
    const form = new FormData(event.currentTarget);
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (apiMode)
        await api(`/reviews/${encodeURIComponent(productId)}`, {
          method: "POST",
          body: JSON.stringify({
            stars: Number(form.get("stars")),
            text: String(form.get("text")),
          }),
        });
      else
        onAddReview({
          name: String(form.get("name")),
          stars: Number(form.get("stars")),
          text: String(form.get("text")),
        });
      setOpen(false);
      notice(
        apiMode
          ? "Đã gửi đánh giá, đang chờ kiểm duyệt."
          : "Cảm ơn bạn đã gửi đánh giá.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể gửi đánh giá.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <strong className="text-primary">Đánh giá từ khách hàng</strong>
        {apiMode && !customer ? (
          <Link href="/login" className="bt-button-secondary">
            Đăng nhập để đánh giá
          </Link>
        ) : (
          <Button
            variant="secondary"
            onClick={() => {
              setError("");
              setOpen(true);
            }}
          >
            Viết đánh giá
          </Button>
        )}
      </div>
      {reviews.map((review, index) => (
        <div key={index} className="border-t border-border py-4">
          <strong className="text-sm">{review.name}</strong>
          <span className="ml-3 text-amber-500">
            {"★".repeat(review.stars)}
          </span>
          <p className="mt-2 text-sm text-text-secondary">{review.text}</p>
        </div>
      ))}
      {resource && <ResourceStatus {...resource} />}
      {!reviews.length && !resource?.loading && !resource?.error && (
        <p className="py-5 text-sm text-text-secondary">Chưa có đánh giá.</p>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        busy={busy}
        title="Viết đánh giá"
      >
        <form className="space-y-4" onSubmit={submitReview}>
          <Field label="Tên của bạn" required>
            <input
              name="name"
              required
              className="bt-input"
              defaultValue={customer?.name}
              readOnly={apiMode}
              disabled={busy}
            />
          </Field>
          <Field label="Mức đánh giá">
            <select name="stars" className="bt-input">
              {[5, 4, 3, 2, 1].map((star) => (
                <option key={star} value={star}>
                  {star} sao
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nhận xét" required>
            <textarea
              name="text"
              required
              minLength={5}
              maxLength={2000}
              disabled={busy}
              className="bt-input"
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" loading={busy}>
            Gửi đánh giá
          </Button>
        </form>
      </Modal>
    </>
  );
}
