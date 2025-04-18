import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

window.ICC_COMMIT_BRANCH = import.meta.env.VITE_ICC_COMMIT_BRANCH
window.ICC_COMMIT_HASH = import.meta.env.VITE_ICC_COMMIT_HASH
window.ICC_BUILD_TIME = import.meta.env.VITE_ICC_BUILD_TIME

console.log(`Commit branch: ${window.ICC_COMMIT_BRANCH}`)
console.log(`Commit hash: ${window.ICC_COMMIT_HASH}`)
console.log(`Build time: ${window.ICC_BUILD_TIME}`)

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
