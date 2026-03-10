import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      tier: string
      stripeCustomerId: string | null
    } & DefaultSession["user"]
  }
}
