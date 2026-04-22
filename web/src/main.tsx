import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { registerPushServiceWorker } from './lib/push'

registerPushServiceWorker().catch(() => {
  // Ignore registration failures; the app remains usable without push.
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
