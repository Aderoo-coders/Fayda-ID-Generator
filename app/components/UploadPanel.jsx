"use client";

import { useEffect, useMemo, useState } from "react";

const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function UploadPanel() {
  const [authMode, setAuthMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [file, setFile] = useState(null);
  const [jobId, setJobId] = useState("");
  const [status, setStatus] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("fayda_access_token");
    if (saved) {
      setToken(saved);
      setAuthMessage("Authenticated from saved session.");
    }
  }, []);

  const loggedIn = useMemo(() => token.length > 0, [token]);

  const auth = async () => {
    try {
      if (authMode === "register") {
        const registerResp = await fetch(`${apiBase}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password })
        });
        if (!registerResp.ok) {
          setAuthMessage("Registration failed.");
          return;
        }
      }

      const loginResp = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const loginData = await loginResp.json();
      if (!loginResp.ok || !loginData.access) {
        setAuthMessage("Login failed. Check credentials.");
        return;
      }
      setToken(loginData.access);
      window.localStorage.setItem("fayda_access_token", loginData.access);
      setAuthMessage("Authenticated successfully.");
    } catch {
      setAuthMessage("Authentication request failed.");
    }
  };

  const logout = () => {
    setToken("");
    setAuthMessage("Signed out.");
    window.localStorage.removeItem("fayda_access_token");
  };

  const submit = async () => {
    if (!file || !token) return;
    const formData = new FormData();
    formData.append("image", file);
    const response = await fetch(`${apiBase}/process-id`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    const data = await response.json();
    setJobId(data.job_id || "");
    setStatus(data.status || "queued");
    setDownloadUrl("");
  };

  const checkJob = async () => {
    if (!jobId || !token) return;
    const response = await fetch(`${apiBase}/job/${jobId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setStatus(data.status || "unknown");
    if (data.status === "done") {
      const downloadResp = await fetch(`${apiBase}/download/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const downloadData = await downloadResp.json();
      setDownloadUrl(downloadData.download_url || "");
    }
  };

  return (
    <div className="rounded-[28px] bg-white p-6 shadow-sm">
      <div className="mb-4 flex gap-2 rounded-xl bg-slate-100 p-1">
        <button
          className={`w-full rounded-lg px-3 py-2 text-sm ${authMode === "login" ? "bg-white font-semibold" : ""}`}
          onClick={() => setAuthMode("login")}
        >
          Login
        </button>
        <button
          className={`w-full rounded-lg px-3 py-2 text-sm ${authMode === "register" ? "bg-white font-semibold" : ""}`}
          onClick={() => setAuthMode("register")}
        >
          Register
        </button>
      </div>

      <div className="grid gap-3">
        <input className="rounded-xl border p-3" type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        {authMode === "register" && (
          <input className="rounded-xl border p-3" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        )}
        <input className="rounded-xl border p-3" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex gap-2">
          <button className="w-full rounded-xl bg-dark px-4 py-2 text-white" onClick={auth}>
            {authMode === "login" ? "Sign In" : "Create Account"}
          </button>
          {loggedIn && (
            <button className="rounded-xl border px-4 py-2" onClick={logout}>
              Logout
            </button>
          )}
        </div>
        {authMessage && <p className="text-sm text-slate-600">{authMessage}</p>}
      </div>

      <hr className="my-5" />
      <h2 className="text-lg font-semibold text-dark">Try it now - Upload your ID image</h2>
      <div className="mt-3 grid gap-3">
        <input type="file" accept="image/*" className="rounded-xl border p-3" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <div className="flex gap-3">
          <button className="rounded-xl bg-brand px-4 py-2 text-white disabled:opacity-40" onClick={submit} disabled={!loggedIn}>
            Start Processing
          </button>
          <button className="rounded-xl border px-4 py-2 disabled:opacity-40" onClick={checkJob} disabled={!jobId}>
            Check Job
          </button>
        </div>
        {jobId && <p className="text-sm">Job ID: {jobId}</p>}
        {status && <p className="text-sm">Status: {status}</p>}
        {downloadUrl && (
          <a className="text-sm font-semibold text-brand underline" href={downloadUrl} target="_blank" rel="noreferrer">
            Download PDF
          </a>
        )}
      </div>
    </div>
  );
}
