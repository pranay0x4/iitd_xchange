import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { db, auth } from "@/src/firebase"
import { doc, collection, query, where, onSnapshot, runTransaction, writeBatch, getDocs, increment } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Badge } from "@/src/components/ui/badge"
import { isAdminEmail } from "@/src/config/env"
import { formatCurrency } from "@/src/lib/utils"
import { motion } from "framer-motion"
import { Users, Coins, Clock, Lock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from "date-fns"
import { Edit, X } from "lucide-react"

export function MarketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [market, setMarket] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [betAmount, setBetAmount] = useState("")
  const [betType, setBetType] = useState<"A" | "B">("A")
  const [submitting, setSubmitting] = useState(false)
  const [userBalance, setUserBalance] = useState(0)
  const [oddsHistory, setOddsHistory] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  // Admin Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  const isAdmin = isAdminEmail(auth.currentUser?.email)

  useEffect(() => {
    if (!id) return

    const marketRef = doc(db, "markets", id)
    const unsubscribeMarket = onSnapshot(marketRef, (doc) => {
      if (doc.exists()) {
        setMarket({ id: doc.id, ...doc.data() })
      } else {
        navigate("/")
      }
      setLoading(false)
    }, (err) => {
      console.error("Market snapshot error:", err)
      setError("Failed to load market data.")
      setLoading(false)
    })

    let unsubscribeOdds = () => { }
    try {
      const oddsQuery = query(collection(db, "odds_history"), where("marketId", "==", id))
      unsubscribeOdds = onSnapshot(oddsQuery, (snapshot) => {
        const history = snapshot.docs.map(doc => {
          const data = doc.data()
          const ts = data.timestamp
          return {
            rawTime: new Date(ts).getTime(),
            time: format(new Date(ts), "MMM d, HH:mm"),
            A: data.oddsA,
            B: data.oddsB
          }
        }).sort((a, b) => a.rawTime - b.rawTime)
        setOddsHistory(history)
      }, (error) => {
        console.warn("Odds history query failed:", error.message)
        setOddsHistory([])
      })
    } catch (error) {
      console.warn("Odds history query setup failed:", error)
    }

    if (auth.currentUser) {
      const userRef = doc(db, "users", auth.currentUser.uid)
      onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          setUserBalance(doc.data().balance)
        }
      })
    }

    return () => {
      unsubscribeMarket()
      unsubscribeOdds()
    }
  }, [id, navigate])

  const handleBet = async () => {
    if (market.endDate && new Date() > new Date(market.endDate)) {
      alert("Market closed")
      return
    }

    if (!auth.currentUser || !market || !betAmount || isNaN(Number(betAmount)) || Number(betAmount) <= 0) return

    const amount = Number(betAmount)
    
    if (!Number.isInteger(amount)) {
      alert("Please invest a whole number of tokens (no decimals).")
      return
    }

    if (amount < 500) {
      alert("Minimum investment is 500 tokens.")
      return
    }
    
    if (amount > userBalance) {
      alert("Insufficient balance")
      return
    }

    setSubmitting(true)
    try {


      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, "users", auth.currentUser!.uid)
        const marketRef = doc(db, "markets", market.id)
        const betRef = doc(collection(db, "bets"))
        const oddsHistoryRef = doc(collection(db, "odds_history"))

        const userDoc = await transaction.get(userRef)
        const marketDoc = await transaction.get(marketRef)

        if (!userDoc.exists() || !marketDoc.exists()) throw new Error("Document does not exist")

        const currentBalance = userDoc.data().balance
        if (currentBalance < amount) throw new Error("Insufficient balance")

        const mData = marketDoc.data()
        const newPoolA = betType === "A" ? mData.poolA + amount : mData.poolA
        const newPoolB = betType === "B" ? mData.poolB + amount : mData.poolB
        const newTotalPool = newPoolA + newPoolB

        // Calculate shares (simplified AMM logic: shares = amount / current_price)
        // Current price = pool / totalPool
        const currentTotalPool = mData.poolB + mData.poolA
        let price = 1.0 // Default if pool is 0 to ensure 1.00x payout for first bet
        if (currentTotalPool > 0) {
          price = betType === "A" ? mData.poolA / currentTotalPool : mData.poolB / currentTotalPool
        }
        // Prevent division by zero or extremely small prices. Max 1.0 for 1.00x payout limit.
        price = Math.max(0.01, Math.min(1.0, price))
        const shares = amount / price

        transaction.update(userRef, { balance: currentBalance - amount })

        transaction.update(marketRef, {
          poolA: newPoolA,
          poolB: newPoolB,
          totalPredictors: mData.totalPredictors + 1 // Simplified, should check unique users
        })

        transaction.set(betRef, {
          marketId: market.id,
          userId: auth.currentUser!.uid,
          type: betType,
          amount: amount,
          shares: shares,
          timestamp: new Date().toISOString()
        })

        // Record new odds
        const newoddsA = Math.round((newPoolA / newTotalPool) * 100)
        const newoddsB = 100 - newoddsA

        transaction.set(oddsHistoryRef, {
          marketId: market.id,
          oddsA: newoddsA,
          oddsB: newoddsB,
          timestamp: new Date().toISOString()
        })
      })

      setBetAmount("")
    } catch (error) {
      console.error("Transaction failed: ", error)
      alert("Failed to place bet. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async (winner: "A" | "B") => {
    if (!auth.currentUser) return
    if (!window.confirm(`Are you sure you want to resolve this market? ${winner === 'A' ? market.optionA : market.optionB} will be declared the winner.`)) return

    setSubmitting(true)
    try {
      const batch = writeBatch(db)

      // 1. Mark market as resolved
      const marketRef = doc(db, "markets", market.id)
      batch.update(marketRef, {
        status: "resolved",
        outcome: winner
      })

      // 2. Fetch all bets for this market
      const betsQuery = query(collection(db, "bets"), where("marketId", "==", market.id))
      const betsSnap = await getDocs(betsQuery)

      // 3. Calculate the total pool and the winning side's pool
      const totalPool = market.poolA + market.poolB
      const winningPool = winner === "A" ? market.poolA : market.poolB

      if (totalPool <= 0 || winningPool <= 0) {
        alert("Cannot resolve: pool is empty or no bets on the winning side.")
        setSubmitting(false)
        return
      }

      // 4. Group AMOUNTS bet on the winning side by user
      //    Pari-mutuel payout = (userAmountOnWinningSide / winningPool) × totalPool
      const userWinningAmounts: Record<string, number> = {}
      betsSnap.docs.forEach(docSnap => {
        const bet = docSnap.data()
        if (bet.type === winner) {
          userWinningAmounts[bet.userId] = (userWinningAmounts[bet.userId] || 0) + bet.amount
        }
      })

      // 5. Calculate and distribute payouts
      for (const [userId, userAmt] of Object.entries(userWinningAmounts)) {
        const payout = Math.round((userAmt / winningPool) * totalPool)
        const userRef = doc(db, "users", userId)
        batch.update(userRef, { balance: increment(payout) })
      }

      await batch.commit()
      alert(`Market resolved! Total pool of ${totalPool} distributed to ${winner === 'A' ? market.optionA : market.optionB} holders.`)
    } catch (err) {
      console.error("Failed to resolve market:", err)
      alert("Error settling market.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUndoResolve = async () => {
    if (!auth.currentUser || market.status !== "resolved") return
    if (!window.confirm("Are you sure you want to REVERSE this settlement? This will deduct the previously awarded winnings from users' balances and reopen the market.")) return

    setSubmitting(true)
    try {
      const batch = writeBatch(db)

      // 1. We need to recalculate the EXACT same payouts that were given
      //    using the same pari-mutuel formula so the reversal is precise
      const totalPool = market.poolA + market.poolB
      const winningPool = market.outcome === "A" ? market.poolA : market.poolB

      // 2. Fetch all bets
      const betsQuery = query(collection(db, "bets"), where("marketId", "==", market.id))
      const betsSnap = await getDocs(betsQuery)

      // 3. Group the winning amounts by user (same logic as resolve)
      const userWinningAmounts: Record<string, number> = {}
      betsSnap.docs.forEach(docSnap => {
        const bet = docSnap.data()
        if (bet.type === market.outcome) {
          userWinningAmounts[bet.userId] = (userWinningAmounts[bet.userId] || 0) + bet.amount
        }
      })

      // 4. Deduct the exact same payouts
      for (const [userId, userAmt] of Object.entries(userWinningAmounts)) {
        const payout = Math.round((userAmt / winningPool) * totalPool)
        const userRef = doc(db, "users", userId)
        batch.update(userRef, { balance: increment(-payout) })
      }

      // 5. Mark market as open again
      const marketRef = doc(db, "markets", market.id)
      batch.update(marketRef, {
        status: "open",
        outcome: "none"
      })

      await batch.commit()
      alert("Resolution reversed! Winnings have been deducted and the market is open again.")
    } catch (err) {
      console.error("Failed to undo settle:", err)
      alert("Error undoing settlement.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditMarket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin || !market) return
    setSubmitting(true)
    try {
      const marketRef = doc(db, "markets", market.id)
      await writeBatch(db).update(marketRef, {
        title: editForm.title,
        description: editForm.description,
        category: editForm.category,
        optionA: editForm.optionA,
        optionB: editForm.optionB,
        imageUrl: editForm.imageUrl || "",
        order: Number(editForm.order) || 0,
        endDate: new Date(editForm.endDate).toISOString(),
        status: editForm.status
      }).commit()
      setShowEditModal(false)
    } catch (err) {
      console.error("Failed to update market:", err)
      alert("Failed to update market")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMarket = async () => {
    if (!isAdmin || !market) return
    if (!window.confirm(`Are you absolutely sure you want to DELETE "${market.title}"? All bets will be refunded. This cannot be undone.`)) return

    setSubmitting(true)
    try {
      const batch = writeBatch(db)

      // 1. Fetch all bets for this market
      const betsQuery = query(collection(db, "bets"), where("marketId", "==", market.id))
      const betsSnap = await getDocs(betsQuery)

      // 2. Group refunds by user
      const userRefunds: Record<string, number> = {}
      betsSnap.docs.forEach(betDoc => {
        const bet = betDoc.data()
        userRefunds[bet.userId] = (userRefunds[bet.userId] || 0) + bet.amount
        // 3. Delete each bet document
        batch.delete(betDoc.ref)
      })

      // 4. Credit refunds back to each user's balance
      for (const [userId, refund] of Object.entries(userRefunds)) {
        const userRef = doc(db, "users", userId)
        batch.update(userRef, { balance: increment(refund) })
      }

      // 5. Delete the market document itself
      batch.delete(doc(db, "markets", market.id))

      await batch.commit()
      navigate("/")
    } catch (err) {
      console.error("Failed to delete market:", err)
      alert("Failed to delete market")
      setSubmitting(false)
    }
  }

  const openEditModal = () => {
    let formattedDate = ""
    if (market.endDate) {
      // Need format YYYY-MM-DDThh:mm for datetime-local
      const d = new Date(market.endDate)
      if (!isNaN(d.getTime())) {
        formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      }
    }
    setEditForm({
      ...market,
      endDate: formattedDate,
      imageUrl: market.imageUrl || "",
      order: market.order || 0
    })
    setShowEditModal(true)
  }

  if (loading || !market) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-neon border-t-transparent shadow-[0_0_15px_rgba(0,229,255,0.5)]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-red-400 text-center">
          <p className="text-lg font-semibold mb-2">Something went wrong</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    )
  }

  const totalPool = market.poolA + market.poolB
  const probA = totalPool === 0 ? 0 : Math.round((market.poolA / totalPool) * 100)
  const probB = totalPool === 0 ? 0 : 100 - probA

  const endDate = market.endDate ? new Date(market.endDate) : null
  const isClosed = endDate ? new Date() > endDate : false

  const priceA = (probA / 10).toFixed(1)
  const priceB = (probB / 10).toFixed(1)

  // Calculate implied odds (1 to 100x)
  const oddsA = totalPool === 0 ? "1.00" : probA === 0 ? "0.00" : (1 / (probA / 100)).toFixed(2)
  const oddsB = totalPool === 0 ? "1.00" : probB === 0 ? "0.00" : (1 / (probB / 100)).toFixed(2)

  // Calculate potential payout based on current odds
  let currentPrice = betType === "A" ? probA / 100 : probB / 100
  if (totalPool === 0) currentPrice = 1.0 // First bet gets 1.0x payout
  const safePrice = Math.max(0.01, Math.min(1.0, currentPrice))
  const potentialShares = Number(betAmount) > 0 ? Number(betAmount) / safePrice : 0
  const potentialPayout = potentialShares // 1 share = 1 token if correct

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div 
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
          <Badge variant="outline" className="glass-panel bg-navy-800/40 text-slate-300 border-white/5 uppercase tracking-wider text-[10px] font-bold">
            {market.category}
          </Badge>
          {isClosed && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
              CLOSED
            </Badge>
          )}
          <span>•</span>
          <Clock className="h-4 w-4" />
          <span>Ends {endDate && !isNaN(endDate.getTime()) ? format(endDate, "dd MMM yyyy • h:mm a") : "TBD"}</span>
        </div>

        <div className="flex justify-between items-start gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl leading-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {market.title}
          </h1>
          {isAdmin && (
            <button
              onClick={openEditModal}
              className="group flex-shrink-0 flex items-center gap-2 bg-gradient-to-r from-cyan-neon to-blue-500 hover:from-cyan-neon/80 hover:to-blue-500/80 text-navy-900 font-bold px-4 py-2 rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.4)] transition-all font-sans text-sm"
            >
              <Edit className="h-4 w-4" /> Edit Market
            </button>
          )}
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">

          <div>
            <h3 className="text-slate-400 font-medium mb-4">Current Odds</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card bg-cyan-neon/10 border border-cyan-neon/30 rounded-xl py-6 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-neon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="text-cyan-neon font-bold text-lg mb-1 z-10 drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">{market.optionA}</span>
                <div className="flex flex-col items-center">
                  <span className="text-white font-bold text-3xl">{oddsA}x</span>
                  <span className="text-xs text-slate-400">{probA}%</span>
                </div>
              </div>
              <div className="glass-card bg-purple-neon/10 border border-purple-neon/30 rounded-xl py-6 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(188,19,254,0.15)] relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-t from-purple-neon/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="text-purple-neon font-bold text-lg mb-1 z-10 drop-shadow-[0_0_8px_rgba(188,19,254,0.5)]">{market.optionB}</span>
                <div className="flex flex-col items-center">
                  <span className="text-white font-bold text-3xl">{oddsB}x</span>
                  <span className="text-xs text-slate-400">{probB}%</span>
                </div>
              </div>
            </div>
          </div>

          <Card className="glass-card bg-navy-800/60 border-white/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white">Odds History</CardTitle>
                <span className="text-xs text-slate-400 font-mono">All Time (Hourly)</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                {oddsHistory.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={oddsHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#BC13FE" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#BC13FE" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#ffffff40"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                        minTickGap={40}
                      />
                      <YAxis
                        stroke="#ffffff40"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 100]}
                        tickFormatter={(val) => `${val}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(6,9,15,0.9)',
                          backdropFilter: 'blur(12px)',
                          borderColor: 'rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          padding: '10px 14px'
                        }}
                        formatter={(value: number, name: string) => [
                          `${value}%`,
                          name === 'A' ? (market?.optionA || 'Option A') : (market?.optionB || 'Option B')
                        ]}
                        labelStyle={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="A"
                        name="A"
                        stroke="#00E5FF"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorA)"
                        dot={false}
                        activeDot={{ r: 4, stroke: '#00E5FF', strokeWidth: 2, fill: '#060a0f' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="B"
                        name="B"
                        stroke="#BC13FE"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorB)"
                        dot={false}
                        activeDot={{ r: 4, stroke: '#BC13FE', strokeWidth: 2, fill: '#060a0f' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    Not enough data for chart — place a bet to start tracking odds.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="glass-card bg-navy-800/60 border-white/5 sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-white">Place Trade</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${betType === 'A' ? 'bg-cyan-neon/20 text-cyan-neon border border-cyan-neon/50 shadow-[0_0_15px_rgba(0,229,255,0.3)]' : 'glass-panel bg-navy-900/50 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'}`}
                  onClick={() => setBetType('A')}
                >
                  {market.optionA}
                </button>
                <button
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${betType === 'B' ? 'bg-purple-neon/20 text-purple-neon border border-purple-neon/50 shadow-[0_0_15px_rgba(188,19,254,0.3)]' : 'glass-panel bg-navy-900/50 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'}`}
                  onClick={() => setBetType('B')}
                >
                  {market.optionB}
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Amount</span>
                  <span>Balance: {formatCurrency(userBalance)}</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 font-bold text-slate-400">&</span>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="pl-8 h-12 glass-panel bg-navy-900/50 border-white/5 text-lg font-bold focus-visible:ring-cyan-neon text-white"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    max={userBalance}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-400">Estimated Return</span>
                  <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon to-purple-neon drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">{formatCurrency(potentialPayout)}</span>
                </div>
              </div>

              <Button
                className={`w-full h-12 text-base font-bold tracking-wide transition-all ${betType === 'A' ? 'bg-gradient-to-r from-cyan-neon to-blue-500 hover:from-cyan-neon/80 hover:to-blue-500/80 text-navy-900 shadow-[0_0_20px_rgba(0,229,255,0.4)]' : 'bg-gradient-to-r from-purple-neon to-pink-500 hover:from-purple-neon/80 hover:to-pink-500/80 text-white shadow-[0_0_20px_rgba(188,19,254,0.4)]'}`}
                onClick={handleBet}
                disabled={isClosed || submitting || !betAmount || Number(betAmount) <= 0 || Number(betAmount) > userBalance || market.status !== 'open'}
              >
                {submitting ? "PROCESSING..." : "Confirm Trade"}
              </Button>
            </CardContent>
          </Card>

          {/* Admin Market Settlement Panel */}
          {isAdmin && market.status === "open" && (
            <Card className="glass-card bg-navy-800/80 border-red-500/30">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-red-400 text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
                  <Lock className="h-3 w-3" /> Admin: Resolve Market
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Declaring a winner will distribute winnings to users who bet correctly and lock the market from further trading.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-cyan-neon/10 hover:bg-cyan-neon/20 text-cyan-neon border border-cyan-neon/30 text-xs py-5"
                    onClick={() => handleResolve("A")}
                    disabled={submitting}
                  >
                    Set {market.optionA} as Winner
                  </Button>
                  <Button
                    className="w-full bg-purple-neon/10 hover:bg-purple-neon/20 text-purple-neon border border-purple-neon/30 text-xs py-5"
                    onClick={() => handleResolve("B")}
                    disabled={submitting}
                  >
                    Set {market.optionB} as Winner
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isAdmin && market.status === "resolved" && (
            <Card className="glass-card bg-navy-800/80 border-orange-500/30">
              <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-orange-400 text-sm font-bold flex items-center gap-2 uppercase tracking-wide">
                  <Lock className="h-3 w-3" /> Admin: Undo Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-slate-400 leading-relaxed">
                  Reversing the resolution will reopen the market and deduct the previously awarded winnings from all winners.
                </p>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs py-5"
                    onClick={handleUndoResolve}
                    disabled={submitting}
                  >
                    Undo Settlement & Reopen Market
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit Market Modal (Admin Only) */}
          {showEditModal && isAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md glass-card bg-navy-800 border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center p-5 border-b border-white/5 sticky top-0 bg-navy-800/95 backdrop-blur z-10">
                  <h2 className="text-xl font-bold text-white">Edit Market</h2>
                  <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleEditMarket} className="p-5 space-y-4 font-sans text-left">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Title</label>
                    <input required type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                      value={editForm.title || ""} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                    <textarea required rows={2} className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                      value={editForm.description || ""} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
                      <input required type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                        value={editForm.category || ""} onChange={e => setEditForm({ ...editForm, category: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
                      <select required className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                        value={editForm.status || "open"} onChange={e => setEditForm({ ...editForm, status: e.target.value })}>
                        <option value="open">Open</option>
                        <option value="closed">Closed (Manual)</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">End Date & Time</label>
                    <input required type="datetime-local" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                      value={editForm.endDate || ""} onChange={e => setEditForm({ ...editForm, endDate: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Option A (Yes)</label>
                      <input required type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                        value={editForm.optionA || ""} onChange={e => setEditForm({ ...editForm, optionA: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Option B (No)</label>
                      <input required type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                        value={editForm.optionB || ""} onChange={e => setEditForm({ ...editForm, optionB: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Image URL (Optional)</label>
                      <input type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                        value={editForm.imageUrl || ""} onChange={e => setEditForm({ ...editForm, imageUrl: e.target.value })} placeholder="https://..." />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Sort Order</label>
                      <input required type="number" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                        value={editForm.order || 0} onChange={e => setEditForm({ ...editForm, order: Number(e.target.value) })} />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-white/5 mt-6">
                    <button 
                      type="button"
                      onClick={handleDeleteMarket}
                      disabled={submitting}
                      className="w-1/3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-3 rounded-xl disabled:opacity-50 transition-all font-sans text-xs uppercase tracking-wider"
                    >
                      Delete
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-2/3 bg-gradient-to-r from-cyan-neon to-blue-500 hover:from-cyan-neon/80 hover:to-blue-500/80 text-navy-900 font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.4)] disabled:opacity-50 transition-all font-sans"
                    >
                      {submitting ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
