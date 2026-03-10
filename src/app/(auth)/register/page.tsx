import Link from "next/link"

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-lg">TW</div>
            <span className="text-xl font-bold text-white">TradingWatcher</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-slate-400 mt-2">Start following the smart money for free</p>
        </div>
        <div className="bg-[#12121a] border border-[#1e1e2e] rounded-2xl p-8">
          <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#2e2e45] text-white hover:bg-[#1e1e2e] transition-colors mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign up with Google
          </button>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#2e2e45]" /></div>
            <div className="relative flex justify-center text-xs text-slate-500"><span className="bg-[#12121a] px-2">or continue with email</span></div>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder="Full name" className="w-full h-11 px-4 rounded-xl border border-[#2e2e45] bg-[#0a0a0f] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
            <input type="email" placeholder="you@example.com" className="w-full h-11 px-4 rounded-xl border border-[#2e2e45] bg-[#0a0a0f] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
            <input type="password" placeholder="Create a password" className="w-full h-11 px-4 rounded-xl border border-[#2e2e45] bg-[#0a0a0f] text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors" />
            <button className="w-full h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-semibold hover:opacity-90 transition-opacity">Create Account</button>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-indigo-400 hover:text-indigo-300">Terms</Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-indigo-400 hover:text-indigo-300">Privacy Policy</Link>
          </p>
          <p className="text-center text-sm text-slate-400 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
