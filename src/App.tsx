import { Routes, Route } from 'react-router-dom'
import { Desktop } from './zackos/Desktop'
import { PrivacyPolicy } from './PrivacyPolicy'
import { FjrPrivacyPolicy } from './FjrPrivacyPolicy'

export default function App() {
  return (
    <Routes>
      <Route path="/ftns/privacy" element={<PrivacyPolicy />} />
      <Route path="/fjr/privacy" element={<FjrPrivacyPolicy />} />
      <Route path="*" element={<Desktop />} />
    </Routes>
  )
}
