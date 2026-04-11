import Link from "next/link";

export default function AuthSplitLayout({ title, subtitle, mode, children }) {
  const isLogin = mode === "login";

  return (
    <main className="min-h-screen bg-[#060b1d] text-white">
      <section className="grid min-h-screen lg:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-lg">
            <h1 className="text-2xl text-center">{title}</h1>
            <p className="mt-6 text-lg text-center text-slate-400">{subtitle}</p>
            <div className="mt-8">{children}</div>
            <p className="mt-8 text-lg text-center text-slate-400">
              {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
              <Link className="text-[#8a7cff]" href={isLogin ? "/register" : "/login"}>
                {isLogin ? "Create account" : "Sign in"}
              </Link>
            </p>
          </div>
        </div>

        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[#4e35f1]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="relative z-10 flex h-full flex-col px-10 py-8">
            <Link href="/" className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 p-2 text-xs font-bold text-white shadow-sm">ID</div>
            <span className="text-xl font-bold text-white">Fayda ID Generator</span>
          </Link>
            <div className="mt-auto grid grid-cols-3 gap-8">
              <div>
                <p className="text-5xl font-extrabold">10K+</p>
                <p className="text-lg text-white/80">Cards Processed Daily</p>
              </div>
              <div>
                <p className="text-5xl font-extrabold">500+</p>
                <p className="text-lg text-white/80">Active Customers</p>
              </div>
              <div>
                <p className="text-5xl font-extrabold">99.9%</p>
                <p className="text-lg text-white/80">Uptime</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
