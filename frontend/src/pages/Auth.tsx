import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { auth, db } from "@/src/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { Card, CardContent } from "@/src/components/ui/card"
import { Link } from "react-router-dom"
import { OAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth"
import { motion } from "framer-motion"
import { Lock } from "lucide-react"

export function Auth() {
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate("/")
      }
    })
    return () => unsub()
  }, [])

  const signInWithMicrosoft = async () => {
    setError("")
    setLoading(true)
    try {
      const provider = new OAuthProvider("microsoft.com")
      provider.setCustomParameters({
        tenant: "iitd.ac.in"
      })

      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Create user in firestore if first time
      const userRef = doc(db, "users", user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        const username = (user.email || "user").split("@")[0]
        await setDoc(userRef, {
          email: user.email,
          username: username,
          balance: 5000,
          usernameEdited: false,
          createdAt: new Date().toISOString()
        })
      }

      // onAuthStateChanged listener will handle navigation to "/"
    } catch (err: any) {
      console.error("Microsoft sign-in error:", err)
      if (err.code === "auth/popup-closed-by-user") {
        setLoading(false)
        return
      }
      setError(err.message || "Microsoft sign-in failed. Please try again.")
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col min-h-screen relative font-sans">
      {/* Header */}
      <header className="w-full p-6 flex justify-between items-center z-10 glass-panel border-x-0 border-t-0 rounded-none bg-navy-800/40">
        <div className="text-xl font-bold text-white tracking-tight">IITD <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon to-blue-500">Xchange</span></div>
        <div className="flex flex-col items-end gap-1">
          <Link
            to="/feedback"
            className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-bold uppercase tracking-wider hover:bg-pink-500/20 hover:text-white transition-all shadow-[0_0_15px_rgba(236,72,153,0.15)] hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
            Feedback
          </Link>
          <div className="text-[12px] text-slate-500 mt-1">Built by Pranay Jain</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center z-10 px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center p-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-4 shadow-[0_0_20px_rgba(0,229,255,0.2)]"
          >
            <Lock className="h-6 w-6 md:h-8 md:w-8 text-cyan-neon" />
          </motion.div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
            IITD <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon to-blue-500">Xchange</span>
          </h1>
          <p className="text-[10px] md:text-xs font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon to-purple-neon uppercase">
            The Predictors Portal
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          <Card className="w-full glass-card border-white/5 shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] rounded-2xl overflow-hidden bg-navy-800/60">
            <CardContent className="p-8">
              {/* Single tab - Signup / Login */}
              <div className="flex glass-panel bg-navy-900/50 rounded-full p-1 mb-8 border border-white/5">
                <div className="flex-1 text-sm font-semibold py-2.5 rounded-full text-center bg-gradient-to-r from-cyan-neon/20 to-blue-500/20 text-cyan-neon shadow-[0_0_15px_rgba(0,229,255,0.2)] border border-cyan-neon/30">
                  Signup / Login
                </div>
              </div>

              <div className="space-y-4">
                {error && (
                  <div className="text-[10px] md:text-xs text-red-400 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20 backdrop-blur-sm">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={signInWithMicrosoft}
                  disabled={loading}
                  className="w-full bg-[#0078D4] hover:bg-[#106ebe] disabled:opacity-60 text-white py-3 rounded-xl font-semibold transition"
                >
                  {loading ? "Signing in..." : "Continue with IITD Microsoft"}
                </button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Worry not! Your IITD email is used only for authentication — we do not collect your data.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full p-6 glass-panel border-x-0 border-b-0 rounded-none bg-navy-800/40 z-10 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4">
          <div className="text-lg font-bold text-white tracking-tight">IITD <span className="text-gradient">Xchange</span></div>
          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>

              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </div>
            <div className="text-[10px] text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <span>© 2026 IITD XCHANGE. QUANTUM INTERFACE V1.0</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
