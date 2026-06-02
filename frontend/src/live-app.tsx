import { useEffect, useState } from "react"
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { doc, onSnapshot } from "firebase/firestore"

import { Navbar } from "@/src/components/layout/Navbar"
import { auth, db } from "@/src/firebase"
import { Auth } from "@/src/pages/Auth"
import { Dashboard } from "@/src/pages/Dashboard"
import { Feedback } from "@/src/pages/Feedback"
import { Leaderboard } from "@/src/pages/Leaderboard"
import { MarketDetail } from "@/src/pages/MarketDetail"
import { PrivacyPolicy } from "@/src/pages/Policy"
import { Portfolio } from "@/src/pages/Portfolio"
import { Terms } from "@/src/pages/Terms"

export function LiveApp() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)

      if (!currentUser) {
        setBalance(0)
        setLoading(false)
        return
      }

      const userDocRef = doc(db, "users", currentUser.uid)
      const unsubscribeUser = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance ?? 0)
          }
          setLoading(false)
        },
        (error) => {
          console.error("Error reading user document:", error)
          setLoading(false)
        },
      )

      return unsubscribeUser
    })

    return () => unsubscribeAuth()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#06090F]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-neon border-t-transparent shadow-[0_0_15px_rgba(0,229,255,0.5)]" />
      </div>
    )
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#06090F] text-slate-50 flex flex-col font-sans">
        <Navbar user={user} balance={balance} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/auth" replace />} />
            <Route path="/portfolio" element={user ? <Portfolio /> : <Navigate to="/auth" replace />} />
            <Route path="/leaderboard" element={user ? <Leaderboard /> : <Navigate to="/auth" replace />} />
            <Route path="/market/:id" element={user ? <MarketDetail /> : <Navigate to="/auth" replace />} />

            <Route path="/auth" element={!user ? <Auth /> : <Navigate to="/" replace />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/feedback" element={<Feedback />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
