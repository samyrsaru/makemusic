function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">MakeMusic</h1>
        <p className="text-xl text-white/80">Your music creation journey starts here</p>
        <button className="mt-8 px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg shadow-lg hover:bg-white/90 transition-colors">
          Get Started
        </button>
      </div>
    </div>
  )
}

export default Home
