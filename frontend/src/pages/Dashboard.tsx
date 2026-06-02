import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { collection, query, onSnapshot, orderBy, addDoc, doc } from "firebase/firestore"
import { Card, CardContent } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { isAdminEmail } from "@/src/config/env"
import { formatCurrency } from "@/src/lib/utils"
import { motion } from "framer-motion"
import { Coins, Plus, X } from "lucide-react"
import { auth, db } from "@/src/firebase"

export function Dashboard() {
  const [markets, setMarkets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState("All")
  const [username, setUsername] = useState<string>("")

  // Admin logic
  const isAdmin = isAdminEmail(auth.currentUser?.email)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [newMarket, setNewMarket] = useState({
    title: "", description: "", category: "Elections",
    optionA: "Yes", optionB: "No", endDate: "",
    imageUrl: "", order: 0
  })

  // Dynamically generate categories from the markets in Firestore
  const categories = ["All", ...new Set(markets.map(m => m.category).filter(Boolean))]

  useEffect(() => {
    const q = query(collection(db, "markets"), orderBy("createdAt", "desc"))



    const unsubscribe = onSnapshot(q, (snapshot) => {
      const marketData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setMarkets(marketData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Fetch current user's username
  useEffect(() => {
    if (!auth.currentUser) return
    const userRef = doc(db, "users", auth.currentUser.uid)
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        setUsername(snap.data().username || snap.data().email?.split("@")[0] || "")
      }
    })
    return () => unsub()
  }, [])

  const handleAddMarket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return
    setSubmitting(true)
    try {
      const marketDoc = {
        title: newMarket.title,
        description: newMarket.description,
        category: newMarket.category || "General",
        optionA: newMarket.optionA,
        optionB: newMarket.optionB,
        imageUrl: newMarket.imageUrl || "",
        order: Number(newMarket.order) || 0,
        poolA: 0,
        poolB: 0,
        totalPredictors: 0,
        status: "open",
        outcome: "none",
        endDate: new Date(newMarket.endDate).toISOString(),
        createdAt: new Date().toISOString()
      }

      const docRef = await addDoc(collection(db, "markets"), marketDoc)

      // Seed a single initial odds point at 50/50 so charts don't crash
      await addDoc(collection(db, "odds_history"), {
        marketId: docRef.id,
        oddsA: 50,
        oddsB: 50,
        timestamp: new Date().toISOString()
      })

      setShowAddModal(false)
      setNewMarket({ title: "", description: "", category: "Karakoram", optionA: "Yes", optionB: "No", endDate: "", imageUrl: "", order: 0 })
    } catch (err) {
      console.error("Failed to add market:", err)
      alert("Failed to create market")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-neon border-t-transparent shadow-[0_0_15px_rgba(0,229,255,0.5)]"></div>
      </div>
    )
  }

  const filteredMarkets = (activeCategory === "All"
    ? markets
    : markets.filter(m => m.category.toUpperCase() === activeCategory.toUpperCase())
  ).sort((a: any, b: any) => {
    // Active cards first, resolved cards last
    if (a.status === 'resolved' && b.status !== 'resolved') return 1
    if (a.status !== 'resolved' && b.status === 'resolved') return -1
    
    // Sort by order field
    const orderA = a.order || 0
    const orderB = b.order || 0
    return orderA - orderB
  })

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl relative">
      <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-bold tracking-tight text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            {username ? <>Hello, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon to-purple-neon">{username}</span></> : "Markets"}
          </h1>
          <p className="text-slate-400 text-lg">Predict the outcome of events.</p>
        </motion.div>

        {isAdmin && (
          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setShowAddModal(true)}
            className="group flex items-center gap-2 bg-gradient-to-r from-cyan-neon to-purple-neon text-white font-bold px-6 py-3 rounded-full shadow-[0_0_20px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(188,19,254,0.4)] transition-all hover:scale-105"
          >
            <Plus className="h-5 w-5" /> Add Market
          </motion.button>
        )}
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 ${activeCategory === cat
              ? "bg-gradient-to-r from-cyan-neon/20 to-blue-500/20 text-cyan-neon shadow-[0_0_15px_rgba(0,229,255,0.2)] border border-cyan-neon/30"
              : "glass-button text-slate-300"
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredMarkets.map((market, index) => {
          const totalPool = market.poolA + market.poolB
          // If total pool is 0, display 0% instead of 50%
          const probA = totalPool === 0 ? 0 : Math.round((market.poolA / totalPool) * 100)
          const probB = totalPool === 0 ? 0 : 100 - probA

          // Calculate display odds
          const oddsA = totalPool === 0 ? "1.00" : probA === 0 ? "0.00" : (1 / (probA / 100)).toFixed(2)
          const oddsB = totalPool === 0 ? "1.00" : probB === 0 ? "0.00" : (1 / (probB / 100)).toFixed(2)

          const isResolved = market.status === 'resolved'
          const winnerName = isResolved
            ? (market.outcome === 'A' ? (market.optionA || 'A') : (market.optionB || 'B'))
            : null

          return (
            <motion.div
              key={market.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Link to={`/market/${market.id}`} className="block h-full">
                <Card className={`glass-card h-full overflow-hidden border-white/5 ${isResolved ? 'bg-navy-800/40 grayscale-[50%] opacity-75' : 'bg-navy-800/60 group hover:border-cyan-neon/30 hover:shadow-[0_8px_32px_rgba(0,229,255,0.15)]'}`}>
                  <CardContent className="p-4 md:p-5 flex flex-col sm:flex-row gap-4 md:gap-5 h-full relative">
                    {/* Subtle glow effect behind the card content */}
                    {!isResolved && (
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-neon/5 to-purple-neon/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                    )}

                    <div className="w-full sm:w-28 h-32 sm:h-28 shrink-0 rounded-xl bg-navy-900 overflow-hidden relative z-10 shadow-[0_4px_15px_rgba(0,0,0,0.5)] border border-white/5">
                      <img
                        src={market.imageUrl || `https://picsum.photos/seed/${market.category}/200/200`}
                        alt={market.title}
                        className={`w-full h-full object-cover ${isResolved ? '' : 'transition-transform duration-500 group-hover:scale-110'}`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between relative z-10 space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`font-semibold text-base md:text-lg leading-tight line-clamp-2 ${isResolved ? 'text-slate-400' : 'text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-neon group-hover:to-purple-neon transition-all duration-300'}`}>{market.title}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-navy-700/50 text-slate-300 text-[9px] md:text-[10px] uppercase tracking-wider border border-white/5 backdrop-blur-md">
                            {market.category}
                          </Badge>
                          {isResolved ? (
                            <Badge className="bg-white/10 text-white border border-white/20 text-[9px] md:text-[10px] uppercase tracking-wider">
                              🏆 {winnerName}
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">Pool: {formatCurrency(totalPool)}</span>
                          )}
                        </div>
                      </div>

                      {isResolved ? (
                        <div className="flex flex-col gap-2 mt-auto">
                          <div className={`rounded-xl py-2 px-3 flex justify-between items-center border ${market.outcome === 'A' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20 line-through'}`}>
                            <span className="font-bold text-xs md:text-sm truncate mr-2">{market.optionA || 'Yes'}</span>
                            {market.outcome === 'A' && <span className="text-xs shrink-0">✓</span>}
                          </div>
                          <div className={`rounded-xl py-2 px-3 flex justify-between items-center border ${market.outcome === 'B' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20 line-through'}`}>
                            <span className="font-bold text-xs md:text-sm truncate mr-2">{market.optionB || 'No'}</span>
                            {market.outcome === 'B' && <span className="text-xs shrink-0">✓</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 mt-auto">
                          <div className="bg-cyan-neon/10 hover:bg-cyan-neon/20 text-cyan-neon border border-cyan-neon/20 rounded-xl py-2 px-3 flex justify-between items-center transition-all duration-300">
                            <span className="font-bold text-xs md:text-sm truncate mr-2">{market.optionA || 'Yes'}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold font-mono text-[11px] md:text-sm leading-none bg-cyan-neon/10 px-1.5 py-0.5 rounded">{probA}%</span>
                              <span className="text-[9px] md:text-[10px] opacity-70 leading-none">{oddsA}x</span>
                            </div>
                          </div>

                          <div className="bg-purple-neon/10 hover:bg-purple-neon/20 text-purple-neon border border-purple-neon/20 rounded-xl py-2 px-3 flex justify-between items-center transition-all duration-300">
                            <span className="font-bold text-xs md:text-sm truncate mr-2">{market.optionB || 'No'}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-bold font-mono text-[11px] md:text-sm leading-none bg-purple-neon/10 px-1.5 py-0.5 rounded">{probB}%</span>
                              <span className="text-[9px] md:text-[10px] opacity-70 leading-none">{oddsB}x</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {filteredMarkets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel mt-8 bg-navy-800/40 border-white/5">
          <div className="mb-4 rounded-full bg-navy-900/50 p-4 border border-white/5 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <Coins className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No active markets</h3>
          <p className="text-slate-400">Check back later for new prediction opportunities in this category.</p>
        </div>
      )}

      {/* Admin Add Market Modal */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-900/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md glass-card bg-navy-800 border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex justify-between items-center p-5 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Create New Market</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMarket} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Title</label>
                <input required type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                  value={newMarket.title} onChange={e => setNewMarket({ ...newMarket, title: e.target.value })} placeholder="e.g. Who will win?" />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Description</label>
                <textarea required rows={2} className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                  value={newMarket.description} onChange={e => setNewMarket({ ...newMarket, description: e.target.value })} placeholder="Market details..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Category</label>
                  <input required type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                    value={newMarket.category} onChange={e => setNewMarket({ ...newMarket, category: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">End Date & Time</label>
                  <input required type="datetime-local" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                    value={newMarket.endDate} onChange={e => setNewMarket({ ...newMarket, endDate: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Option A (Yes)</label>
                  <input required type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                    value={newMarket.optionA} onChange={e => setNewMarket({ ...newMarket, optionA: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Option B (No)</label>
                  <input required type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                    value={newMarket.optionB} onChange={e => setNewMarket({ ...newMarket, optionB: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Image URL (Optional)</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                    value={newMarket.imageUrl} onChange={e => setNewMarket({ ...newMarket, imageUrl: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 block">Sort Order</label>
                  <input required type="number" className="w-full p-3 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-cyan-neon outline-none"
                    value={newMarket.order} onChange={e => setNewMarket({ ...newMarket, order: Number(e.target.value) })} />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 bg-gradient-to-r from-cyan-neon to-blue-500 hover:from-cyan-neon/80 hover:to-blue-500/80 text-navy-900 font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(0,229,255,0.4)] disabled:opacity-50 transition-all"
              >
                {submitting ? "Creating..." : "Launch Market"}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Footer credit */}

    </div>
  )
}
