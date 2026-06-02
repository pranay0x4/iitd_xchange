import { Card, CardContent } from "@/src/components/ui/card"
import { motion } from "framer-motion"
import { FileText } from "lucide-react"

export function Terms() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl relative">
      <div className="mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center p-3 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
        >
          <FileText className="h-8 w-8 text-purple-neon" />
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Terms of <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-neon to-pink-500">Service</span>
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
          The legal stuff. You can read it, but using the platform means you agree to it.
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
                  <span className="w-2 h-2 rounded-full bg-purple-neon"></span> The Platform
                </h3>
                <p>
                  IITD Xchange is an experimental virtual prediction market simulation game developed as a weekend project by an individual student. This simulation game is intended purely for educational and entertainment purposes within the IIT Delhi community.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-neon"></span> Not Real Money
                </h3>
                <p>
                  All predictions and balances use virtual credits that have no monetary value. These tokens cannot be exchanged for real currency, goods, services, or any form of financial compensation. Don't ask us to cash you out.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span> Fictionalized Names & Scenarios
                </h3>
                <p className="mb-4">
                  Names and scenarios used in prediction cards may be altered or fictionalized for gameplay purposes, and are created with varying degrees of inspiration from general campus context. Any resemblance, if any, to real individuals, candidates, or elections is incidental and part of the simulation experience.
                </p>
                <p>
                  These markets represent fictionalized participants and simulated situations within a game environment, and do not make claims about or reflect any real person, election, or official process.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span> Not Official
                </h3>
                <p className="mb-4">
                  This platform does not represent any official process, institution, organization, or governing body. Market outcomes are informational and speculative only, and do not reflect actual results or official decisions.
                </p>
                <p>
                  The platform does not intend to influence opinions, promote propaganda, spread misinformation, or affect the direction of any kind of election, vote, or decision-making process. All markets are created solely for entertainment and predictive speculation.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> Leaderboard & Feedback Incentives
                </h3>
                <p className="mb-4">
                  Leaderboard standings and user feedback may be considered for informal recognition at the developer’s personal discretion, solely for learning and community engagement purposes.
                </p>
                <p className="mb-4">
                  Any such incentives are voluntary, non-contractual, and do not constitute guaranteed prizes, compensation, or financial rewards.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-navy-900/50 border border-white/5">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span> Market Rules & Liability
                </h3>
                <p className="mb-4">
                  Markets close automatically at their specified end time. Final outcomes are determined at the sole discretion of the platform administrator for simulation purposes.
                </p>
                <p className="mb-4">
                  By using this platform, users acknowledge that all activity is simulated, experimental, and provided "as-is" without guarantees of accuracy, reliability, or availability.
                </p>
                <p className="mb-4">
                  The developer assumes no liability for user decisions, interpretations, predictions, or any consequences arising from the use of this platform. Users participate voluntarily and accept full responsibility for their usage of the service.
                </p>
                <p>
                  This platform may be modified, suspended, or discontinued at any time without notice.
                </p>
                <p className="mb-4">
                  While the developer aims to resolve markets fairly and without intentional bias or data fabrication, no guarantees are made regarding neutrality or accuracy.
                </p>
                <p>
                  The platform should not be relied upon for real-world decisions, as it is a lightweight simulation created solely for learning and experimentation.
                </p>
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}