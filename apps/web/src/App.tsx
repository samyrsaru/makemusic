import { BrowserRouter, Routes, Route } from 'react-router'
import Home from './pages/Home'
import Studio from './pages/Studio'
import MyMusic from './pages/MyMusic'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/my-music" element={<MyMusic />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
