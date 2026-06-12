"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PackagesPage() {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [transactionId, setTransactionId] = useState("");
  const router = useRouter();

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.push("/dashboard");
    }
  };

  const plans = [
    {
      name: "Mini",
      amount: "ETB 200",
      credits: "5",
      perCard: "ETB 40 per card",
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
      subtitle: "Most popular for larger operations",
      popular: false
    },
    {
      name: "Bulk",
      amount: "ETB 10,000",
      credits: "300",
      perCard: "ETB 33.33 per card",
      subtitle: "Most popular for growing businesses",
      popular: false
    },
    {
      name: "Enterprise",
      amount: "Custom",
      credits: "Custom",
      perCard: "Custom",
      subtitle: "Most popular for growing businesses",
      popular: false
    }
  ];

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setStep(2);
  };

  const steps = [
    { id: 1, name: "Select Package" },
    { id: 2, name: "Choose Bank" },
    { id: 3, name: "Submit Payment" }
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 min-h-screen">
      <div>
        <button 
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-[#6156e2] font-bold text-sm mb-6 transition-colors group"
        >
          <svg className="group-hover:-translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
          Back
        </button>
        <h1 className="text-xl font-extrabold text-[#0f1730]">Purchase Credits</h1>
        <p className="text-slate-500 text-sm mt-1">Choose a package that fits your needs.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-start gap-4 md:gap-8 pb-4">
        {steps.map((s, idx) => (
          <div key={s.id} className="flex items-center gap-2 md:gap-4">
            <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full font-bold text-sm transition-all duration-300 ${
              step > s.id ? "bg-emerald-500 text-white" : 
              step === s.id ? "bg-[#6156e2] text-white shadow-lg shadow-indigo-100" : 
              "bg-slate-200 text-slate-500"
            }`}>
              {step > s.id ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : s.id}
            </div>
            <span className={`text-xs md:text-sm font-semibold whitespace-nowrap ${step === s.id ? "text-[#6156e2]" : "text-slate-400"}`}>
              {s.name}
            </span>
            {idx < steps.length - 1 && (
              <div className="hidden sm:block w-8 md:w-16 h-[2px] bg-slate-200"></div>
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-500">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-[32px] border p-8 shadow-sm flex flex-col transition-all hover:shadow-xl hover:-translate-y-1 ${
                plan.popular ? "border-[#6156e2] bg-white ring-2 ring-[#6156e2]/10" : "border-slate-100 bg-white text-dark"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#6156e2] px-4 py-1 text-[10px] font-black tracking-widest text-white uppercase shadow-lg">
                  Most Popular
                </span>
              )}

              <h3 className="text-md font-bold text-[#0f1730]">Package {plan.name}</h3>
              <p className="mt-2 text-xs font-semibold text-slate-400 capitalize">{plan.subtitle || "Access priority processing"}</p>
              
              <div className="mt-6 mb-2">
                <span className="text-lg font-black text-[#0f1730]">{plan.amount}</span>
                <span className="text-xs font-bold text-slate-400 ml-1">{plan.amount === "Custom" ? "" : "Birr"}</span>
              </div>

              <div className={`mt-4 rounded-2xl p-5 flex-grow ${plan.popular ? "bg-indigo-50/50" : "bg-slate-50/50"}`}>
                <div className="flex items-center gap-3">
                  <div className="bg-[#6156e2] text-white p-1 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  <p className="text-xl font-black text-[#0f1730]">
                    {plan.credits} <span className="text-sm font-bold text-slate-500">Credits</span>
                  </p>
                </div>
                <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-slate-400 pl-8">{plan.perCard}</p>
              </div>

              <button
                onClick={() => handleSelectPlan(plan)}
                className={`mt-8 w-full rounded-2xl px-5 py-4 text-sm font-black shadow-lg transition-all active:scale-95 ${
                  plan.popular ? "bg-[#6156e2] text-white hover:bg-[#4f46e5] shadow-indigo-100" : "bg-white border-2 border-slate-100 text-[#0f1730] hover:border-slate-200"
                }`}
              >
                Select Package
              </button>
            </article>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">
          <div className="flex items-center gap-4">
            <p className="text-slate-500 font-bold">
              Selected: <span className="text-[#0f1730]">{selectedPlan.name} Package</span> 
              <span className="mx-2 text-slate-300">•</span>
              <span className="text-[#6156e2]">{selectedPlan.amount}.00</span>
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Bank Card (TeleBirr) */}
            <div className="bg-white rounded-[32px] border-2 border-[#ffb02e] shadow-xl shadow-amber-50 p-8 space-y-8 relative overflow-hidden group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="bg-[#ffb02e]/10 text-[#ffb02e] p-4 rounded-3xl shadow-inner group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 10h8l-2 10"></path></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black text-[#0f1730]">TeleBirr</h3>
                      <span className="bg-[#ffb02e] text-white text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 10h8l-2 10"></path></svg>
                        INSTANT
                      </span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-slate-500 font-bold text-sm">Account: <span className="text-[#0f1730] font-mono select-all">0913401088</span></p>
                      <p className="text-slate-500 font-bold text-sm">Holder: <span className="text-[#0f1730]">eshetu</span></p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 rounded-2xl p-5 border border-slate-100">
                <p className="text-slate-500 text-xs leading-relaxed font-bold">
                  After making the payment, enter the transaction number. The system will automatically verify the payment and add the credits to your account.
                </p>
              </div>

              <button 
                onClick={() => setStep(3)}
                className="w-full bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white font-black py-5 rounded-2xl shadow-xl shadow-purple-200 transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-3"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 10h8l-2 10"></path></svg>
                Pay Instantly via TeleBirr
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-6xl mx-auto py-6 space-y-8 animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-black text-[#0f1730]">Finalize Purchase</h3>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-stretch">
            {/* Left Box: Payment Instructions */}
            <div className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-10 shadow-xl shadow-slate-200/40 flex flex-col">
              <h4 className="text-xl font-black text-[#0f1730] mb-10">Payment Instructions</h4>
              
              <div className="space-y-8 flex-1">
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">Amount to Pay</p>
                  <p className="text-3xl font-black text-[#6156e2]">ETB {selectedPlan.amount.replace("ETB ", "")}.00</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">Bank</p>
                  <p className="text-xl font-black text-[#0f1730]">TeleBirr</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">Account Number</p>
                  <p className="text-xl font-black text-[#0f1730] font-mono tracking-wider">0913401088</p>
                </div>

                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1">Account Holder</p>
                  <p className="text-xl font-black text-[#0f1730]">eshetu</p>
                </div>
              </div>

              <div className="mt-10 bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50">
                <p className="text-slate-600 text-[13px] leading-relaxed font-bold">
                  After making the payment, enter the transaction number. The system will automatically verify the payment and add the package.
                </p>
              </div>
            </div>

            {/* Right Box: Submit Proof */}
            <div className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-10 shadow-xl shadow-slate-200/40 space-y-8">
              <h4 className="text-xl font-black text-[#0f1730]">Submit Payment Proof</h4>
              
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="bg-emerald-500 text-white p-1 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 10h8l-2 10"></path></svg>
                </div>
                <p className="text-emerald-700 text-sm font-bold">
                  Instant Verification <span className="text-emerald-600 font-semibold">— Your payment will be verified automatically</span>
                </p>
              </div>

              <div className="space-y-4 pt-2">
                <label className="block text-sm font-bold text-[#0f1730] ml-1">Transaction Number / Reference</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction number" 
                    className="w-full bg-slate-50 border-2 border-slate-50 focus:border-[#6156e2] focus:bg-white rounded-2xl py-5 px-6 outline-none transition-all text-[#0f1730] text-lg font-mono placeholder:text-slate-300 shadow-inner"
                  />
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-[#8b5cf6] to-[#6366f1] hover:opacity-95 text-white font-black text-lg py-5 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m13 2-2 10h8l-2 10"></path></svg>
                Submit Payment
              </button>

              <div className="text-center">
                <p className="text-slate-400 text-sm font-bold">
                  Your <span className="text-[#6156e2]">{selectedPlan.credits} credits</span> will be added instantly after verification!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Balance Card at Bottom (Only visible on Step 1) */}
      {step === 1 && (
        <div className="mt-8 bg-white border border-slate-100 rounded-[32px] p-8 text-slate-800 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-[#6156e2]/10 text-[#6156e2] p-4 rounded-3xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>
            </div>
            <div>
              <p className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-1">Available Balance</p>
              <div className="flex items-center gap-3">
                <h2 className="text-4xl font-black text-[#0f1730]">12</h2>
                <span className="bg-[#6156e2]/10 text-[#6156e2] px-3 py-1 rounded-lg font-black text-xs">CREDITS</span>
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <p className="text-xs font-bold text-slate-500 mb-3 leading-relaxed">Need a custom volume package or bank support? Our support team is available 24/7.</p>
            <a href="https://t.me/FaydaIDSupport" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-white text-[#6156e2] border-2 border-slate-100 px-6 py-2.5 rounded-xl text-sm font-black shadow-sm hover:border-[#6156e2]/20 hover:bg-slate-50 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4 20-7z"></path></svg>
              Chat with Agent
            </a>
          </div>
        </div>
      )}

      {/* Floating Telegram Support */}
      <div className="fixed bottom-8 right-8 z-50">
        <a href="https://t.me/FaydaIDSupport" target="_blank" rel="noopener noreferrer" className="bg-[#2AABEE] hover:bg-[#229ED9] text-white flex items-center gap-2 px-6 py-3.5 rounded-full font-bold shadow-2xl shadow-sky-200 transition-transform hover:scale-105">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13"></path><path d="m22 2-7 20-4-9-9-4 20-7z"></path></svg>
          Support
        </a>
      </div>
    </div>
  );
}
