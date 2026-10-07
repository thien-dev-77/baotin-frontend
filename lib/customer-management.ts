import type { AdminCustomer } from "./types";

export type ManagedCustomer = AdminCustomer & {
  revision: number;
  account: { id: string; disabled: boolean } | null;
};
export type CustomerDirectory = {
  items: ManagedCustomer[];
  assignees: { id: string; name: string; disabled: boolean }[];
  groups: string[];
};

export const customerGroups = [
  "Chờ phân nhóm",
  "Xưởng nội thất",
  "Thiết kế - thi công",
  "Thợ - đội thi công",
];
