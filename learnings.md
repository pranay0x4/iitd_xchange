# IITD Xchange: Post-Mortem & Lessons Learned

Looking back at this weekend project a few months after shutting it down, it's clear it was a classic case of launching fast, getting real traction, and then watching the tech choices buckle under the pressure. Here is an honest breakdown of what went right, what went wrong, and how I'd approach it if I had to build it again from scratch.

## What Went Right

* **Launching during election season:** Timing was everything. Releasing a campus prediction market right when hostel and student body elections were heating up gave us instant virality. People naturally wanted to speculate on outcomes they cared about.
* **Building and shipping quickly:** Using a React frontend with Vite and outsourcing the database and auth to Firebase let me go from zero to live in a single weekend.
* **Microsoft OAuth:** Restricting sign-ins to the `iitd.ac.in` tenant via Firebase Auth meant we had zero spam accounts or outside trolls. Every user was a verified student or faculty member.
* **Mobile-first design:** Predictions are made on the move. Building with responsive Tailwind styles and adding smooth Framer Motion transitions made the app feel premium on phones, which is where 90% of our traffic was.
* **Real users actually using the product:** Seeing students actively trading virtual tokens, checking their portfolio value, and arguing over changing odds was extremely rewarding. It proved the core concept worked.

## Mistakes I Made

* **Exposing settlement logic to the client:** I didn't set up a backend. Market resolution and payouts were executed entirely inside the browser of whatever admin clicked the "Set Winner" button. If an admin resolved a large market, their frontend had to run a query to fetch all bets, calculate payouts in memory, and commit the changes.
* **Hardcoded admin list:** Admin controls were hidden behind a client-side check (`VITE_ADMIN_EMAILS`) compiled directly into the frontend bundle. A malicious user with basic DevTools knowledge could have easily bypassed the UI visibility checks to expose administrative actions.
* **Broken trade vs. payout logic:** Trading price was dynamic (based on current pool ratios), but payouts were settled using a flat pari-mutuel calculation. An early buyer who bought YES at a cheap price got the exact same payout ratio as a late buyer who bought YES when the outcome was 95% certain. Early risk takers were not rewarded, and the "Estimated Return" shown in the trading UI didn't match the actual payout during settlement.
* **Firestore read storms:** Every time someone opened the Leaderboard, the client set up real-time listeners on the entire `users`, `markets`, and `bets` collections. Each new bet triggered a full-system recalculation for every active reader. I was reading thousands of documents every few seconds, which is a recipe for a massive Firebase bill.
* **Inefficient portfolio updates:** In the Portfolio page, the client-side snapshot listener fetched the user's bets, extracted unique market IDs, and then ran sequential `getDoc` calls for each market. For an active trader, this meant dozens of database requests on every single portfolio state update.
* **No observability:** I relied entirely on client-side `console.error` logs and browser `alert` popups for error handling. If a transaction failed for a user, I had no central place to see why or debug it.

## Non-Technical Mistakes

* **Shutting down too early:** I pulled the plug too quickly because of moderation anxiety. Campus politics get heated, and I was worried about potential backlash or administrative policy violations regarding student betting. In hindsight, I probably could have just implemented basic chat filters or warning banners.
* **Ignoring distribution and operations:** I spent too much time tweaking charts and page transitions instead of figuring out how to onboard new moderators or manage user feedback streams efficiently.
* **Failing to preserve data:** Once the server was turned off, I didn't extract or back up aggregated metrics like total transaction volume, peak concurrent users, or historical market trends. I'm left with just the codebase and memory.
* **Lack of live documentation:** I didn't write down operational procedures or design choices while the app was live. Trying to reconstruct the math and rationale months later is significantly harder.

## If I Built V2

* **Move critical logic to the backend:** I'd write a proper Node.js or Go server (or use Firebase Cloud Functions) to handle bets, calculate prices, and process settlements securely. The client should never have direct write access to users' token balances.
* **Pre-computed leaderboards:** Instead of having every browser recalculate the global standings, I would run a cron job on the server to compute the leaderboard every few minutes and write the static rankings to a single database document.
* **True AMM pricing:** I would implement a proper Constant Product Market Maker (CPMM) or Logarithmic Market Scoring Rule (LMSR) to guarantee that early trades lock in their cheap share prices, ensuring payouts match the implied odds at the time of purchase.
* **Secured admin tooling:** Admin operations would live on a separate portal behind server-enforced role-based access control, completely decoupled from the consumer-facing app.
* **Optimized subscription queries:** I'd fetch updates on a per-market basis rather than subscribing to global collections. Real-time connections would only be used for the current active page, with pagination for lists.
* **Centralized logging:** I'd integrate a simple logging tool (like Sentry or basic console aggregation) to capture client-side transaction failures and track server-side errors automatically.
