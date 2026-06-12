"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import {
  authenticateWithPassword,
  googleSignInAction,
} from "@/app/actions/auth";
import { GOOGLE_CLIENT_ID } from "@/lib/google-client";

const initialAuthState = {};

function FormPendingBridge({ onPending }) {
  const { pending } = useFormStatus();
  useEffect(() => {
    onPending(pending);
  }, [pending, onPending]);
  return null;
}

function AuthSubmitButton({ isLogin, extraDisabled }) {
  const { pending } = useFormStatus();
  const busy = pending || extraDisabled;
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-2xl bg-white px-6 py-4 text-md font-bold text-[#0f1730] disabled:opacity-60"
    >
      {pending ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
    </button>
  );
}

export default function AuthForm({ mode }) {
  const router = useRouter();
  const isLogin = mode === "login";
  const [state, formAction] = useFormState(
    authenticateWithPassword,
    initialAuthState
  );
  const [message, setMessage] = useState("");
  const [formPending, setFormPending] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appOrigin, setAppOrigin] = useState("");

  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

  const googleBlockedMessage = appOrigin
    ? `Google blocked this app. In Google Cloud Console → Credentials → your Web client, add Authorized JavaScript origin: ${appOrigin} (and http://localhost:3000 if you use another port). If the app is in Testing, add your Gmail under OAuth consent screen → Test users.`
    : "Google sign-in was blocked. Check Authorized JavaScript origins in Google Cloud Console.";

  const onFormPending = useCallback((pending) => {
    setFormPending(pending);
  }, []);

  useEffect(() => {
    if (state?.access) {
      window.localStorage.setItem("fayda_access_token", state.access);
      router.push("/dashboard");
    }
  }, [state, router]);

  const handleGoogleAuth = async (credentialResponse) => {
    setMessage("");
    setGoogleBusy(true);
    try {
      const result = await googleSignInAction(
        credentialResponse.credential ?? ""
      );
      if (result.access) {
        window.localStorage.setItem("fayda_access_token", result.access);
        router.push("/dashboard");
      } else {
        setMessage(result.error || "Google authentication failed.");
      }
    } catch {
      setMessage("Unable to connect to server.");
    } finally {
      setGoogleBusy(false);
    }
  };

  const busy = formPending || googleBusy;
  const errorText = state?.error || message;

  const formInner = (
      <form
        action={formAction}
        onSubmit={() => setMessage("")}
        className="mx-auto w-full max-w-[450px] space-y-4"
      >
        <input type="hidden" name="mode" value={isLogin ? "login" : "register"} />
        <FormPendingBridge onPending={onFormPending} />

        <div className="pt-2 space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  First Name
                </label>
                <input
                  name="firstName"
                  className="w-full rounded-2xl border border-slate-700 bg-[#070d22] px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-500 focus:border-[#8a7cff] focus:bg-[#0c132c]"
                  placeholder="First name"
                  required={!isLogin}
                  disabled={busy}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">
                  Last Name
                </label>
                <input
                  name="lastName"
                  className="w-full rounded-2xl border border-slate-700 bg-[#070d22] px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-500 focus:border-[#8a7cff] focus:bg-[#0c132c]"
                  placeholder="Last name"
                  required={!isLogin}
                  disabled={busy}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Email address
            </label>
            <input
              name="email"
              className="w-full rounded-2xl border border-slate-700 bg-[#070d22] px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-500 focus:border-[#8a7cff] focus:bg-[#0c132c]"
              type="email"
              placeholder="name@company.com"
              required
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <input
              name="password"
              className="w-full rounded-2xl border border-slate-700 bg-[#070d22] px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-500 focus:border-[#8a7cff] focus:bg-[#0c132c]"
              type="password"
              placeholder="••••••••"
              required
              disabled={busy}
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">
                Confirm Password
              </label>
              <input
                name="confirmPassword"
                className="w-full rounded-2xl border border-slate-700 bg-[#070d22] px-4 py-3 text-sm outline-none transition-colors placeholder:text-slate-500 focus:border-[#8a7cff] focus:bg-[#0c132c]"
                type="password"
                placeholder="••••••••"
                required={!isLogin}
                disabled={busy}
              />
            </div>
          )}
        </div>

        <AuthSubmitButton isLogin={isLogin} extraDisabled={googleBusy} />

        {GOOGLE_CLIENT_ID ? (
          <div
            className={`flex w-full justify-center pt-2 ${formPending ? "pointer-events-none opacity-50" : ""}`}
          >
            <GoogleLogin
              onSuccess={handleGoogleAuth}
              onError={() => {
                setMessage(googleBlockedMessage);
                setGoogleBusy(false);
              }}
              theme="filled_black"
              size="large"
              shape="pill"
              text="continue_with"
              containerProps={{ style: { width: "100%" } }}
            />
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500 pt-2">
            Set <code className="text-slate-400">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> to enable Google sign-in.
          </p>
        )}

        {GOOGLE_CLIENT_ID && process.env.NODE_ENV === "development" && appOrigin && (
          <p className="text-center text-[11px] text-slate-500 pt-2 leading-snug">
            Dev origin for Google Console:{" "}
            <code className="text-slate-400">{appOrigin}</code>
          </p>
        )}

        {errorText && (
          <p className="text-base text-center text-rose-300">{errorText}</p>
        )}
      </form>
  );

  if (!GOOGLE_CLIENT_ID) {
    return formInner;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {formInner}
    </GoogleOAuthProvider>
  );
}
