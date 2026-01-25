import { Routes, Route } from 'react-router-dom'
import { Desktop } from './zackos/Desktop'
import { PrivacyPolicy } from './PrivacyPolicy'

export default function App() {
  return (
    <Routes>
      <Route path="/ftns/privacy" element={<PrivacyPolicy />} />
      <Route path="*" element={<Desktop />} />
    </Routes>
  )
}
