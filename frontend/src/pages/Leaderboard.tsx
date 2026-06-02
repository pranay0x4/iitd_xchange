import { useState, useEffect } from "react"
import { db, auth } from "@/src/firebase"
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, getCountFromServer, where } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { formatCurrency } from "@/src/lib/utils"
import { motion } from "framer-motion"
import { Trophy, Medal, Edit2, Check, X, User } from "lucide-react"

export function Leaderboard() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)

  useEffect(() => {
    let usersData: any[] = []
    let marketsData: any[] = []
    let betsData: any[] = []

    let uLoaded = false, mLoaded = false, bLoaded = false

    const processLeaderboard = () => {
      if (!uLoaded || !mLoaded || !bLoaded) return

      const openMarkets = marketsData.filter(m => m.status === 'open')

      const computedUsers = usersData.map(user => {
        let totalValue = user.balance || 0
        const userBets = betsData.filter(b => b.userId === user.id)

        openMarkets.forEach(market => {
          const mBets = userBets.filter(b => b.marketId === market.id)
          if (mBets.length === 0) return

          let amtA = 0, amtB = 0
          mBets.forEach(b => {
            if (b.type === "A" || b.type === "yes") amtA += b.amount
            else amtB += b.amount
          })

          const invested = amtA + amtB
          const totalPool = (market.poolA || 0) + (market.poolB || 0)

          if (invested > 0 && totalPool > 0) {
            let valueA = 0, valueB = 0
            if (amtA > 0 && market.poolA > 0) valueA = amtA * (totalPool / market.poolA)
            if (amtB > 0 && market.poolB > 0) valueB = amtB * (totalPool / market.poolB)

            totalValue += valueA + valueB
          } else if (invested > 0 && totalPool === 0) {
            totalValue += invested
          }
        })

        return { ...user, totalValue }
      })

      // Sort by totalValue descending
      computedUsers.sort((a, b) => b.totalValue - a.totalValue)

      setUsers(computedUsers.slice(0, 10))

      if (auth.currentUser) {
        const currentIdx = computedUsers.findIndex(u => u.id === auth.currentUser!.uid)
        if (currentIdx !== -1) {
          setCurrentUser(computedUsers[currentIdx])
          setNewUsername(computedUsers[currentIdx].username || "")
          setCurrentUserRank(currentIdx + 1)
        }
      }

      setLoading(false)
    }

    const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
      usersData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      uLoaded = true
      processLeaderboard()
    })

    const unsubMarkets = onSnapshot(collection(db, "markets"), (snap) => {
      marketsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      mLoaded = true
      processLeaderboard()
    })

    const unsubBets = onSnapshot(collection(db, "bets"), (snap) => {
      betsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      bLoaded = true
      processLeaderboard()
    })

    return () => {
      unsubUsers()
      unsubMarkets()
      unsubBets()
    }
  }, [])

  const handleUpdateUsername = async () => {
    if (!auth.currentUser || !currentUser || currentUser.usernameEdited) return
    if (!newUsername.trim() || newUsername.length > 30) {
      alert("Username must be between 1 and 30 characters.")
      return
    }

    try {
      const userRef = doc(db, "users", auth.currentUser.uid)
      await updateDoc(userRef, {
        username: newUsername.trim(),
        usernameEdited: true
      })
      setEditingUsername(false)
      setCurrentUser({ ...currentUser, username: newUsername.trim(), usernameEdited: true })
    } catch (error) {
      console.error("Error updating username:", error)
      alert("Failed to update username.")
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-neon border-t-transparent shadow-[0_0_15px_rgba(0,229,255,0.5)]"></div>
      </div>
    )
  }

  const top3 = users.slice(0, 3)
  const restUsers = users.slice(3, 10) // Positions 4–10

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-4 mb-2">
          <span className="text-[10px] font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon to-purple-neon uppercase drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">Prediction Arena</span>
          <div className="h-[1px] w-12 bg-gradient-to-r from-cyan-neon/50 to-transparent"></div>
        </div>
        <div className="flex flex-col gap-4">
          <p className="text-slate-400 max-w-md text-sm leading-relaxed">
            The top predictors @ IITD Xchange.
          </p>
          <div className="inline-flex items-center gap-3 p-3 px-4 rounded-xl bg-pink-500/10 border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)] self-start">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pink-500/20 text-pink-400 text-xs shadow-[0_0_10px_rgba(236,72,153,0.3)]">
              ☕
            </span>
            <span className="text-[11px] md:text-xs font-semibold text-pink-200 tracking-wide">
              Top predictors may be invited for a small admin-hosted community treat.
            </span>
          </div>
        </div>
      </motion.div>

      {/* Top 3 Cards */}
      {top3.length >= 3 && (
        <div className="flex flex-col md:flex-row items-end justify-center gap-6 mb-16 mt-8">
          {/* Rank 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="w-full md:w-64 h-48 rounded-2xl border border-white/5 glass-card bg-navy-800/60 p-6 relative flex flex-col justify-end overflow-hidden group hover:border-blue-500/30 hover:shadow-[0_8px_32px_rgba(59,130,246,0.15)]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-4 right-4 text-6xl font-black text-white/[0.03] italic group-hover:text-white/[0.05] transition-colors">#2</div>
            <div className="h-10 w-10 rounded-full bg-navy-900/50 backdrop-blur-md flex items-center justify-center mb-4 z-10 border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                {(top3[1].username || top3[1].email || '?').charAt(0).toUpperCase()}
              </div>
            </div>
            <h3 className="text-lg font-bold text-white z-10 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-cyan-400 transition-all">{top3[1].username || top3[1].email || 'Anon'}</h3>
            <p className="text-blue-400 font-bold text-sm z-10 font-mono drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">+{formatCurrency(top3[1].totalValue)}</p>
          </motion.div>

          {/* Rank 1 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full md:w-72 h-64 rounded-2xl border border-cyan-neon/30 glass-card bg-navy-800/60 p-6 relative flex flex-col justify-end overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.2)] group hover:border-cyan-neon/50 hover:shadow-[0_0_40px_rgba(0,229,255,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-cyan-neon/20 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-4 right-4 text-8xl font-black text-white/[0.03] italic group-hover:text-white/[0.05] transition-colors">#1</div>
            <div className="absolute top-6 left-6 bg-cyan-neon/20 text-cyan-neon text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10 border border-cyan-neon/30 backdrop-blur-md shadow-[0_0_10px_rgba(0,229,255,0.3)]">
              Market Master
            </div>
            <div className="h-14 w-14 rounded-full bg-navy-900/50 backdrop-blur-md flex items-center justify-center mb-4 z-10 border border-white/10 shadow-[0_0_20px_rgba(0,229,255,0.4)]">
              <div className="h-12 w-12 rounded-full bg-cyan-neon/20 flex items-center justify-center text-cyan-neon text-sm font-bold">
                {(top3[0].username || top3[0].email || '?').charAt(0).toUpperCase()}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white z-10 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-neon group-hover:to-purple-neon transition-all">{top3[0].username || top3[0].email || 'Anon'}</h3>
            <p className="text-cyan-neon font-bold z-10 font-mono text-lg drop-shadow-[0_0_10px_rgba(0,229,255,0.6)]">+{formatCurrency(top3[0].totalValue)}</p>
          </motion.div>

          {/* Rank 3 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="w-full md:w-64 h-48 rounded-2xl border border-white/5 glass-card bg-navy-800/60 p-6 relative flex flex-col justify-end overflow-hidden group hover:border-purple-neon/30 hover:shadow-[0_8px_32px_rgba(188,19,254,0.15)]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-purple-neon/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute top-4 right-4 text-6xl font-black text-white/[0.03] italic group-hover:text-white/[0.05] transition-colors">#3</div>
            <div className="h-10 w-10 rounded-full bg-navy-900/50 backdrop-blur-md flex items-center justify-center mb-4 z-10 border border-white/10 shadow-[0_0_15px_rgba(188,19,254,0.3)]">
              <div className="h-8 w-8 rounded-full bg-purple-neon/20 flex items-center justify-center text-purple-neon text-xs font-bold">
                {(top3[2].username || top3[2].email || '?').charAt(0).toUpperCase()}
              </div>
            </div>
            <h3 className="text-lg font-bold text-white z-10 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-neon group-hover:to-pink-400 transition-all">{top3[2].username || top3[2].email || 'Anon'}</h3>
            <p className="text-purple-neon font-bold text-sm z-10 font-mono drop-shadow-[0_0_8px_rgba(188,19,254,0.5)]">+{formatCurrency(top3[2].totalValue)}</p>
          </motion.div>
        </div>
      )}

      {/* List Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">Top Predictors</h2>
      </div>

      {/* List */}
      <div className="space-y-3">
        <div className="grid grid-cols-12 gap-4 px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          <div className="col-span-2">Rank</div>
          <div className="col-span-7">Predictor</div>
          <div className="col-span-3 text-right">Balance</div>
        </div>

        {restUsers.map((user, index) => {
          const rank = index + 4

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              className="grid grid-cols-12 items-center gap-4 p-4 rounded-xl border border-white/5 glass-panel bg-navy-800/40 hover:bg-navy-700/50 hover:border-cyan-neon/20 transition-all duration-300 group"
            >
              <div className="col-span-2 font-bold text-slate-500 group-hover:text-cyan-neon/70 transition-colors">#{rank}</div>
              <div className="col-span-7 flex items-center gap-3">
                <div className="h-8 w-8 rounded-md bg-navy-900/50 border border-white/5 flex items-center justify-center backdrop-blur-sm group-hover:border-cyan-neon/30 transition-colors">
                  <div className="h-6 w-6 rounded-sm bg-white/5 flex items-center justify-center text-slate-300 text-[10px] font-bold group-hover:text-cyan-neon transition-colors">
                    {(user.username || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className="font-bold text-slate-300 group-hover:text-white transition-colors">{user.username || user.email || 'Anon'}</span>
              </div>
              <div className="col-span-3 text-right">
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  +{formatCurrency(user.totalValue)}
                </span>
              </div>
            </motion.div>
          )
        })}

        {/* Current User Highlight */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.5 }}
            className="grid grid-cols-12 items-center gap-4 p-4 rounded-xl border border-cyan-neon/30 glass-panel bg-cyan-neon/5 mt-6 relative overflow-hidden shadow-[0_0_20px_rgba(0,229,255,0.15)]"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-neon to-purple-neon shadow-[0_0_10px_rgba(0,229,255,0.8)]"></div>
            <div className="col-span-2 font-bold text-cyan-neon drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]">
              #{currentUserRank !== null ? currentUserRank : "-"}
            </div>
            <div className="col-span-7 flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-cyan-neon/20 border border-cyan-neon/30 flex items-center justify-center text-cyan-neon backdrop-blur-sm shadow-[0_0_10px_rgba(0,229,255,0.2)]">
                <User className="h-4 w-4" />
              </div>
              <span className="font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">You ({currentUser.username || currentUser.email || 'Anon'})</span>
            </div>
            <div className="col-span-3 text-right font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon">
              <span className="font-mono font-bold text-emerald-400">
                +{formatCurrency(currentUser.totalValue)}
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
