import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ToastProvider, ErrorBoundary } from './components/ui'
import { ThemeProvider } from './contexts'
import './index.css'

const container = document.getElementById('root') as HTMLElement
createRoot(container).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <ErrorBoundary>
      <App />
        </ErrorBoundary>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
)
