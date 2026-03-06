import React from 'react'
import ReactDOM from 'react-dom/client'
import RouteShell from './RouteShell.jsx'
import './index.css'
import { ExpenseProvider } from './context/ExpenseContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ExpenseProvider>
      <RouteShell />
    </ExpenseProvider>
  </React.StrictMode>,
)
