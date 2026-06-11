import Link from "next/link";
import LandingHero from "@/components/layout/LandingHero";

export default function HomePage() {
  const steps = [
    {
      id: "STEP 01",
      title: "Upload PDF",
      description: "Drag and drop your ID card PDF. We support batch uploads up to 100 files.",
      icon: "↥"
    },
    {
      id: "STEP 02",
      title: "AI Processing",
      description: "Our AI extracts data, detects photos, and formats everything automatically.",
      icon: "▭"
    },
    {
      id: "STEP 03",
      title: "Download & Print",
      description: "Get high-resolution, print-ready cards optimized for standard ID printers.",
      icon: "⎙"
    }
  ];
  const plans = [
    {
      name: "Mini",
      amount: "ETB 200",
      credits: "5",
      perCard: "ETB 40 per card",
      subtitle: "",
      popular: false
    },
    {
      name: "Mini 2",
      amount: "ETB 500",
      credits: "13",
      perCard: "ETB 38.46 per card",
      subtitle: "",
      popular: false
    },
    {
      name: "Basic",
      amount: "ETB 1,000",
      credits: "25",
      perCard: "ETB 40 per card",
      subtitle: "Great for small print shops",
      popular: true
    },
    {
      name: "Professional",
      amount: "ETB 2,000",
      credits: "60",
      perCard: "ETB 33.33 per card",
      subtitle: "Most popular for growing businesses",
      popular: false
    },
    {
      name: "Pro",
      amount: "ETB 5,000",
      credits: "150",
      perCard: "ETB 33.33 per card",
      subtitle: "Most popular for growing businesses",
      popular: false
    },
    {
      name: "Bulk",
      amount: "ETB 5,000",
      credits: "150",
      perCard: "ETB 33.33 per card",
      subtitle: "For high volume usage",
      popular: false
    },
    {
      name: "Enterprises",
      amount: "ETB 5,000",
      credits: "Custom",
      perCard: "ETB 33.33 per card",
      subtitle: "For high volume usage",
      popular: false
    }
  ];

  return (
    <main className="min-h-screen bg-[#f4f5fa]">
      <LandingHero />

      <section className="mx-auto scroll-mt-24 mt-16 max-w-4xl px-6 pb-14">
        <div className="w-full rounded-[28px] bg-white p-8 shadow-sm">
          <p className="text-center text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">Sample Output Preview</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="relative flex h-46 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <img src="/static/fyda-45-degree.png" alt="ID Card Preview" className="h-full w-full object-contain drop-shadow-sm" />
            </div>
            <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
              <img src="/static/IMG_20260408_185913_926.jpg" alt="ID Card Preview" className="h-full w-full object-contain drop-shadow-sm" />
            </div>
          </div>
          <div className="mt-4 relative flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
            <img src="/static/Ethiopian digital ID card mockup.png" alt="ID Card Preview" className="h-full w-full object-contain drop-shadow-sm"/>
          </div>
        </div>

        {/* <UploadPanel /> */}
      </section>

      <section id="features" className="mx-auto scroll-mt-24 max-w-6xl px-6 pb-20 pt-6">
        <div className="text-center">
          <p className="mx-auto w-fit rounded-full bg-[#ece9ff] px-4 py-1 text-xs font-semibold text-slate-600">How It Works</p>
          <h2 className="mt-4 text-4xl font-extrabold text-dark md:text-5xl">From PDF to Print in 3 Steps</h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600">
            No complicated software. No learning curve. Just upload and download.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.id} className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eeecff] text-2xl text-[#6156e2]">
                {step.icon}
              </div>
              <p className="mt-5 text-xs font-bold tracking-[0.14em] text-slate-400">{step.id}</p>
              <h3 className="mt-2 text-3xl font-extrabold text-dark">{step.title}</h3>
              <p className="mt-4 text-lg leading-relaxed text-slate-600">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto scroll-mt-24 max-w-6xl px-6 pb-24 pt-4">
        <div className="text-center">
          <p className="mx-auto w-fit rounded-full bg-slate-200 px-4 py-1 text-xs font-semibold text-slate-600">Simple Pricing</p>
          <h2 className="mt-4 text-4xl font-extrabold text-dark md:text-5xl">Pay Only for What You Use</h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600">
            No subscriptions. No hidden fees. Buy Packages and use them whenever you need.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-3xl border p-6 shadow-sm ${
                plan.popular ? "border-[#101936] bg-[#0f1730] text-white" : "border-slate-200 bg-white text-dark"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-bold tracking-wide text-white">
                  POPULAR
                </span>
              )}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              {plan.subtitle && (
                <p className={`mt-2 text-sm ${plan.popular ? "text-slate-300" : "text-slate-600"}`}>{plan.subtitle}</p>
              )}
              <p className="mt-4 text-xl font-bold">{plan.amount}</p>

              <div className={`mt-5 rounded-2xl p-4 ${plan.popular ? "bg-[#2a334a]" : "bg-[#f3f4f8]"}`}>
                <p className={`text-2xl font-bold ${plan.popular ? "text-[#8a7cff]" : "text-brand"}`}>{plan.credits} <span className={`${plan.popular ? "text-slate-300" : "text-slate-600"}`}>credits</span> </p>
                
              </div>

              <p className={`mt-5 text-xs ${plan.popular ? "text-slate-300" : "text-slate-500"}`}>{plan.perCard}</p>
              <Link href="/register">
              <button
                className={`mt-4 w-full rounded-full px-5 py-3  font-semibold ${
                  plan.popular ? "bg-white text-[#0f1730]" : "bg-[#0f1730] text-white"
                }`}
              >
                Get Started
              </button>
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section id="contact" className="mx-auto scroll-mt-24 max-w-6xl px-6 pb-24 pt-4">
        <div className="text-center">
          {/* <p className="mx-auto w-fit rounded-full bg-blue-100 px-4 py-1 text-xs font-semibold text-blue-700">Contact Us</p> */}
          <h2 className="mt-4 text-4xl font-extrabold text-dark md:text-5xl">Get in Touch</h2>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600">
            Have questions about our packages, pricing, or need custom solutions? We're here to help.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Contact Details */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-extrabold text-dark">Contact Information</h3>
            <p className="mt-2 text-slate-600">Reach out to us directly through any of these channels.</p>
            
            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eeecff] text-[#6156e2]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400">PHONE</p>
                  <p className="text-lg font-bold text-dark">+251 900 000 000</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#ecfdf5] text-[#059669]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400">EMAIL</p>
                  <p className="text-lg font-bold text-dark">support@faydaids.com</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400">TELEGRAM</p>
                  <p className="text-lg font-bold text-dark">@FaydaIDSupport</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-2xl font-extrabold text-dark">Send a Message</h3>
            <form className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="mb-1 block text-sm font-bold text-slate-700">First Name</label>
                  <input type="text" id="firstName" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#6156e2] focus:bg-white focus:ring-1 focus:ring-[#6156e2]" placeholder="John" />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1 block text-sm font-bold text-slate-700">Last Name</label>
                  <input type="text" id="lastName" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#6156e2] focus:bg-white focus:ring-1 focus:ring-[#6156e2]" placeholder="Doe" />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-bold text-slate-700">Email Address</label>
                <input type="email" id="email" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#6156e2] focus:bg-white focus:ring-1 focus:ring-[#6156e2]" placeholder="john@example.com" />
              </div>
              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-bold text-slate-700">Message</label>
                <textarea id="message" rows="4" className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#6156e2] focus:bg-white focus:ring-1 focus:ring-[#6156e2]" placeholder="How can we help you?"></textarea>
              </div>
              <button type="button" className="w-full rounded-full bg-[#0f1730] px-5 py-3 text-lg font-bold text-white transition-opacity hover:opacity-90">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </section>
      <footer className="mt-12 w-full border-t border-slate-200 bg-white py-8 text-center">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-6 md:flex-row md:gap-0 mt-4">
          
          <Link href="/" className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 p-2 text-xs font-bold text-white shadow-sm">ID</div>
            <span className="text-xl font-bold text-dark">Fayda ID Generator</span>
          </Link>

          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-slate-500">
            <Link href="/#features" className="transition-colors hover:text-[#6156e2]">Features</Link>
            <Link href="/#pricing" className="transition-colors hover:text-[#6156e2]">Pricing</Link>
            <Link href="/#contact" className="transition-colors hover:text-[#6156e2]">Contact Us</Link>
          </div>
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Fayda ID Generator. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
