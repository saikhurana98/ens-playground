import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
// import 'react-digraph/'
// import 'react-digraph/dist/styles/main.css'

const container = document.getElementById('root')!
const root = createRoot(container)
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
