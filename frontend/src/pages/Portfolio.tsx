import { useState, useEffect } from "react"
import { db, auth } from "@/src/firebase"
import { collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { motion } from "framer-motion"
import { formatCurrency } from "@/src/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

// ── Pari-mutuel valuation helpers ──────────────────────────────────
// In a pari-mutuel system the total pool is distributed to the
// winning side.  Your claim is proportional to the AMOUNT you
// wagered on that side, NOT to inflated "shares".
//
//   payoutIfAWins = (myAmountA / poolA) × totalPool
//   payoutIfBWins = (myAmountB / poolB) × totalPool
//   expectedValue = probA × payoutIfA + probB × payoutIfB
//
// Edge cases handled:
//   • totalPool = 0   → value = invested (nothing has happened)
//   • poolX = 0       → payoutIfXWins = 0 (nobody bet that side)
//   • user on one side only → the other payout = 0
//   • full hedge (equal amounts, equal pools) → value = invested
// ───────────────────────────────────────────────────────────────────

interface AggregatedPosition {
  marketId: string
  amountA: number   // total tokens the user placed on side A
  amountB: number   // total tokens the user placed on side B
  totalInvested: number
}

function calcPariMutuelValue(
  pos: AggregatedPosition,
  poolA: number,
  poolB: number
) {
  const totalPool = poolA + poolB

  // ── No activity at all ────────────────────────────────
  if (totalPool === 0) {
    return {
      expectedValue: pos.totalInvested,
      payoutIfA: pos.amountA,
      payoutIfB: pos.amountB,
    }
  }

  // ── Payout under each outcome ─────────────────────────
  const payoutIfA = poolA > 0 ? pos.amountA * (totalPool / poolA) : 0
  const payoutIfB = poolB > 0 ? pos.amountB * (totalPool / poolB) : 0

  // ── Mark-to-Market expected value ───────────────
  const expectedValue = payoutIfA + payoutIfB

  return { expectedValue, payoutIfA, payoutIfB }
}

export function Portfolio() {
  const [bets, setBets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [lockedAmount, setLockedAmount] = useState(0)
  const [markets, setMarkets] = useState<Record<string, any>>({})
  const [currentValue, setCurrentValue] = useState(0)

  useEffect(() => {
    if (!auth.currentUser) return

    const userRef = doc(db, "users", auth.currentUser.uid)
    const unsubscribeUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setBalance(snap.data().balance)
    })

    const betsQuery = query(
      collection(db, "bets"),
      where("userId", "==", auth.currentUser.uid)
    )

    const unsubscribeBets = onSnapshot(betsQuery, async (snapshot) => {
      const betsData = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
      setBets(betsData)

      let totalLocked = 0
      let totalCV = 0
      const marketIds = [...new Set(betsData.map((b) => b.marketId))]
      const mktsData: Record<string, any> = {}

      for (const mId of marketIds) {
        const mDoc = await getDoc(doc(db, "markets", mId as string))
        if (!mDoc.exists()) continue
        const mData = { id: mDoc.id, ...(mDoc.data() as any) }
        mktsData[mId as string] = mData

        if (mData.status !== "open") continue

        // Aggregate this user's amounts per side for this market
        const mBets = betsData.filter((b) => b.marketId === mId)
        let amtA = 0,
          amtB = 0
        mBets.forEach((b) => {
          if (b.type === "A" || b.type === "yes") amtA += b.amount
          else amtB += b.amount
        })

        const invested = amtA + amtB
        totalLocked += invested

        const { expectedValue } = calcPariMutuelValue(
          { marketId: mId as string, amountA: amtA, amountB: amtB, totalInvested: invested },
          mData.poolA,
          mData.poolB
        )
        totalCV += expectedValue
      }

      setMarkets(mktsData)
      setLockedAmount(totalLocked)
      setCurrentValue(totalCV)
      setLoading(false)
    }, (err) => {
      console.warn("Bets query failed (index may be missing):", err.message)
      setBets([])
      setLoading(false)
    })

    return () => {
      unsubscribeUser()
      unsubscribeBets()
    }
  }, [])

  // ── Loading spinner ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-neon border-t-transparent shadow-[0_0_15px_rgba(0,229,255,0.5)]" />
      </div>
    )
  }

  // ── Summary numbers ────────────────────────────────────
  const totalValue = balance + currentValue
  const totalReturn = currentValue - lockedAmount
  const returnPercentage = lockedAmount === 0 ? 0 : (totalReturn / lockedAmount) * 100
  const returnIsPositive = totalReturn >= 0
  const returnIsZero = Math.abs(returnPercentage) < 0.01

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8 relative z-10">
      <motion.div 
        className="mb-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl font-bold tracking-tight text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon to-blue-500">Portfolio</span>
        </h1>
        <p className="text-slate-400 text-lg">Track your positions and performance.</p>
      </motion.div>

      {/* ── Top summary cards ───────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-3 mb-12">
        <Card className="glass-card bg-navy-800/60 border-white/5 relative overflow-hidden group hover:border-cyan-neon/30 hover:shadow-[0_8px_32px_rgba(0,229,255,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-2">Total Value</p>
            <div className="flex items-baseline gap-3">
              <h2 className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{formatCurrency(totalValue)}</h2>
              {!returnIsZero && (
                <Badge
                  variant="outline"
                  className={
                    returnIsPositive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 backdrop-blur-md shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                      : "bg-pink-500/10 text-pink-400 border-pink-500/20 backdrop-blur-md shadow-[0_0_10px_rgba(244,114,182,0.2)]"
                  }
                >
                  {returnIsPositive ? "+" : ""}
                  {returnPercentage.toFixed(2)}%
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card bg-navy-800/60 border-white/5 relative overflow-hidden group hover:border-purple-neon/30 hover:shadow-[0_8px_32px_rgba(188,19,254,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-2">Available Balance</p>
            <h2 className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{formatCurrency(balance)}</h2>
          </CardContent>
        </Card>

        <Card className="glass-card bg-navy-800/60 border-white/5 relative overflow-hidden group hover:border-blue-500/30 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardContent className="p-6 relative z-10">
            <p className="text-sm font-medium text-slate-400 mb-2">Invested Amount</p>
            <h2 className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{formatCurrency(lockedAmount)}</h2>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-bold text-white mb-6 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Active Positions</h2>

      {/* ── Position cards ──────────────────────────────── */}
      <div className="space-y-4">
        {(() => {
          // 1. Filter to bets on open markets
          const openBets = bets.filter((b) => markets[b.marketId]?.status === "open")
          if (openBets.length === 0) {
            return (
              <div className="p-12 text-center glass-panel bg-navy-800/40 border-white/5">
                <p className="text-slate-400 text-lg">No active positions found.</p>
              </div>
            )
          }

          // 2. Group bets by market, summing AMOUNTS (not shares)
          const grouped: Record<string, AggregatedPosition> = {}
          openBets.forEach((bet) => {
            const mId = bet.marketId
            if (!grouped[mId]) {
              grouped[mId] = { marketId: mId, amountA: 0, amountB: 0, totalInvested: 0 }
            }
            grouped[mId].totalInvested += bet.amount
            if (bet.type === "A" || bet.type === "yes") grouped[mId].amountA += bet.amount
            else grouped[mId].amountB += bet.amount
          })

          return Object.values(grouped)
            .sort((a, b) => b.totalInvested - a.totalInvested)
            .map((pos) => {
              const market = markets[pos.marketId]
              if (!market) return null

              const totalPool = market.poolA + market.poolB
              const { expectedValue, payoutIfA, payoutIfB } = calcPariMutuelValue(
                pos,
                market.poolA,
                market.poolB
              )

              const posReturn = expectedValue - pos.totalInvested
              const posReturnPct = pos.totalInvested > 0 ? (posReturn / pos.totalInvested) * 100 : 0
              const isPositive = posReturn >= 0
              const isFlat = Math.abs(posReturnPct) < 0.01

              return (
                <Card
                  key={pos.marketId}
                  className="glass-card bg-navy-800/60 border-white/5 overflow-hidden group hover:border-cyan-neon/20"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-neon/0 via-cyan-neon/5 to-purple-neon/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <CardContent className="p-6 flex flex-col gap-5 relative z-10">
                    {/* Row 1 – title + badges */}
                    <div className="space-y-3 flex-1">
                      <h3 className="font-semibold text-white text-xl leading-tight group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-neon group-hover:to-purple-neon transition-all duration-300">
                        {market.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="bg-navy-700/50 text-slate-300 hover:bg-navy-600/50 border border-white/5 backdrop-blur-md">
                          {market.category || "GENERAL"}
                        </Badge>
                        {pos.amountA > 0 && (
                          <Badge variant="outline" className="bg-cyan-neon/10 text-cyan-neon border-cyan-neon/20 backdrop-blur-md shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                            {(market.optionA || "Yes").toUpperCase()}
                            <span className="ml-1 opacity-70 text-[10px]">({formatCurrency(pos.amountA)})</span>
                          </Badge>
                        )}
                        {pos.amountB > 0 && (
                          <Badge variant="outline" className="bg-purple-neon/10 text-purple-neon border-purple-neon/20 backdrop-blur-md shadow-[0_0_10px_rgba(188,19,254,0.2)]">
                            {(market.optionB || "No").toUpperCase()}
                            <span className="ml-1 opacity-70 text-[10px]">({formatCurrency(pos.amountB)})</span>
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Row 2 – numbers grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 glass-panel bg-navy-900/50 p-4 border-white/5">
                      <div>
                        <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Invested</p>
                        <p className="font-bold text-white font-mono text-lg">{formatCurrency(pos.totalInvested)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-semibold">Expected Value</p>
                        <p className="font-bold text-white font-mono text-lg">{formatCurrency(expectedValue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-cyan-neon/70 mb-1 uppercase tracking-wider font-semibold">
                          If {market.optionA || "A"} wins
                        </p>
                        <p className="font-bold text-cyan-neon font-mono text-lg">{formatCurrency(payoutIfA)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-purple-neon/70 mb-1 uppercase tracking-wider font-semibold">
                          If {market.optionB || "B"} wins
                        </p>
                        <p className="font-bold text-purple-neon font-mono text-lg">{formatCurrency(payoutIfB)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
        })()}
      </div>

      {/* ── Closed Positions ──────────────────────────── */}
      <h2 className="text-2xl font-bold text-white mb-6 mt-12 drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Closed Positions</h2>
      <div className="space-y-4">
        {(() => {
          const closedBets = bets.filter((b) => markets[b.marketId]?.status === "resolved")
          if (closedBets.length === 0) {
            return (
              <div className="p-12 text-center glass-panel bg-navy-800/40 border-white/5">
                <p className="text-slate-400 text-lg">No closed positions yet.</p>
              </div>
            )
          }

          // Group by market, summing amounts per side
          const grouped: Record<string, { marketId: string; amountA: number; amountB: number; totalInvested: number }> = {}
          closedBets.forEach((bet) => {
            const mId = bet.marketId
            if (!grouped[mId]) grouped[mId] = { marketId: mId, amountA: 0, amountB: 0, totalInvested: 0 }
            grouped[mId].totalInvested += bet.amount
            if (bet.type === "A" || bet.type === "yes") grouped[mId].amountA += bet.amount
            else grouped[mId].amountB += bet.amount
          })

          return Object.values(grouped).map((pos) => {
            const market = markets[pos.marketId]
            if (!market) return null

            const totalPool = market.poolA + market.poolB
            const winner = market.outcome // "A" or "B"
            const winnerName = winner === "A" ? (market.optionA || "A") : (market.optionB || "B")
            const winningPool = winner === "A" ? market.poolA : market.poolB
            const userAmtOnWinner = winner === "A" ? pos.amountA : pos.amountB

            // Pari-mutuel payout
            let payout = 0
            if (winningPool > 0 && totalPool > 0 && userAmtOnWinner > 0) {
              payout = Math.round((userAmtOnWinner / winningPool) * totalPool)
            }

            const pnl = payout - pos.totalInvested
            const pnlPct = pos.totalInvested > 0 ? (pnl / pos.totalInvested) * 100 : 0
            const isProfit = pnl >= 0

            return (
              <Card
                key={pos.marketId}
                className="glass-card bg-navy-800/40 border-white/5 overflow-hidden grayscale-[40%] opacity-80"
              >
                <CardContent className="p-6 flex flex-col gap-5 relative z-10">
                  {/* Title + winner badge */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-300 text-xl leading-tight">{market.title}</h3>
                      <Badge className="bg-white/10 text-white border-white/20 text-[10px] uppercase tracking-wider">
                        Settled
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="bg-navy-700/50 text-slate-400 border border-white/5">
                        {market.category || "GENERAL"}
                      </Badge>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs">
                        🏆 Winner: {winnerName}
                      </Badge>
                      {pos.amountA > 0 && (
                        <Badge variant="outline" className={`border-white/10 text-slate-400 ${winner === "A" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          {(market.optionA || "A").toUpperCase()} ({formatCurrency(pos.amountA)})
                        </Badge>
                      )}
                      {pos.amountB > 0 && (
                        <Badge variant="outline" className={`border-white/10 text-slate-400 ${winner === "B" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                          {(market.optionB || "B").toUpperCase()} ({formatCurrency(pos.amountB)})
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Numbers */}
                  <div className="grid grid-cols-3 gap-4 glass-panel bg-navy-900/50 p-4 border-white/5">
                    <div>
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">Invested</p>
                      <p className="font-bold text-slate-300 font-mono text-lg">{formatCurrency(pos.totalInvested)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">Payout</p>
                      <p className="font-bold text-slate-300 font-mono text-lg">{formatCurrency(payout)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider font-semibold">P&L</p>
                      <div className={`flex items-center gap-1 font-bold font-mono text-lg ${isProfit ? "text-emerald-400" : "text-red-400"}`}>
                        {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                        {isProfit ? "+" : ""}{formatCurrency(Math.abs(pnl))} ({pnlPct >= 0 ? "+" : ""}{pnlPct.toFixed(1)}%)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        })()}
      </div>
    </div>
  )
}
