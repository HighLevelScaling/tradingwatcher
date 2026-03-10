import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === "subscription") {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const userId = subscription.metadata.userId
        if (userId) {
          const item = subscription.items.data[0]
          await prisma.user.update({
            where: { id: userId },
            data: {
              tier: "PRO",
              stripeSubscriptionId: subscription.id,
              stripePriceId: item.price.id,
              stripeCurrentPeriodEnd: new Date(item.current_period_end * 1000),
            },
          })
        }
      }
      break
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata.userId
      if (userId) {
        const isActive = ["active", "trialing"].includes(subscription.status)
        const item = subscription.items.data[0]
        await prisma.user.update({
          where: { id: userId },
          data: {
            tier: isActive ? "PRO" : "FREE",
            stripeSubscriptionId: subscription.id,
            stripePriceId: item.price.id,
            stripeCurrentPeriodEnd: new Date(item.current_period_end * 1000),
          },
        })
      }
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata.userId
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            tier: "FREE",
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        })
      }
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      // Could send email here via Resend
      console.error("Payment failed for customer:", invoice.customer)
      break
    }
  }

  return NextResponse.json({ received: true })
}
