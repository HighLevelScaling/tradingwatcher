-- CreateEnum
CREATE TYPE "UserTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "TradeType" AS ENUM ('BUY', 'SELL', 'EXCHANGE');

-- CreateEnum
CREATE TYPE "Party" AS ENUM ('DEMOCRAT', 'REPUBLICAN', 'INDEPENDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Chamber" AS ENUM ('SENATE', 'HOUSE');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('QUIVERQUANT', 'EDGAR', 'CAPITOLTRADES', 'POLYGON', 'ALPHAVANTAGE', 'FINNHUB');

-- CreateEnum
CREATE TYPE "HoldingChange" AS ENUM ('NEW', 'INCREASED', 'DECREASED', 'UNCHANGED', 'EXITED');

-- CreateEnum
CREATE TYPE "PositionAction" AS ENUM ('OPENED', 'ADDED', 'REDUCED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('CONGRESS_TRADE', 'INSTITUTION_FILING', 'TRADER_POSITION', 'STOCK_ACTIVITY');

-- CreateEnum
CREATE TYPE "BlogCategory" AS ENUM ('ANALYSIS', 'EDUCATION', 'NEWS', 'STRATEGY', 'INSIDER_ACTIVITY');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "tier" "UserTier" NOT NULL DEFAULT 'FREE',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "politicians" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "party" "Party" NOT NULL,
    "chamber" "Chamber" NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "imageUrl" TEXT,
    "totalTrades" INTEGER NOT NULL DEFAULT 0,
    "avgReturnPct" DOUBLE PRECISION,
    "lastTradeDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "politicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "congress_trades" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "politicianId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "assetName" TEXT,
    "tradeType" "TradeType" NOT NULL,
    "amount" TEXT NOT NULL,
    "amountLow" DOUBLE PRECISION,
    "amountHigh" DOUBLE PRECISION,
    "tradeDate" TIMESTAMP(3) NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "priceAtTrade" DOUBLE PRECISION,
    "priceNow" DOUBLE PRECISION,
    "returnPct" DOUBLE PRECISION,
    "source" "DataSource" NOT NULL DEFAULT 'QUIVERQUANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "congress_trades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" TEXT NOT NULL,
    "cik" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aum" DOUBLE PRECISION,
    "filingCount" INTEGER NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "website" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filings_13f" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "accessionNumber" TEXT NOT NULL,
    "periodOfReport" TIMESTAMP(3) NOT NULL,
    "filedAt" TIMESTAMP(3) NOT NULL,
    "totalValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "filings_13f_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holdings_13f" (
    "id" TEXT NOT NULL,
    "filingId" TEXT NOT NULL,
    "ticker" TEXT,
    "cusip" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "putCall" TEXT,
    "changeType" "HoldingChange",
    "shareDiff" DOUBLE PRECISION,

    CONSTRAINT "holdings_13f_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notable_traders" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "knownFor" TEXT,
    "cik" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notable_traders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trader_positions" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "action" "PositionAction" NOT NULL,
    "shares" DOUBLE PRECISION,
    "value" DOUBLE PRECISION,
    "reportedDate" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trader_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stocks" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sector" TEXT,
    "industry" TEXT,
    "exchange" TEXT,
    "marketCap" DOUBLE PRECISION,
    "description" TEXT,
    "watcherCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_price_cache" (
    "id" TEXT NOT NULL,
    "stockId" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "open" DOUBLE PRECISION,
    "high" DOUBLE PRECISION,
    "low" DOUBLE PRECISION,
    "volume" BIGINT,
    "changePercent" DOUBLE PRECISION,
    "priceHistory" JSONB NOT NULL,
    "lastFetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_price_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT,
    "politicianId" TEXT,
    "institutionId" TEXT,
    "traderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "conditions" JSONB NOT NULL,
    "channels" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" TIMESTAMP(3),
    "fireCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverImage" TEXT,
    "author" TEXT NOT NULL DEFAULT 'TradingWatcher Team',
    "authorImage" TEXT,
    "category" "BlogCategory" NOT NULL,
    "tags" TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "readMinutes" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "interval" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL,
    "source" "DataSource" NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "recordsNew" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeSubscriptionId_key" ON "users"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "politicians_slug_key" ON "politicians"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "congress_trades_externalId_key" ON "congress_trades"("externalId");

-- CreateIndex
CREATE INDEX "congress_trades_ticker_idx" ON "congress_trades"("ticker");

-- CreateIndex
CREATE INDEX "congress_trades_politicianId_idx" ON "congress_trades"("politicianId");

-- CreateIndex
CREATE INDEX "congress_trades_tradeDate_idx" ON "congress_trades"("tradeDate");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_cik_key" ON "institutions"("cik");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_slug_key" ON "institutions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "filings_13f_accessionNumber_key" ON "filings_13f"("accessionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "notable_traders_slug_key" ON "notable_traders"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "stocks_ticker_key" ON "stocks"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "stock_price_cache_stockId_key" ON "stock_price_cache"("stockId");

-- CreateIndex
CREATE UNIQUE INDEX "watchlist_items_userId_ticker_key" ON "watchlist_items"("userId", "ticker");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_stripePriceId_key" ON "subscription_plans"("stripePriceId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "congress_trades" ADD CONSTRAINT "congress_trades_politicianId_fkey" FOREIGN KEY ("politicianId") REFERENCES "politicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filings_13f" ADD CONSTRAINT "filings_13f_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holdings_13f" ADD CONSTRAINT "holdings_13f_filingId_fkey" FOREIGN KEY ("filingId") REFERENCES "filings_13f"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trader_positions" ADD CONSTRAINT "trader_positions_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "notable_traders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_price_cache" ADD CONSTRAINT "stock_price_cache_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "stocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
