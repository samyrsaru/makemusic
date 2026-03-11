import type { ReactNode } from 'react'
import { UserButton, useAuth } from '@clerk/react'
import { Link, Outlet } from 'react-router'
import { ThemeToggle } from '../components/ThemeToggle.tsx'

export function Header() {
  const { isSignedIn } = useAuth()

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center">
      <Link to={isSignedIn ? "/studio" : "/"} className="text-xl font-semibold tracking-tight">
        <span className="text-green-500">Make</span>Music
      </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
        {isSignedIn && (
          <>
            <Link 
              to="/studio" 
              className="text-zinc-600 dark:text-zinc-400 hover:text-green-500 dark:hover:text-green-400 transition-colors text-sm font-medium"
            >
              Studio
            </Link>
            <Link 
              to="/library" 
              className="text-zinc-600 dark:text-zinc-400 hover:text-green-500 dark:hover:text-green-400 transition-colors text-sm font-medium"
            >
              Library
            </Link>
            <Link 
              to="/account" 
              className="text-zinc-600 dark:text-zinc-400 hover:text-green-500 dark:hover:text-green-400 transition-colors text-sm font-medium"
            >
              Account
            </Link>
          </>
        )}
        <UserButton />
      </div>
    </nav>
  )
}

export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header />
      {children ?? <Outlet />}
    </div>
  )
}
