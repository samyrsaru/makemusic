import { BrowserRouter, Routes, Route } from 'react-router'
import Home from './pages/Home'
import Studio from './pages/Studio'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/studio" element={<Studio />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
