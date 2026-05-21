const ADMIN_EMAILS = [
  "sunilvishwa200@gmail.com",
  "mahabscrafto@gmail.com",
];

export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export { ADMIN_EMAILS };
