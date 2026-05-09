import React from 'react'
import Footer from '../components/Footer'

interface MainLayoutProps {
  children: React.ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-noc-bg relative">
      {children}
      <Footer />
    </div>
  )
}
