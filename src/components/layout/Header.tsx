'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export default function Header() {
  const { user, logout } = useAuth()

  useEffect(() => {
    console.log('Auth state in header:', !!user)
    if (user) {
      console.log('User email:', user.email)
    }
  }, [user])

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-white shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-xl font-bold">
              Hermesian
            </Link>
          </div>
          
          {/* Navigation Links */}
          <div className="flex space-x-8 items-center">
            <Link 
              href="/"
              className="inline-flex items-center px-1 pt-1 text-gray-900"
            >
              Home
            </Link>
            <Link 
              href="/debates"
              className="inline-flex items-center px-1 pt-1 text-gray-900"
            >
              Debates
            </Link>

            {/* Auth Links */}
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-900 hover:text-gray-700"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
} 