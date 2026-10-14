import type { Product } from "./types";

type Attribute = NonNullable<Product["variantAttributes"]>[number];
export const MAX_VARIANT_LABEL_LENGTH = 100;
export const variantLabel = (product: Pick<Product, "variantLabel" | "code">) => product.variantLabel?.trim() || product.code;
export const variantKey = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");

export function variantDimension(attributes: Attribute[], kind: "size" | "color") {
  return attributes.find(attribute => {
    const name = variantKey(attribute.name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
    return (kind === "size" ? /^(kich thuoc|kich co|size)(\b|$)/ : /^(mau sac|mau|color)(\b|$)/).test(name);
  });
}

export function chooseVariant(variants: Product[], current: Product, index: number, value: string) {
  const options = variants.filter(item => variantKey(item.variantAttributes?.[index]?.value || "") === variantKey(value));
  return options.find(item => item.variantAttributes?.every((attribute, position) => position === index || variantKey(attribute.value) === variantKey(current.variantAttributes?.[position]?.value || ""))) || options[0];
}
