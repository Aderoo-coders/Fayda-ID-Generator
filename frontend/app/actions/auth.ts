"use server";

import { headers } from "next/headers";

export type AuthActionState = {
  error?: string;
  access?: string;
};

function backendApiBase(): string {
  return (
    process.env.API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000/api"
  );
}

function serverOrigin(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (!host) return "http://127.0.0.1:3000";
  return `${proto}://${host}`;
}

/** AuthForm: email is username; optional register fields. */
export async function authenticateWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const apiBase = backendApiBase();
  const mode = String(formData.get("mode") || "login");
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    if (mode === "register") {
      if (password !== confirmPassword) {
        return { error: "Passwords do not match." };
      }
      const registerResp = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: email,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });
      if (!registerResp.ok) {
        return { error: "Registration failed. Please try again." };
      }
    }

    const loginResp = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });
    let data: { access?: string };
    try {
      data = await loginResp.json();
    } catch {
      return { error: "Invalid response from server." };
    }
    if (!loginResp.ok || !data.access) {
      return { error: "Invalid credentials." };
    }
    return { access: data.access };
  } catch {
    return { error: "Unable to connect to server." };
  }
}

/** UploadPanel: separate username + email on register. */
export async function uploadPanelAuthenticate(input: {
  mode: "login" | "register";
  username: string;
  email: string;
  password: string;
}): Promise<AuthActionState> {
  const apiBase = backendApiBase();
  const username = input.username.trim();
  const password = input.password;
  const email = input.email.trim();

  if (!username || !password) {
    return { error: "Username and password are required." };
  }
  if (input.mode === "register" && !email) {
    return { error: "Email is required for registration." };
  }

  try {
    if (input.mode === "register") {
      const registerResp = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      if (!registerResp.ok) {
        return { error: "Registration failed." };
      }
    }

    const loginResp = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const loginData = (await loginResp.json()) as { access?: string };
    if (!loginResp.ok || !loginData.access) {
      return { error: "Login failed. Check credentials." };
    }
    return { access: loginData.access };
  } catch {
    return { error: "Authentication request failed." };
  }
}

export async function googleSignInAction(idToken: string): Promise<AuthActionState> {
  if (!idToken) {
    return { error: "Missing Google credential." };
  }
  const backendOverride = process.env.GOOGLE_AUTH_BACKEND_URL?.replace(/\/$/, "");
  const url = backendOverride
    ? `${backendOverride}/auth/google`
    : `${serverOrigin()}/api/auth/google`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: idToken }),
    });
    let data: { access?: string };
    try {
      data = await res.json();
    } catch {
      return { error: "Invalid response from server." };
    }
    if (!res.ok || !data.access) {
      return { error: "Google authentication failed. Please try again." };
    }
    return { access: data.access };
  } catch {
    return { error: "Unable to connect to server." };
  }
}
