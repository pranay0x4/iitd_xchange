import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/src/components/ui/button"
import { auth, signOut } from "@/src/firebase"
import { formatCurrency } from "@/src/lib/utils"

export function Navbar({ user, balance }: { user: any, balance: number }) {
  const location = useLocation()
  const navigate = useNavigate()
  
  const handleLogout = () => {
    signOut(auth)
  }

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-x-0 border-t-0 rounded-none bg-navy-800/40 font-sans">
      <div className="container mx-auto flex flex-wrap min-h-[4rem] items-center justify-between px-4 py-3 md:py-0 gap-y-3">
        {/* Logo */}
        <div className="flex items-center shrink-0 order-1">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">
              IITD <span className="text-gradient">Xchange</span>
            </span>
          </Link>
        </div>
        
        {/* Tabs - w-full on mobile to drop to next line, w-auto on md to sit in middle */}
        {user && (
          <div className="flex sm:justify-center items-center gap-5 md:gap-6 text-[12px] md:text-[13px] font-medium w-full md:w-auto order-3 md:order-2 overflow-x-auto pb-1 md:pb-0">
            <Link 
              to="/" 
              className={`flex shrink-0 items-center transition-all duration-300 relative ${location.pathname === '/' ? 'text-white drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]' : 'text-slate-400 hover:text-white'}`}
            >
              Markets
            </Link>

            <Link 
              to="/portfolio" 
              className={`flex shrink-0 items-center transition-all duration-300 relative ${location.pathname === '/portfolio' ? 'text-white drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]' : 'text-slate-400 hover:text-white'}`}
            >
              Portfolio
            </Link>

            <Link 
              to="/leaderboard" 
              className={`flex shrink-0 items-center transition-all duration-300 relative ${location.pathname === '/leaderboard' ? 'text-white drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]' : 'text-slate-400 hover:text-white'}`}
            >
              Leaderboard
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 lg:gap-4 order-2 md:order-3 shrink-0">
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={() => navigate("/feedback")}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] md:text-xs font-bold uppercase tracking-wider hover:bg-pink-500/20 hover:text-white transition-all shadow-[0_0_15px_rgba(236,72,153,0.15)] hover:shadow-[0_0_20px_rgba(236,72,153,0.3)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
              Feedback
            </button>
            <div className="text-[10px] sm:text-xs text-slate-500 pr-1 mt-1">Built by Pranay Jain</div>
          </div>

          {user ? (
            <div 
              className="flex items-center gap-2 rounded-full glass-panel px-3 md:px-4 py-1.5 text-[10px] md:text-xs font-semibold text-white cursor-pointer hover:bg-white/5 transition-all border border-white/5 bg-navy-700/50"
              onClick={handleLogout}
              title="Click to logout"
            >
              <span className="text-slate-400 font-normal mr-1 hidden sm:inline">Balance</span>
              <span className="text-gradient">{formatCurrency(balance)}</span>
            </div>
          ) : (
            <Link to="/auth">
              <Button className="glass-button-primary h-8 px-4 text-xs">Login / Signup</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
