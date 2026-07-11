import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-hot-toast';
import './index.css';

// Import pages
import Dashboard from './pages/Dashboard';
import Labels from './pages/Labels';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Analytics from './pages/Analytics';

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="relative min-h-screen bg-gradient-to-br from-gray-950 to-gray-900 overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(102,126,234,0.15)_0%,transparent_20%)] animate-[floatBackground_15s_ease-in-out_infinite]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(240,147,251,0.15)_0%,transparent_20%)] animate-[floatBackground_20s_ease-in-out_infinite_reverse]"></div>
          </div>

          {/* Main content */}
          <main className="relative z-10 py-12 px-4 max-w-7xl mx-auto">
            <div className="space-y-8">
              {/* Header */}
              <header className="text-center mb-8">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
                  LogiTrack Pro
                </h1>
                <p className="text-xl text-muted-foreground/80 max-w-2xl mx-auto">
                  Advanced Logistics Management System
                </p>
              </header>

              {/* Navigation */}
              <nav className="flex flex-wrap gap-4 justify-center mb-8">
                <button
                  data-link
                  href="/"
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-transparent"
                >
                  Dashboard
                </button>
                <button
                  data-link
                  href="/labels"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-transparent"
                >
                  Labels
                </button>
                <button
                  data-link
                  href="/users"
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-transparent"
                >
                  Users
                </button>
                <button
                  data-link
                  href="/settings"
                  className="px-6 py-3 bg-gradient-to-r from-gray-500 to-blue-600 hover:from-gray-600 hover:to-blue-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-transparent"
                >
                  Settings
                </button>
                <button
                  data-link
                  href="/analytics"
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-medium rounded-xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-transparent"
                >
                  Analytics
                </button>
              </nav>

              {/* Routes */}
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/labels" element={<Labels />} />
                <Route path="/users" element={<Users />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>

          {/* Footer */}
          <footer className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center text-muted-foreground/60">
            <p>LogiTrack Pro v1.0 &copy; {new Date().getFullYear()} - Powered by Claude AI</p>
          </footer>
        </div>
      </BrowserRouter>
      <ToastContainer position="top-center" />
    </QueryClientProvider>
  );
}

export default App;