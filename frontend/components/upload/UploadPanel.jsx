// "use client";

// import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
// import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
// import { uploadPanelAuthenticate, googleSignInAction } from "@/app/actions/auth";
// import { GOOGLE_CLIENT_ID } from "@/lib/google-client";

// const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// export default function UploadPanel() {
//   const [authMode, setAuthMode] = useState("login");
//   const [username, setUsername] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [token, setToken] = useState("");
//   const [authMessage, setAuthMessage] = useState("");
//   const [frontFile, setFrontFile] = useState(null);
//   const [backFile, setBackFile] = useState(null);
//   const [jobId, setJobId] = useState("");
//   const [status, setStatus] = useState("");
//   const [downloadUrl, setDownloadUrl] = useState("");
//   const [authPending, startAuthTransition] = useTransition();
//   const [googleBusy, setGoogleBusy] = useState(false);

//   const handleGoogleAuth = useCallback(async (credentialResponse) => {
//     setAuthMessage("");
//     setGoogleBusy(true);
//     try {
//       const result = await googleSignInAction(credentialResponse.credential ?? "");
//       if (result.access) {
//         setToken(result.access);
//         window.localStorage.setItem("fayda_access_token", result.access);
//         setAuthMessage("Signed in with Google.");
//       } else {
//         setAuthMessage(result.error ?? "Google sign-in failed.");
//       }
//     } catch {
//       setAuthMessage("Unable to connect to server.");
//     } finally {
//       setGoogleBusy(false);
//     }
//   }, []);

//   useEffect(() => {
//     const saved = window.localStorage.getItem("fayda_access_token");
//     if (saved) {
//       setToken(saved);
//       setAuthMessage("Authenticated from saved session.");
//     }
//   }, []);

//   const loggedIn = useMemo(() => token.length > 0, [token]);

//   const auth = () => {
//     startAuthTransition(async () => {
//       const result = await uploadPanelAuthenticate({
//         mode: authMode,
//         username,
//         email,
//         password,
//       });
//       if (result.access) {
//         setToken(result.access);
//         window.localStorage.setItem("fayda_access_token", result.access);
//         setAuthMessage("Authenticated successfully.");
//       } else {
//         setAuthMessage(result.error ?? "Authentication failed.");
//       }
//     });
//   };

//   const logout = () => {
//     setToken("");
//     setAuthMessage("Signed out.");
//     window.localStorage.removeItem("fayda_access_token");
//   };

//   const submit = async () => {
//     if (!frontFile || !token) return;
//     const formData = new FormData();
//     formData.append("image", frontFile);
//     if (backFile) {
//       formData.append("image_back", backFile);
//     }
//     const response = await fetch(`${apiBase}/process-id`, {
//       method: "POST",
//       headers: { Authorization: `Bearer ${token}` },
//       body: formData
//     });
//     const data = await response.json();
//     setJobId(data.job_id || "");
//     setStatus(data.status || "queued");
//     setDownloadUrl("");
//   };

//   const checkJob = async () => {
//     if (!jobId || !token) return;
//     const response = await fetch(`${apiBase}/job/${jobId}`, {
//       headers: { Authorization: `Bearer ${token}` }
//     });
//     const data = await response.json();
//     setStatus(data.status || "unknown");
//     if (data.status === "done") {
//       const downloadResp = await fetch(`${apiBase}/download/${jobId}`, {
//         headers: { Authorization: `Bearer ${token}` }
//       });
//       const downloadData = await downloadResp.json();
//       setDownloadUrl(downloadData.download_url || "");
//     }
//   };

//   const authBody = (
//     <>
//       <div className="mb-4 flex gap-2 rounded-xl bg-slate-100 p-1">
//         <button
//           className={`w-full rounded-lg px-3 py-2 text-sm ${authMode === "login" ? "bg-white font-semibold" : ""}`}
//           onClick={() => setAuthMode("login")}
//         >
//           Login
//         </button>
//         <button
//           className={`w-full rounded-lg px-3 py-2 text-sm ${authMode === "register" ? "bg-white font-semibold" : ""}`}
//           onClick={() => setAuthMode("register")}
//         >
//           Register
//         </button>
//       </div>

