// This file is treated as an ambient script (no import/export) so the
// Express namespace augmentation is globally visible to every file in the
// project without needing an explicit import.
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      role: "borrower" | "admin";
    };
  }
}
