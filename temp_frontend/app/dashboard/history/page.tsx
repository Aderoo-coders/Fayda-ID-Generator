"use client";

import { useState } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const [historyItems] = useState([
    {
      id: "PKG-78291",
      date: "2026-04-10",
      package: "Basic Package",
      amount: "ETB 1,000",
      status: "Completed",
      credits: 25
    },
    {
      id: "PKG-65302",
      date: "2026-03-22",
      package: "Mini Package",
      amount: "ETB 200",
      status: "Completed",
      credits: 5
    },
    {
      id: "PKG-59104",
      date: "2026-03-05",
      package: "Professional Package",
      amount: "ETB 2,000",
      status: "Completed",
      credits: 60
    },
    {
      id: "PKG-48291",
      date: "2026-02-14",
      package: "Basic Package",
      amount: "ETB 1,000",
      status: "Failed",
      credits: 0
    }
  ]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 min-h-screen">
      <div>
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-[#6156e2] font-bold text-sm mb-4 transition-colors group"
        >
          <svg className="group-hover:-translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
          Back
        </Link>
        <h1 className="text-2xl font-extrabold text-[#0f1730]">Package History</h1>
        <p className="text-slate-500 text-sm mt-1">View your previous purchases and transaction status.</p>
      </div>

      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold uppercase text-xs tracking-wider">
              <tr>
                <th className="px-6 py-4">Transaction ID</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Package</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Credits</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[#0f1730]">{item.id}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(item.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-semibold text-slate-700">{item.package}</td>
                  <td className="px-6 py-4 text-slate-600">{item.amount}</td>
                  <td className="px-6 py-4 font-bold text-[#6156e2]">+{item.credits}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === "Completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-[#6156e2] hover:text-[#4f46e5] font-semibold text-xs uppercase tracking-wider">
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {historyItems.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" className="mx-auto mb-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            <p>No transaction history found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
