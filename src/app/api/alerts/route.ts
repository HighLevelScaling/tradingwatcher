import { NextRequest, NextResponse } from "next/server"
export async function GET() { return NextResponse.json({ alerts: [] }) }
export async function POST(request: NextRequest) {
  const body = await request.json()
  return NextResponse.json({ success: true, alert: { ...body, id: crypto.randomUUID() } })
}
