"use client"
import { useSession, signOut } from "next-auth/react"
import { User, Mail, Shield, LogOut } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function AccountPage() {
  const { data: session } = useSession()

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-white mb-2">Account Settings</h1>
      <p className="text-slate-400 mb-8">Manage your profile and preferences</p>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-indigo-400" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt="Avatar" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold">
                {session?.user?.name?.[0] ?? "U"}
              </div>
            )}
            <div>
              <p className="text-white font-semibold">{session?.user?.name ?? "User"}</p>
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {session?.user?.email}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-indigo-400" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold capitalize">{session?.user?.tier?.toLowerCase() ?? "Free"} Plan</p>
            <p className="text-slate-400 text-sm">
              {session?.user?.tier === "PRO" ? "Full access enabled" : "Limited access"}
            </p>
          </div>
          <Link href="/account/billing">
            <Button variant="outline" size="sm">Manage</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
