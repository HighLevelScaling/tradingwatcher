"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { CreditCard, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function BillingPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("success")) setMessage("Subscription activated! Welcome to Pro.")
    if (params.get("canceled")) setMessage("Checkout canceled.")
  }, [])

  const handleManageBilling = async () => {
    setLoading(true)
    const res = await fetch("/api/stripe/create-portal", { method: "POST" })
    const { url } = await res.json()
    if (url) window.location.href = url
    setLoading(false)
  }

  const handleUpgrade = async (priceId: string) => {
    setLoading(true)
    const res = await fetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    setLoading(false)
  }

  const isPro = session?.user?.tier === "PRO" || session?.user?.tier === "ENTERPRISE"

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-white mb-2">Billing &amp; Subscription</h1>
      <p className="text-slate-400 mb-8">Manage your TradingWatcher subscription</p>

      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg mb-6 ${message.includes("activated") ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-amber-500/10 border border-amber-500/30 text-amber-400"}`}>
          {message.includes("activated") ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">{isPro ? "Pro" : "Free"}</p>
              <p className="text-slate-400 text-sm mt-1">
                {isPro ? "Full access to all features" : "Basic access with 48h data delay"}
              </p>
            </div>
            {isPro ? (
              <Button variant="outline" onClick={handleManageBilling} disabled={loading} className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                {loading ? "Loading..." : "Manage Subscription"}
              </Button>
            ) : (
              <Link href="/pricing">
                <Button>Upgrade to Pro</Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>

      {!isPro && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade to Pro — $19/month</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-slate-300 text-sm mb-6">
              {["Live real-time data", "All congress trades", "All 13F filings", "Unlimited alerts", "Email notifications"].map(f => (
                <li key={f} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || "")}
              disabled={loading}
            >
              {loading ? "Redirecting..." : "Upgrade Now"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
