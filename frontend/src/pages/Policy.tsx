import { Card, CardContent } from "@/src/components/ui/card"
import { motion } from "framer-motion"
import { Shield } from "lucide-react"

export function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl relative">
      <div className="mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center p-3 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6 shadow-[0_0_20px_rgba(0,229,255,0.2)]"
        >
          <Shield className="h-8 w-8 text-cyan-neon" />
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Privacy <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-neon to-blue-500">Policy</span>
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          How we handle your data (tl;dr: we don't really care about your data, just your predictions).
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card bg-navy-800/60 border-white/5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <CardContent className="p-8 md:p-12 prose prose-invert max-w-none">
            <div className="space-y-8 text-slate-300 leading-relaxed">
              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-neon"></span> The Basics
                </h3>
                <p>
                  IITD Xchange is an experimental virtual prediction market simulation game built as a weekend project by an individual student. This platform is designed solely for entertainment and educational purposes within the IIT Delhi community.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-neon"></span> Authentication
                </h3>
                <p>
                  This platform uses Microsoft authentication only to verify that users are members of the IIT Delhi community. The login is used strictly for identity verification and to prevent misuse, spam, or multiple accounts. No passwords are stored by this platform. Basic profile information such as your name, email, and profile picture may be received from Microsoft during authentication. This information is used only to identify users within the platform and display leaderboard rankings.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span> Virtual Tokens & Privacy
                </h3>
                <p>
                  All predictions, and balances exist purely as simulated activity using virtual tokens. These tokens have no monetary value and are not connected to any financial system. Individual predictions activity are private and are not visible to other users. Only aggregated leaderboard rankings, such as the top predictors, may be displayed publicly within the platform.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Data Usage
                </h3>
                <p className="mb-4">
                  The platform does not sell, share, or distribute user data to third parties. No data is used for advertising, tracking, or profiling.
                </p>
                <p className="mb-4">
                  Minimal technical information such as login timestamps or usage data may be stored to maintain platform integrity, prevent abuse, and improve functionality.
                </p>
                <p>
                  Since this is an experimental student project, data storage and retention policies are lightweight. Data may be reset, modified, or deleted at any time as part of testing, improvements, or platform changes. Users may request deletion of their account and associated data at any time.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> The Bottom Line
                </h3>
                <p>
                  By using this platform, users acknowledge that this is an experimental simulation game and agree to the collection and use of limited authentication and gameplay data as described above. This privacy policy may be updated at any time without prior notice as the platform evolves.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}