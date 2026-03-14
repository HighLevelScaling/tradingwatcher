"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Plus, Trash2, Star, StarOff, ToggleLeft, ToggleRight,
  FlaskConical, Globe, AlertCircle, CheckCircle2, Loader2, ChevronDown
} from "lucide-react"

interface Exchange {
  id: string
  name: string
  exchangeId: string
  sandbox: boolean
  isPrimary: boolean
  isActive: boolean
  label: string | null
  createdAt: string
}

// Popular exchanges grouped for the dropdown
const POPULAR_EXCHANGES = [
  { group: "Most Popular", items: ["binance", "bybit", "okx", "kraken", "coinbase", "kucoin"] },
  { group: "Spot / Altcoins", items: ["gate", "mexc", "bitget", "huobi", "bitfinex", "gemini"] },
  { group: "Derivatives", items: ["bitmex", "deribit", "phemex", "binanceusdm", "bybit"] },
  { group: "Regional", items: ["upbit", "bithumb", "luno", "independentreserve"] },
]

const LABEL_COLORS = [
  { label: "Blue", value: "blue", cls: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { label: "Green", value: "green", cls: "bg-green-500/20 text-green-400 border-green-500/30" },
  { label: "Purple", value: "purple", cls: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  { label: "Orange", value: "orange", cls: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { label: "Red", value: "red", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
]

function labelCls(label: string | null) {
  return LABEL_COLORS.find((c) => c.value === label)?.cls ?? "bg-slate-500/20 text-slate-400 border-slate-500/30"
}

const EMPTY_FORM = {
  name: "",
  exchangeId: "",
  apiKey: "",
  secretKey: "",
  sandbox: true,
  isPrimary: false,
  label: "",
}

export default function ExchangesPage() {
  const [exchanges, setExchanges] = useState<Exchange[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/trading/exchanges")
    const data = await res.json()
    setExchanges(data.exchanges ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const flash = (msg: string, type: "ok" | "err") => {
    if (type === "ok") { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }
    else { setError(msg); setTimeout(() => setError(null), 4000) }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const res = await fetch("/api/trading/exchanges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setForm(EMPTY_FORM)
      setShowForm(false)
      flash("Exchange added!", "ok")
      load()
    } else {
      const d = await res.json()
      flash(d.error ?? "Failed to add exchange", "err")
    }
  }

  const patch = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/trading/exchanges/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) { load(); flash("Saved", "ok") }
    else flash("Update failed", "err")
  }

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/trading/exchanges/${id}`, { method: "DELETE" })
    if (res.ok) { flash("Exchange removed", "ok"); load() }
    else flash("Delete failed", "err")
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Exchanges</h1>
          <p className="text-sm text-slate-400 mt-1">
            Add unlimited exchanges — cross-exchange arbitrage activates when 2+ are connected.
            CCXT supports <span className="text-indigo-400 font-medium">250+ exchanges</span>.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Exchange
        </button>
      </div>

      {/* Flash messages */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-[#0d0d14] border border-[#2e2e45] rounded-2xl p-6">
          <h2 className="text-base font-semibold text-white mb-4">New Exchange</h2>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Exchange ID */}
              <div className="relative">
                <label className="block text-xs text-slate-400 mb-1.5">Exchange</label>
                <div className="relative">
                  <input
                    value={form.exchangeId}
                    onChange={(e) => setForm({ ...form, exchangeId: e.target.value.toLowerCase() })}
                    placeholder="e.g. binance, bybit, kraken, okx…"
                    className="w-full h-10 px-3 pr-10 rounded-lg bg-[#12121a] border border-[#2e2e45] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
                {showDropdown && (
                  <div className="absolute z-20 mt-1 w-full bg-[#12121a] border border-[#2e2e45] rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    {POPULAR_EXCHANGES.map((group) => (
                      <div key={group.group}>
                        <div className="px-3 pt-2 pb-1 text-xs text-slate-500 uppercase tracking-wide">{group.group}</div>
                        {group.items.map((ex) => (
                          <button
                            key={ex}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, exchangeId: ex, name: form.name || ex.charAt(0).toUpperCase() + ex.slice(1) })
                              setShowDropdown(false)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-[#1e1e2e] hover:text-white transition-colors"
                          >
                            {ex}
                          </button>
                        ))}
                      </div>
                    ))}
                    <div className="px-3 py-2 text-xs text-slate-500 border-t border-[#2e2e45]">
                      + any of the 250+ exchanges at ccxt.com
                    </div>
                  </div>
                )}
              </div>

              {/* Display name */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Display Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Binance Main"
                  className="w-full h-10 px-3 rounded-lg bg-[#12121a] border border-[#2e2e45] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                  required
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">API Key</label>
                <input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="Paste your API key"
                  className="w-full h-10 px-3 rounded-lg bg-[#12121a] border border-[#2e2e45] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                  required
                />
              </div>

              {/* Secret Key */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Secret Key</label>
                <input
                  type="password"
                  value={form.secretKey}
                  onChange={(e) => setForm({ ...form, secretKey: e.target.value })}
                  placeholder="Paste your secret key"
                  className="w-full h-10 px-3 rounded-lg bg-[#12121a] border border-[#2e2e45] text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60"
                  required
                />
              </div>

              {/* Label / colour tag */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">Colour Tag (optional)</label>
                <div className="flex gap-2">
                  {LABEL_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, label: form.label === c.value ? "" : c.value })}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${form.label === c.value ? c.cls : "bg-[#12121a] text-slate-500 border-[#2e2e45] hover:text-white"}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.sandbox}
                    onChange={(e) => setForm({ ...form, sandbox: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                  <span className="text-sm text-slate-300">Sandbox / Testnet</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPrimary}
                    onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })}
                    className="w-4 h-4 rounded accent-amber-500"
                  />
                  <span className="text-sm text-slate-300">Set as Primary</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving…" : "Add Exchange"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl border border-[#2e2e45] text-slate-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exchange list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      ) : exchanges.length === 0 ? (
        <div className="bg-[#0d0d14] border border-dashed border-[#2e2e45] rounded-2xl p-12 text-center">
          <Globe className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No exchanges connected yet</p>
          <p className="text-slate-600 text-sm mt-1">Add at least one exchange to start trading. Add two for cross-exchange arbitrage.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Arbitrage hint */}
          {exchanges.filter((e) => e.isActive).length >= 2 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {exchanges.filter((e) => e.isActive).length} exchanges active — cross-exchange arbitrage is enabled
            </div>
          )}
          {exchanges.filter((e) => e.isActive).length === 1 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Add a second exchange to unlock cross-exchange arbitrage
            </div>
          )}

          {exchanges.map((ex) => (
            <div
              key={ex.id}
              className={`bg-[#0d0d14] border rounded-2xl p-5 flex items-center gap-4 transition-opacity ${!ex.isActive ? "opacity-50" : ""} ${ex.isPrimary ? "border-amber-500/40" : "border-[#2e2e45]"}`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold uppercase ${labelCls(ex.label)}`}>
                {ex.exchangeId.slice(0, 2)}
              </div>

              {/* Name + badges */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-sm">{ex.name}</span>
                  <span className="text-xs text-slate-500">{ex.exchangeId}</span>
                  {ex.isPrimary && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-medium">
                      Primary
                    </span>
                  )}
                  {ex.sandbox ? (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs">
                      <FlaskConical className="w-3 h-3" /> Testnet
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
                      <Globe className="w-3 h-3" /> Live
                    </span>
                  )}
                  {ex.label && (
                    <span className={`px-2 py-0.5 rounded-full border text-xs ${labelCls(ex.label)}`}>
                      {ex.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Added {new Date(ex.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Toggle active */}
                <button
                  onClick={() => patch(ex.id, { isActive: !ex.isActive })}
                  title={ex.isActive ? "Disable" : "Enable"}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e1e2e] transition-colors"
                >
                  {ex.isActive ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                </button>

                {/* Toggle primary */}
                <button
                  onClick={() => patch(ex.id, { isPrimary: true })}
                  title="Set as primary"
                  disabled={ex.isPrimary}
                  className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-[#1e1e2e] transition-colors disabled:opacity-30"
                >
                  {ex.isPrimary ? <Star className="w-5 h-5 text-amber-400" /> : <StarOff className="w-5 h-5" />}
                </button>

                {/* Toggle sandbox */}
                <button
                  onClick={() => patch(ex.id, { sandbox: !ex.sandbox })}
                  title={ex.sandbox ? "Switch to live" : "Switch to testnet"}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1e1e2e] transition-colors"
                >
                  {ex.sandbox
                    ? <FlaskConical className="w-4 h-4 text-blue-400" />
                    : <Globe className="w-4 h-4 text-green-400" />}
                </button>

                {/* Delete */}
                <button
                  onClick={() => remove(ex.id, ex.name)}
                  title="Remove exchange"
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Env var note */}
      <div className="bg-[#0d0d14] border border-[#2e2e45] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-white mb-2">Or configure via environment variables</h3>
        <p className="text-xs text-slate-500 mb-3">
          Add any number of exchanges by incrementing the index. DB entries take precedence over env vars.
        </p>
        <pre className="text-xs text-slate-400 bg-[#08080f] rounded-lg p-4 overflow-x-auto leading-relaxed">{`# Exchange 1
EXCHANGE_1_ID=binance
EXCHANGE_1_API_KEY=your_key
EXCHANGE_1_SECRET=your_secret
EXCHANGE_1_SANDBOX=true
EXCHANGE_1_PRIMARY=true

# Exchange 2
EXCHANGE_2_ID=bybit
EXCHANGE_2_API_KEY=your_key
EXCHANGE_2_SECRET=your_secret
EXCHANGE_2_SANDBOX=true

# Exchange 3 (any of 250+ CCXT exchanges)
EXCHANGE_3_ID=kraken
EXCHANGE_3_API_KEY=your_key
EXCHANGE_3_SECRET=your_secret
EXCHANGE_3_SANDBOX=false

# ... keep going: EXCHANGE_4_*, EXCHANGE_5_*, etc.`}</pre>
      </div>
    </div>
  )
}
