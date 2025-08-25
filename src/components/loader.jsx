import { useEffect, useState } from "react"

export default function DreamyLoader() {
  const [dots, setDots] = useState("")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-pink-300 via-purple-300 to-orange-200">
      {/* Animated background clouds */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-20 bg-pink-200/40 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-20 right-20 w-40 h-24 bg-purple-200/30 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-1/4 w-36 h-22 bg-orange-200/35 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute bottom-32 right-1/3 w-28 h-18 bg-pink-300/25 rounded-full blur-xl animate-pulse delay-1500"></div>
      </div>

      {/* Main loader content */}
      <div className="relative z-10 text-center">
        {/* Floating orbs */}
        <div className="relative mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-200 to-orange-200 rounded-full animate-bounce mx-auto shadow-lg"></div>
          <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full animate-ping"></div>
          <div className="absolute -bottom-2 -left-2 w-6 h-6 bg-gradient-to-br from-orange-200 to-pink-200 rounded-full animate-pulse"></div>
        </div>

        {/* Loading text */}
        <div className="text-white/90 font-medium text-lg mb-4">Loading your experience{dots}</div>

        {/* Animated progress bar */}
        <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-gradient-to-r from-pink-200 via-purple-200 to-orange-200 rounded-full animate-pulse"></div>
        </div>

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-1 h-1 bg-white/60 rounded-full animate-ping delay-300"></div>
          <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-white/60 rounded-full animate-ping delay-700"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-white/60 rounded-full animate-ping delay-1100"></div>
          <div className="absolute bottom-0 right-1/3 w-1 h-1 bg-white/60 rounded-full animate-ping delay-1400"></div>
        </div>
      </div>
    </div>
  )
}