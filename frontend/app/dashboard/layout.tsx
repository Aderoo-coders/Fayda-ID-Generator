"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24">
          <path fill="currentColor" d="m12 5.69l5 4.5V18h-2v-6H9v6H7v-7.81zM12 3L2 12h3v8h6v-6h2v6h6v-8h3z"></path>
        </svg>
      )
    },
    {
      name: "Buy Packages",
      href: "/dashboard/packages",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"></rect><line x1="2" x2="22" y1="10" y2="10"></line></svg>
      )
    },
    {
      name: "Package History",
      href: "/dashboard/history",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path></svg>
      )
    },
    {
      name: "Test ML Model",
      href: "/dashboard/ml-test",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <line x1="9" y1="1" x2="9" y2="4" />
          <line x1="15" y1="1" x2="15" y2="4" />
          <line x1="9" y1="20" x2="9" y2="23" />
          <line x1="15" y1="20" x2="15" y2="23" />
          <line x1="20" y1="9" x2="23" y2="9" />
          <line x1="20" y1="15" x2="23" y2="15" />
          <line x1="1" y1="9" x2="4" y2="9" />
          <line x1="1" y1="15" x2="4" y2="15" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 shadow-sm flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 p-1.5 text-[10px] font-bold text-white shadow-sm leading-none">ID</div>
            <span className="text-lg font-bold text-[#0f1730]">Fayda Panel</span>
          </Link>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors font-medium text-sm ${
                  isActive 
                    ? "bg-[#eeecff] text-[#6156e2]" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">
              U
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-semibold text-slate-800 truncate">Test User</p>
              <p className="text-xs text-slate-500 truncate">user@example.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Top Header / Breadcrumbs */}
        {/* <header className="h-16 flex items-center px-8 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.history.back()}
              className={`p-2 -ml-2 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition-colors ${pathname === "/dashboard" ? "invisible" : "visible"}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"></path></svg>
            </button>
            <nav className="flex items-center gap-2 text-sm font-bold">
              <Link href="/" className="text-slate-400 hover:text-slate-800 transition-colors">Dashboard</Link>
              {pathname !== "/dashboard" && (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"></path></svg>
                  <span className="text-[#6156e2]">
                    {pathname.split("/").pop()?.charAt(0).toUpperCase()}{pathname.split("/").pop()?.slice(1)}
                  </span>
                </>
              )}
            </nav>
          </div>
        </header> */}

        <div className="min-h-[calc(100vh-64px)]">
          {children}
        </div>
      </main>
    </div>
  );
}
