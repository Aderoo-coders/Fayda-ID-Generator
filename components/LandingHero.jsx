import Link from "next/link";

export default function LandingHero() {
  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 bg-[#f4f5fa]/80 backdrop-blur-md">
        <nav className="mx-auto flex w-full items-center justify-between px-16 py-4 shadow-sm">
          <Link href="#hero-section" className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 p-2 text-xs font-bold text-white">ID</div>
            <span className="text-xl font-bold text-dark md:text-2xl">Fayda ID Generator</span>
          </Link>
          <div className="hidden gap-12 text-sm font-medium text-slate-600 md:flex">
            <Link href="/#features" className="transition-colors hover:text-brand">
              Features
            </Link>
            <Link href="/#pricing" className="transition-colors hover:text-brand">
              Pricing
            </Link>
            <a className="text-[#6156e2] transition-colors hover:text-[#5f56d8]" href="/#contact">
              Contact Us
            </a>
          </div>
          <div className="flex items-center gap-6">
            <Link className="text-sm font-semibold text-slate-700 transition-colors hover:text-dark" href="/login">
              Sign In
            </Link>
            <Link className="rounded-full bg-[#0f1730] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90" href="/register">
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto mt-32 max-w-6xl px-6 text-center md:mt-30">
        <p className="mx-auto w-fit rounded-full bg-white px-5 py-2 text-sm font-medium text-slate-600 shadow-sm border border-slate-100">Trusted by 500+ print shops</p>
        <h1 className="mt-8 text-5xl font-extrabold leading-[1.1] text-dark md:text-7xl">
          Ethiopian ID Cards
          <br />
          <span className="text-brand">Made Print-Ready</span>
        </h1>
        <p className="mx-auto mt-8 max-w-3xl text-[26px] leading-tight text-slate-600 md:text-[28px]">
          Upload your PDF, get print-ready ID cards in seconds. No software needed. Try it now - free preview included.
        </p>
      </section>
    </>
  );
}
