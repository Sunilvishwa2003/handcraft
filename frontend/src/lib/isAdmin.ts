import { User } from "@/lib/types";

const ADMIN_EMAILS = [
  "sunilvishwa200@gmail.com",
  "mahabscrafto@gmail.com",
];

export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export function normalizeUserAdminState<T extends Pick<User, "email"> & { isAdmin?: boolean }>(user: T): T & { isAdmin: boolean } {
  return {
    ...user,
    isAdmin: isAdmin(user.email),
  };
}

export { ADMIN_EMAILS };
