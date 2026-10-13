const phone = "0979003577";

export const storeContact = {
  phone,
  displayPhone: "097 900 35 77",
  phoneHref: `tel:${phone}`,
  zaloHref: `https://zalo.me/${phone}`,
} as const;
