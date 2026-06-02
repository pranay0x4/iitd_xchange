import React, { useState } from "react"
import { db, auth } from "@/src/firebase"
import { collection, addDoc } from "firebase/firestore"
import { Card, CardContent } from "@/src/components/ui/card"
import { motion } from "framer-motion"
import { Send, Zap, MessageSquareWarning } from "lucide-react"

export function Feedback() {
  const [feedback, setFeedback] = useState("")
  const [contactInfo, setContactInfo] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim()) return

    setSubmitting(true)
    try {
      await addDoc(collection(db, "feedbacks"), {
        feedback: feedback.trim(),
        contactInfo: contactInfo.trim() || null,
        userId: auth.currentUser?.uid || null,
        email: auth.currentUser?.email || null,
        timestamp: new Date().toISOString()
      })

      setSubmitted(true)
      setFeedback("")
      setContactInfo("")
    } catch (err) {
      console.error("Failed to submit feedback:", err)
      alert("Oops, something went wrong. Couldn't send your roast!")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl relative">
      <div className="mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center justify-center p-3 rounded-full bg-pink-500/10 border border-pink-500/20 mb-6 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
        >
          <MessageSquareWarning className="h-8 w-8 text-pink-500" />
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          Roast Us. <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-neon">We Can Take It.</span>
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Found a bug? Hate the UI? Think our math is sus? <br className="hidden md:block" />
          Give us your most intensive, brutal feedback.
        </p>

        <div className="mt-6 flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold shadow-[0_0_15px_rgba(16,185,129,0.15)]">
            <Zap className="h-4 w-4" />
            Top roasts & feedbacks may get a personal treat from the Admin.
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="glass-card bg-navy-800/60 border-white/5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <CardContent className="p-6 md:p-8">
            {submitted ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500/20 mb-6 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  <Send className="h-8 w-8 text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
                <p className="text-slate-400">Your feedback has been delivered securely to our database.</p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-8 px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                >
                  Send another one
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                    Your Brutal Honesty
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Tell us everything that's wrong..."
                    className="w-full p-4 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-pink-500/50 outline-none resize-none transition-colors placeholder:text-slate-600"
                  />
                </div>

                {!auth.currentUser && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Handle / Email <span className="text-pink-500">*</span></span>
                      <span className="text-[10px] text-pink-500/70 normal-case tracking-normal">Mandatory so we can give you that treat</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      placeholder="@instagram or email"
                      className="w-full p-4 rounded-xl bg-navy-900/50 border border-white/5 text-white focus:border-pink-500/50 outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !feedback.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-neon hover:from-pink-500/80 hover:to-purple-neon/80 text-white font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(236,72,153,0.3)] disabled:opacity-50 transition-all uppercase tracking-wide"
                >
                  {submitting ? "Sending..." : "Submit Roast"}
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}