//       <div className="grid gap-3">
//         <input
//           className="rounded-xl border p-3"
//           type="text"
//           placeholder="Username"
//           value={username}
//           onChange={(e) => setUsername(e.target.value)}
//           disabled={authPending || googleBusy}
//         />
//         {authMode === "register" && (
//           <input
//             className="rounded-xl border p-3"
//             type="email"
//             placeholder="Email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             disabled={authPending || googleBusy}
//           />
//         )}
//         <input
//           className="rounded-xl border p-3"
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={(e) => setPassword(e.target.value)}
//           disabled={authPending || googleBusy}
//         />
//         <div className="flex gap-2">
//           <button
//             className="w-full rounded-xl bg-dark px-4 py-2 text-white disabled:opacity-60"
//             onClick={auth}
//             disabled={authPending || googleBusy}
//           >
//             {authPending ? "Please wait..." : authMode === "login" ? "Sign In" : "Create Account"}
//           </button>
//           {loggedIn && (
//             <button className="rounded-xl border px-4 py-2" onClick={logout}>
//               Logout
//             </button>
//           )}
//         </div>

//         {GOOGLE_CLIENT_ID ? (
//           <div
//             className={`flex w-full justify-center pt-3 ${authPending || googleBusy ? "pointer-events-none opacity-50" : ""}`}
//           >
//             <GoogleLogin
//               onSuccess={handleGoogleAuth}
//               onError={() => {
//                 setAuthMessage("Google sign-in was unsuccessful.");
//                 setGoogleBusy(false);
//               }}
//               theme="outline"
//               size="large"
//               shape="pill"
//               text="continue_with"
//               containerProps={{ style: { width: "100%" } }}
//             />
//           </div>
//         ) : (
//           <p className="text-center text-xs text-slate-400 pt-2">
//             Add <code className="text-slate-500">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> in{" "}
//             <code className="text-slate-500">frontend/.env</code> for Google sign-in.
//           </p>
//         )}

//         {authMessage && <p className="text-sm text-slate-600">{authMessage}</p>}
//       </div>
//       </>
//   );

//   return (
//     <div className="rounded-[28px] bg-white p-6 shadow-sm">
//       {GOOGLE_CLIENT_ID ? (
//         <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{authBody}</GoogleOAuthProvider>
//       ) : (
//         authBody
//       )}

//       <hr className="my-5" />
//       <h2 className="text-lg font-semibold text-dark">Try it now — upload ID images</h2>
//       <div className="mt-3 grid gap-3">
//         <label className="grid gap-1 text-sm text-slate-600">
//           <span className="font-medium text-dark">Front (required)</span>
//           <input
//             type="file"
//             accept="image/*"
//             className="rounded-xl border p-3"
//             onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
//           />
//         </label>
//         <label className="grid gap-1 text-sm text-slate-600">
//           <span className="font-medium text-dark">Back (optional)</span>
//           <input
//             type="file"
//             accept="image/*"
//             className="rounded-xl border p-3"
//             onChange={(e) => setBackFile(e.target.files?.[0] || null)}
//           />
//         </label>
//         <div className="flex gap-3">
//           <button
//             className="rounded-xl bg-brand px-4 py-2 text-white disabled:opacity-40"
//             onClick={submit}
//             disabled={!loggedIn || !frontFile}
//           >
//             Start Processing
//           </button>
//           <button className="rounded-xl border px-4 py-2 disabled:opacity-40" onClick={checkJob} disabled={!jobId}>
//             Check Job
//           </button>
//         </div>
//         {jobId && <p className="text-sm">Job ID: {jobId}</p>}
//         {status && <p className="text-sm">Status: {status}</p>}
//         {downloadUrl && (
//           <a className="text-sm font-semibold text-brand underline" href={downloadUrl} target="_blank" rel="noreferrer">
//             Download PDF
//           </a>
//         )}
//       </div>
//     </div>
//   );
// }
