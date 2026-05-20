import { randomUUID } from "crypto";

export type CreditPackage = {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
};

export type BankOption = {
  id: string;
  name: string;
  accountName: string;
  accountNumber: string;
  branch?: string;
};

export type PaymentStatus = "pending" | "approved" | "rejected";

export type PaymentRecord = {
  id: string;
  userId: string;
  packageId: string | null;
  bankId: string | null;
  amount: number;
  currency: string;
  reference: string;
  status: PaymentStatus;
  notes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobStatus = "queued" | "processing" | "done" | "failed";

export type JobRecord = {
  id: string;
  userId: string;
  inputFileId: string;
  status: JobStatus;
  error?: string;
  resultFileId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserRecord = {
  id: string;
  email: string;
  credits: number;
  role: "user" | "admin";
};

type ApiStore = {
  users: Map<string, UserRecord>;
  payments: Map<string, PaymentRecord>;
  jobs: Map<string, JobRecord>;
  files: Map<string, { path: string; mime: string; originalName: string }>;
};

const g = globalThis as unknown as { __faydaApiStore?: ApiStore };

function nowIso() {
  return new Date().toISOString();
}

function createInitialStore(): ApiStore {
  const users = new Map<string, UserRecord>();
  users.set("user-1", {
    id: "user-1",
    email: "user@example.com",
    credits: 100,
    role: "user",
  });
  users.set("admin-1", {
    id: "admin-1",
    email: "admin@example.com",
    credits: 9999,
    role: "admin",
  });
  return {
    users,
    payments: new Map(),
    jobs: new Map(),
    files: new Map(),
  };
}

export function getApiStore(): ApiStore {
  if (!g.__faydaApiStore) g.__faydaApiStore = createInitialStore();
  return g.__faydaApiStore;
}

export const DEFAULT_PACKAGES: CreditPackage[] = [
  { id: "pkg-50", name: "Starter", credits: 50, price: 4.99, currency: "USD" },
  { id: "pkg-200", name: "Standard", credits: 200, price: 14.99, currency: "USD" },
  { id: "pkg-1000", name: "Pro", credits: 1000, price: 49.99, currency: "USD" },
];

export const DEFAULT_BANKS: BankOption[] = [
  {
    id: "bank-1",
    name: "Commercial Bank of Ethiopia",
    accountName: "Fayda ID Services",
    accountNumber: "1000123456789",
    branch: "Bole",
  },
  {
    id: "bank-2",
    name: "Awash Bank",
    accountName: "Fayda ID Services",
    accountNumber: "9876543210123",
  },
];

/** Decode JWT payload (no signature verification — dev convenience only). */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.replace(/^Bearer\s+/i, "").split(".");
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAuthContext(req: Request): {
  userId: string;
  role: "user" | "admin";
  raw?: Record<string, unknown>;
} {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { userId: "user-1", role: "user" };
  }
  const payload = decodeJwtPayload(auth.slice(7));
  if (!payload) {
    return { userId: "user-1", role: "user" };
  }
  const sub = String(payload.sub ?? payload.user_id ?? payload.id ?? "user-1");
  const roleRaw = String(payload.role ?? payload.is_staff ?? "");
  const role: "user" | "admin" =
    roleRaw === "admin" || payload.is_staff === true ? "admin" : "user";
  return { userId: sub, role, raw: payload };
}

export function requireAdmin(ctx: { role: string }) {
  return ctx.role === "admin";
}

export function ensureUserExists(store: ApiStore, id: string): UserRecord | null {
  return store.users.get(id) ?? null;
}

export function createPayment(input: Omit<PaymentRecord, "id" | "createdAt" | "updatedAt">): PaymentRecord {
  const store = getApiStore();
  const id = randomUUID();
  const t = nowIso();
  const row: PaymentRecord = {
    ...input,
    id,
    createdAt: t,
    updatedAt: t,
  };
  store.payments.set(id, row);
  return row;
}

export function createJob(input: Omit<JobRecord, "id" | "createdAt" | "updatedAt">): JobRecord {
  const store = getApiStore();
  const id = randomUUID();
  const t = nowIso();
  const row: JobRecord = {
    ...input,
    id,
    createdAt: t,
    updatedAt: t,
  };
  store.jobs.set(id, row);
  return row;
}
