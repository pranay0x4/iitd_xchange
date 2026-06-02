import { isArchiveModeEnabled } from "@/src/config/env"
import { LiveApp } from "@/src/live-app"

function App() {
  if (isArchiveModeEnabled) {
    return <div style={{ backgroundColor: "black", minHeight: "100vh" }} />
  }

  return <LiveApp />
}

export default App
