/**
 * One-time migration script to encrypt existing plaintext exchange credentials.
 * Run with: npx tsx scripts/encrypt-existing-keys.ts
 *
 * Requires ENCRYPTION_KEY and DATABASE_URL in environment.
 */
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { encrypt, isEncrypted } from '../src/lib/crypto'

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaClient

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exchanges = await (prisma as any).tradingExchange.findMany()

  let updated = 0
  let skipped = 0

  for (const exchange of exchanges) {
    const needsApiKey = !isEncrypted(exchange.apiKey)
    const needsSecret = !isEncrypted(exchange.secretKey)

    if (!needsApiKey && !needsSecret) {
      skipped++
      console.log(`  SKIP  ${exchange.name} (${exchange.exchangeId}) — already encrypted`)
      continue
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).tradingExchange.update({
      where: { id: exchange.id },
      data: {
        apiKey: needsApiKey ? encrypt(exchange.apiKey) : exchange.apiKey,
        secretKey: needsSecret ? encrypt(exchange.secretKey) : exchange.secretKey,
      },
    })

    updated++
    console.log(`  DONE  ${exchange.name} (${exchange.exchangeId}) — encrypted`)
  }

  console.log(`\nFinished: ${updated} updated, ${skipped} already encrypted, ${exchanges.length} total`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
