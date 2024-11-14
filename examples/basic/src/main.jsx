import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'github-markdown-css'
import '@armantang/html-diff/dist/index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
