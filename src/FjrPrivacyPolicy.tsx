/* =============================================================================
   FJR PRIVACY POLICY PAGE
   Standalone page (not part of zackOS desktop UI).
   ============================================================================= */

export function FjrPrivacyPolicy() {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <h1 className="privacy-title">Privacy Policy (fjr.)</h1>

        <p className="privacy-date">Effective date: March 2026</p>

        <p className="privacy-meta">
          <strong>App name:</strong> fjr.<br />
          <strong>Developer:</strong> Zachariya Ibrahim
        </p>

        <section className="privacy-section">
          <h2>Summary</h2>
          <p>
            fjr. is a Fajr prayer alarm app. We do not require an account. The only data we transmit externally is your device&apos;s location coordinates, sent to a third-party prayer times API solely to calculate your local prayer times. We do not collect, sell, or share your personal data.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Information we store on your device</h2>
          <p>fjr. stores the following only on your device (local app storage):</p>
          <ul>
            <li>Your location coordinates (latitude and longitude), obtained once per session to calculate prayer times</li>
            <li>Your alarm preferences (minutes before/after, anchor time, prayer calculation method)</li>
            <li>Cached prayer times for the next 30 days, refreshed periodically</li>
            <li>Scheduled alarm IDs used to manage your active alarms</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>Information we transmit</h2>
          <p>
            fjr. sends your device&apos;s approximate location coordinates (latitude and longitude) to the AlAdhan API (api.aladhan.com) to retrieve your local Fajr and sunrise times. No personal identifiers, device identifiers, or account information are included in this request. The AlAdhan API is a public prayer times service - you can review their privacy practices at <a href="https://aladhan.com" target="_blank" rel="noopener noreferrer">aladhan.com</a>.
          </p>
          <p>
            We do not operate any servers. No data is sent to us.
          </p>
        </section>

        <section className="privacy-section">
          <h2>How your information is used</h2>
          <ul>
            <li>Location is used solely to calculate accurate local prayer times. It is not stored beyond your current app session preferences (coordinates are saved locally to avoid redundant location requests).</li>
            <li>Prayer times are cached locally on your device to reduce API calls and support offline use.</li>
            <li>Alarm preferences are stored locally to restore your settings between sessions.</li>
            <li>City name is derived from your coordinates via Apple&apos;s on-device reverse geocoding (CLGeocoder / MapKit) and displayed in the app. It is not stored persistently.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>Location</h2>
          <p>
            fjr. requests access to your device location to determine your geographic position for prayer time calculation. Location is accessed only while the app is in use. We do not track your location over time, and your coordinates are never sent to us or any party other than the AlAdhan API as described above.
          </p>
          <p>
            You can revoke location access at any time in Settings &gt; Privacy &amp; Security &gt; Location Services &gt; fjr.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Alarms</h2>
          <p>
            fjr. uses Apple&apos;s AlarmKit framework to schedule Fajr alarms through the iOS system. Alarm authorization is handled by iOS in the same way as Camera or Microphone permissions. Alarm data is managed locally by iOS and does not leave your device.
          </p>
          <p>
            You can revoke alarm access at any time in Settings &gt; fjr. &gt; Alarms.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Background activity</h2>
          <p>
            fjr. uses iOS Background App Refresh to periodically re-fetch prayer times and reschedule alarms (approximately every 3 days). This keeps your alarms accurate without requiring you to open the app. No data is collected during background activity beyond what is described above.
          </p>
          <p>
            You can disable background refresh in Settings &gt; General &gt; Background App Refresh &gt; fjr.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Sharing your information</h2>
          <p>
            We do not share your data with third parties, except for the transmission of location coordinates to the AlAdhan API as described above.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Tracking and advertising</h2>
          <p>
            fjr. does not use third-party advertising, tracking, or analytics SDKs.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Data retention and deletion</h2>
          <p>
            Your data remains on your device until you delete it. You can remove all app data by uninstalling fjr.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Security</h2>
          <p>
            We keep your information private by not transmitting it off your device, except for coordinates sent to AlAdhan for prayer time calculation. No method of storage is 100% secure, but keeping data local reduces exposure.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Children&apos;s privacy</h2>
          <p>
            fjr. is not directed to children under 13, and we do not knowingly collect personal information from children.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Changes to this policy</h2>
          <p>
            If we change this policy, we will update the effective date and post the revised version.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Contact</h2>
          <p>
            If you have questions, contact: <a href="mailto:zachariyaibrahim@gmail.com">zachariyaibrahim@gmail.com</a>
          </p>
        </section>

        <footer className="privacy-footer">
          <a href="/">Back to zachariyaibrahim.com</a>
        </footer>
      </div>
    </div>
  )
}
