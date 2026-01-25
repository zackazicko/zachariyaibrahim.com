import { Routes, Route } from 'react-router-dom'

function Home() {
  return null
}

function Ftns() {
  return null
}

function NotFound() {
  return null
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ftns" element={<Ftns />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
