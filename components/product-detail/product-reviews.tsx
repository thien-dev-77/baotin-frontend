"use client";

import { useCommerce } from "@/components/commerce-provider";
import { Button, Field, Modal } from "@/components/ui";
import type { ProductReview } from "@/lib/product-detail";
import { useState, type FormEvent } from "react";

type ProductReviewsProps = {
  reviews: ProductReview[];
  onAddReview: (review: ProductReview) => void;
};

export function ProductReviews({ reviews, onAddReview }: ProductReviewsProps) {
  const { notice } = useCommerce();
  const [open, setOpen] = useState(false);

  const submitReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onAddReview({ name: String(form.get("name")), stars: Number(form.get("stars")), text: String(form.get("text")) });
    setOpen(false);
    notice("Cảm ơn bạn đã gửi đánh giá.");
  };

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <strong className="text-primary">Đánh giá từ khách hàng</strong>
        <Button variant="secondary" onClick={() => setOpen(true)}>Viết đánh giá</Button>
      </div>
      {reviews.map((review, index) => (
        <div key={index} className="border-t border-border py-4">
          <strong className="text-sm">{review.name}</strong>
          <span className="ml-3 text-amber-500">{"★".repeat(review.stars)}</span>
          <p className="mt-2 text-sm text-text-secondary">{review.text}</p>
        </div>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="Viết đánh giá">
        <form className="space-y-4" onSubmit={submitReview}>
          <Field label="Tên của bạn" required>
            <input name="name" required className="bt-input" />
          </Field>
          <Field label="Mức đánh giá">
            <select name="stars" className="bt-input">
              {[5, 4, 3, 2, 1].map((star) => <option key={star} value={star}>{star} sao</option>)}
            </select>
          </Field>
          <Field label="Nhận xét" required>
            <textarea name="text" required className="bt-input" />
          </Field>
          <Button type="submit">Gửi đánh giá</Button>
        </form>
      </Modal>
    </>
  );
}
