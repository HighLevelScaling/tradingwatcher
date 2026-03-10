import Stripe from "stripe"

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    })
  }
  return _stripe
}

// Named export for backwards-compat usage in route handlers
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    features: [
      "48-hour delayed data",
      "Congress trades (limited)",
      "2 alerts max",
      "10 watchlist items",
      "Public blog access",
    ],
  },
  PRO_MONTHLY: {
    name: "Pro",
    priceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
    price: 19,
    interval: "month",
    features: [
      "Live real-time data",
      "All congress trades",
      "All 13F institutional filings",
      "Notable trader tracking",
      "Unlimited alerts",
      "Unlimited watchlist",
      "Email notifications",
      "API access",
    ],
  },
  PRO_ANNUAL: {
    name: "Pro Annual",
    priceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
    price: 182,
    interval: "year",
    features: [
      "Everything in Pro Monthly",
      "2 months free (save $46)",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    price: 99,
    interval: "month",
    features: [
      "Everything in Pro",
      "5 team seats",
      "White-label reports",
      "Priority support",
      "Custom data exports",
      "Dedicated account manager",
    ],
  },
}
