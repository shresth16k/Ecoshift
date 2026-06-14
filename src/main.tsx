import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log("%c🔥 Crafted by Shresth Kesarwani 🔥", "color: #ff0000; font-size: 20px; font-weight: bold;");
console.log("%cFind the easter eggs!", "color: #00ff00; font-size: 14px;");
(window as any).__CREATOR__ = "Shresth Kesarwani";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
