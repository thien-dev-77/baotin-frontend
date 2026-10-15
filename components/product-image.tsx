"use client";

import Image from "next/image";
import { useState, type ComponentProps } from "react";
import { DEFAULT_PRODUCT_IMAGE } from "@/lib/product-media";

type ProductImageProps = ComponentProps<typeof Image>;

export function ProductImage({ src, ...props }: ProductImageProps) {
  const source = typeof src === "string" ? src.trim() || DEFAULT_PRODUCT_IMAGE : src || DEFAULT_PRODUCT_IMAGE;
  const sourceKey = typeof source === "string" ? source : "default" in source ? source.default.src : source.src;
  // A new source gets a fresh attempt, even if the previous image failed.
  return <ImageWithFallback key={sourceKey} {...props} src={source} />;
}

function ImageWithFallback({ src, alt, onError, unoptimized, overrideSrc, ...props }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const fallback = failed || src === DEFAULT_PRODUCT_IMAGE;

  return <Image
    {...props}
    src={fallback ? DEFAULT_PRODUCT_IMAGE : src}
    alt={alt}
    overrideSrc={fallback ? undefined : overrideSrc}
    unoptimized={fallback || unoptimized}
    onError={event => {
      if (!fallback) setFailed(true);
      onError?.(event);
    }}
  />;
}
