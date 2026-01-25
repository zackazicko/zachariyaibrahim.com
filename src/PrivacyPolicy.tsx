/* =============================================================================
   FTNS PRIVACY POLICY PAGE
   Standalone page (not part of zackOS desktop UI).
   ============================================================================= */

export function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <div className="privacy-container">
        <h1 className="privacy-title">Privacy Policy (ftns.)</h1>
        
        <p className="privacy-date">Effective date: January 2026</p>
        
        <p className="privacy-meta">
          <strong>App name:</strong> ftns.<br />
          <strong>Developer:</strong> Zachariya Ibrahim
        </p>

        <section className="privacy-section">
          <h2>Summary</h2>
          <p>
            ftns. is an offline workout logging app. We do not require an account, and we do not collect, sell, or share your personal data. Your workout data is stored locally on your device.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Information we store on your device</h2>
          <p>ftns. stores the following only on your device (local app storage):</p>
          <ul>
            <li>Workout logs: exercises, sets, reps, weight, timestamps, session titles</li>
            <li>Notes and tags you add to sessions/workouts</li>
            <li>Muscle group labels associated with workouts</li>
            <li>Preferences (e.g., preferred units)</li>
            <li>Optional profile info you choose to enter (e.g., display name, height, body weight, gender, age range)</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>Information we collect</h2>
          <p>
            We do not collect any personal information from you.
          </p>
          <p>
            ftns. does not send your workouts or profile data to our servers because we do not operate any servers for the app.
          </p>
        </section>

        <section className="privacy-section">
          <h2>How your information is used</h2>
          <p>
            All data is used only within the app on your device to power features like workout history, insights, charts, tags, and muscle-group breakdowns.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Sharing your information</h2>
          <p>
            We do not share your data with third parties.
          </p>
          <p>
            If the app includes links that open in an in-app browser, any website you visit is governed by that website's own privacy policy.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Tracking and advertising</h2>
          <p>
            ftns. does not use third-party advertising, tracking, or analytics SDKs.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Data retention and deletion</h2>
          <p>Your data remains on your device until you delete it.</p>
          <ul>
            <li>You can delete all app data using the in-app "Delete all memory" / reset option.</li>
            <li>You can also remove all data by uninstalling the app.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>Security</h2>
          <p>
            We keep your information private by not transmitting it off your device. No method of storage is 100% secure, but keeping data local reduces exposure.
          </p>
        </section>

        <section className="privacy-section">
          <h2>Children's privacy</h2>
          <p>
            ftns. is not directed to children under 13, and we do not knowingly collect personal information from children.
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
