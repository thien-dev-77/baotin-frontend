export type ContentKind = "banner" | "guide" | "solution";
export type ContentData = {
  slug: string;
  title: string;
  description: string;
  image: string;
  href: string;
  category: string;
  body: string;
  minutes: number;
  width: number;
  height: number;
  position: number;
};
export type ContentEntry = {
  id: string;
  kind: ContentKind;
  published: boolean;
  revision: number;
  data: ContentData;
};
export type PublicContent = ContentData & { id: string; kind: ContentKind };
