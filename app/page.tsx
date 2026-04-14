'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Tab = 'register' | 'login';
type RegStep = 1 | 2 | 3;

export default function Home() {
  const [tab, setTab] = useState<Tab>('register');
  const [regStep, setRegStep] = useState<RegStep>(1);
  const [showPw, setShowPw] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [quarter, setQuarter] = useState('');
  const [phone, setPhone] = useState('');
  const [alertPref, setAlertPref] = useState('All missing persons cases near me');
  const [alertDelivery, setAlertDelivery] = useState('Push notifications + Email');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeGdpr, setAgreeGdpr] = useState(false);

  function checkStrength(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    setPwStrength(score);
  }

  function getSegColor(index: number): string {
    if (index >= pwStrength) return '#2C2825';
    if (pwStrength <= 1) return '#E03030';
    if (pwStrength <= 3) return '#E07830';
    return '#2ECC71';
  }

  function handleNext() {
    if (regStep === 1) {
      if (!firstName || !lastName || !email || !password) {
        alert('Please fill in all required fields.');
        return;
      }
      setRegStep(2);
    } else if (regStep === 2) {
      if (!country || !city) {
        alert('Please enter your country and city.');
        return;
      }
      setRegStep(3);
    }
  }

 async function handleRegister() {
  if (!agreeTerms || !agreeGdpr) {
    alert('Please agree to both terms to continue.');
    return;
  }
  setLoading(true);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name:  lastName,
      },
    },
  });

  if (error) {
    alert(error.message);
    setLoading(false);
    return;
  }

  // Now update the profile with the extra fields the trigger didn't have
  if (data.user) {
    await supabase
      .from('profiles')
      .update({
        phone,
        country,
        city,
        quarter,
        alert_pref:     alertPref,
        alert_delivery: alertDelivery,
      })
      .eq('id', data.user.id);
  }

  setLoading(false);
  setSuccess(true);
}

  async function handleLogin() {
  if (!email || !password) {
    alert('Please enter your email and password.');
    return;
  }
  setLoading(true);
 
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
 
  if (error) {
    alert(error.message);
    setLoading(false);
    return;
  }
 
  // Redirect to dashboard after successful login
  window.location.href = '/Dashboard';
}

  return (
    <main style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --red: #E03030;
          --red-dim: rgba(224,48,48,0.12);
          --red-glow: rgba(224,48,48,0.35);
          --ink: #0D0B0A;
          --surface: #141210;
          --card: #1C1917;
          --line: #2C2825;
          --muted: #7A6E68;
          --soft: #B5A89F;
          --white: #F5F0EC;
          --success: #2ECC71;
        }

        html, body { height: 100%; background: var(--ink); color: var(--white); overflow-x: hidden; }

        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }

        @keyframes ping {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          position: relative;
        }

        @media (max-width: 860px) {
          .page { grid-template-columns: 1fr; }
          .left-panel { display: none; }
        }

        /* BG */
        .bg {
          position: fixed; inset: 0; z-index: 0;
          background: var(--ink); overflow: hidden;
        }
        .bg::before {
          content: ''; position: absolute;
          width: 700px; height: 700px; border-radius: 50%;
          background: radial-gradient(circle, rgba(224,48,48,0.18) 0%, transparent 70%);
          top: -200px; right: -200px;
          animation: breathe 6s ease-in-out infinite;
        }
        .bg::after {
          content: ''; position: absolute;
          width: 500px; height: 500px; border-radius: 50%;
          background: radial-gradient(circle, rgba(224,48,48,0.08) 0%, transparent 70%);
          bottom: -100px; left: -100px;
          animation: breathe 8s ease-in-out infinite reverse;
        }
        .bg-grid {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
        }

        /* LEFT PANEL */
        .left-panel {
          display: flex; flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
          border-right: 1px solid var(--line);
          position: relative; overflow: hidden; z-index: 1;
        }
        .brand { display: flex; align-items: center; gap: 12px; }
        .brand-dot {
          width: 36px; height: 36px; background: var(--red);
          border-radius: 50%; position: relative; flex-shrink: 0;
        }
        .brand-dot::after {
          content: ''; position: absolute; inset: -6px;
          border-radius: 50%; border: 1.5px solid var(--red);
          opacity: 0.4; animation: ping 2s ease-out infinite;
        }
        .brand-name {
          font-family: 'Syne', sans-serif; font-size: 1.6rem;
          font-weight: 800; letter-spacing: -0.03em; color: var(--white);
        }
        .big-stat {
          font-family: 'Syne', sans-serif;
          font-size: clamp(3rem, 6vw, 5.5rem);
          font-weight: 800; line-height: 1;
          letter-spacing: -0.04em; color: var(--white);
          margin-bottom: 0.5rem;
        }
        .stat-label {
          font-size: 1rem; color: var(--muted);
          line-height: 1.6; max-width: 340px; margin-bottom: 3rem;
        }
        .feature-list { display: flex; flex-direction: column; gap: 16px; }
        .feature-item {
          display: flex; align-items: center; gap: 14px;
          opacity: 0; animation: slideIn 0.5s ease forwards;
        }
        .feature-item:nth-child(1) { animation-delay: 0.1s; }
        .feature-item:nth-child(2) { animation-delay: 0.2s; }
        .feature-item:nth-child(3) { animation-delay: 0.3s; }
        .feature-item:nth-child(4) { animation-delay: 0.4s; }
        .feature-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: var(--red-dim); border: 1px solid rgba(224,48,48,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .feature-text { font-size: 0.88rem; color: var(--soft); line-height: 1.4; }
        .feature-text strong { color: var(--white); font-weight: 600; display: block; }
        .ticker {
          border-top: 1px solid var(--line); padding-top: 1.5rem;
          font-size: 0.75rem; color: var(--muted);
          letter-spacing: 0.06em; text-transform: uppercase;
        }

        /* RIGHT PANEL */
        .right-panel {
          display: flex; align-items: center; justify-content: center;
          padding: 2rem; position: relative; z-index: 1;
        }
        .auth-card { width: 100%; max-width: 440px; }

        /* Tabs */
        .tab-bar {
          display: flex; background: var(--surface);
          border: 1px solid var(--line); border-radius: 14px;
          padding: 5px; margin-bottom: 2rem; gap: 4px;
        }
        .tab-btn {
          flex: 1; padding: 10px; border: none;
          background: transparent; color: var(--muted);
          font-family: 'Instrument Sans', sans-serif;
          font-size: 0.88rem; font-weight: 600;
          border-radius: 10px; cursor: pointer; transition: all 0.25s;
        }
        .tab-btn.active {
          background: var(--card); color: var(--white);
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }

        /* Step dots */
        .step-dots { display: flex; justify-content: center; gap: 6px; margin-bottom: 1.5rem; }
        .step-dot {
          height: 6px; border-radius: 3px;
          background: var(--line); transition: all 0.3s;
          width: 6px;
        }
        .step-dot.active { width: 24px; background: var(--red); }
        .step-dot.done { background: var(--success); width: 6px; }

        /* Fields */
        .card-title {
          font-family: 'Syne', sans-serif; font-size: 1.75rem;
          font-weight: 700; letter-spacing: -0.03em;
          margin-bottom: 0.3rem; color: var(--white);
        }
        .card-sub { font-size: 0.88rem; color: var(--muted); margin-bottom: 2rem; line-height: 1.5; }

        .field { margin-bottom: 1.1rem; }
        .field label {
          display: block; font-size: 0.73rem; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase;
          color: var(--soft); margin-bottom: 7px;
        }
        .field input, .field select {
          width: 100%; background: var(--surface);
          border: 1.5px solid var(--line); border-radius: 11px;
          padding: 13px 16px;
          font-family: 'Instrument Sans', sans-serif;
          font-size: 0.95rem; color: var(--white); outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; appearance: none;
        }
        .field input::placeholder { color: var(--muted); }
        .field input:focus, .field select:focus {
          border-color: var(--red); box-shadow: 0 0 0 3px var(--red-dim);
          background: var(--card);
        }
        .field select option { background: var(--card); }
        .field .hint { font-size: 0.73rem; color: var(--muted); margin-top: 5px; }
        .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        /* Password */
        .pw-wrap { position: relative; }
        .pw-wrap input { padding-right: 46px; }
        .pw-toggle {
          position: absolute; right: 14px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; color: var(--muted);
          cursor: pointer; padding: 4px; display: flex; align-items: center;
        }
        .pw-toggle:hover { color: var(--soft); }
        .strength-bar { display: flex; gap: 4px; margin-top: 8px; height: 3px; }
        .strength-seg { flex: 1; border-radius: 2px; transition: background 0.3s; }

        /* Location note */
        .location-note {
          background: var(--red-dim); border: 1px solid rgba(224,48,48,0.2);
          border-radius: 10px; padding: 12px 14px;
          font-size: 0.8rem; color: var(--soft); line-height: 1.5;
          margin-bottom: 1.1rem; display: flex; gap: 10px; align-items: flex-start;
        }

        /* Agree */
        .agree-row { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 1rem; }
        .agree-row input[type="checkbox"] {
          width: 18px; height: 18px; margin-top: 2px;
          accent-color: var(--red); flex-shrink: 0; cursor: pointer;
        }
        .agree-row label { font-size: 0.8rem; color: var(--muted); line-height: 1.5; cursor: pointer; }
        .agree-row label a { color: var(--red); text-decoration: none; }

        /* Buttons */
        .btn-submit {
          width: 100%; padding: 15px; background: var(--red);
          color: white; border: none; border-radius: 12px;
          font-family: 'Syne', sans-serif; font-size: 1rem; font-weight: 700;
          letter-spacing: 0.03em; cursor: pointer; transition: all 0.2s;
          margin-top: 0.5rem;
        }
        .btn-submit:hover:not(:disabled) {
          background: #C42828; transform: translateY(-1px);
          box-shadow: 0 6px 24px var(--red-glow);
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .step-nav { display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; gap: 10px; }
        .btn-back {
          padding: 12px 20px; background: transparent;
          border: 1.5px solid var(--line); border-radius: 11px;
          color: var(--muted); font-family: 'Instrument Sans', sans-serif;
          font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        .btn-back:hover { border-color: var(--muted); color: var(--white); }
        .btn-next {
          flex: 1; padding: 13px; background: var(--card);
          border: 1.5px solid var(--line); border-radius: 11px;
          color: var(--white); font-family: 'Syne', sans-serif;
          font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-next:hover { border-color: var(--red); color: var(--red); }

        /* Divider */
        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 1.25rem 0; color: var(--muted); font-size: 0.75rem;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; height: 1px; background: var(--line);
        }

        /* OAuth */
        .oauth-row { display: flex; gap: 10px; }
        .btn-oauth {
          flex: 1; padding: 11px; background: var(--surface);
          border: 1.5px solid var(--line); border-radius: 11px;
          color: var(--soft); font-family: 'Instrument Sans', sans-serif;
          font-size: 0.85rem; font-weight: 500; cursor: pointer;
          transition: all 0.2s; display: flex; align-items: center;
          justify-content: center; gap: 8px;
        }
        .btn-oauth:hover { border-color: var(--muted); color: var(--white); background: var(--card); }

        .forgot-link {
          display: block; text-align: right; font-size: 0.78rem;
          color: var(--muted); text-decoration: none;
          margin-top: -6px; margin-bottom: 1.2rem; transition: color 0.2s;
        }
        .forgot-link:hover { color: var(--red); }

        /* Success */
        .success-screen { text-align: center; padding: 2rem 0; animation: fadeUp 0.5s ease; }
        .success-ring {
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(46,204,113,0.12); border: 2px solid var(--success);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem; font-size: 1.8rem;
        }
        .success-screen h3 {
          font-family: 'Syne', sans-serif; font-size: 1.4rem;
          font-weight: 700; margin-bottom: 0.5rem;
        }
        .success-screen p { font-size: 0.88rem; color: var(--muted); line-height: 1.6; }

       .report-btn {
          position: fixed;
          top: 20px;
          right: 24px;
          z-index: 10;

          background: var(--red);
          color: white;
          padding: 10px 16px;
          border-radius: 999px;

          font-family: 'Syne', sans-serif;
          font-size: 0.85rem;
          font-weight: 700;
          letter-spacing: 0.04em;

          text-decoration: none;
          box-shadow: 0 4px 18px rgba(224,48,48,0.35);
          transition: all 0.2s ease;
        }

        .report-btn:hover {
          transform: translateY(-1px);
          background: #C42828;
          box-shadow: 0 6px 24px rgba(224,48,48,0.5);
        } 
          @keyframes pulseAlert {
          0% { box-shadow: 0 0 0 0 rgba(224,48,48,0.5); }
          70% { box-shadow: 0 0 0 10px rgba(224,48,48,0); }
          100% { box-shadow: 0 0 0 0 rgba(224,48,48,0); }
        }

        .report-btn {
          animation: pulseAlert 2.5s infinite;
        }
      `}</style>

      {/* 🚨 NEW BUTTON */}
      

      {/* Background */}
      <div className="bg">
        <div className="bg-grid" />
      </div>

      <div className="page">
        <Link href="/report" className="report-btn">
        Make a Signalement
      </Link>

        <Link href="/Dashboard" className="report-btn secondary">
        Dashboard public
      </Link>

        {/* LEFT PANEL */}
        <div className="left-panel">
          <div className="brand">
            <div className="brand-dot" />
            <span className="brand-name">
              Alert<span style={{ color: 'var(--red)' }}>Find</span>
            </span>
          </div>

          <div>
            <div className="big-stat">
              Every <span style={{ color: 'var(--red)' }}>72hrs</span>
            </div>
            <p className="stat-label">
              a missing person case goes cold. AlertFind keeps communities
              connected and informed — in real time.
            </p>
            <div className="feature-list">
              {[
                { icon: '📍', title: 'Location-Aware Alerts', desc: 'Only cases near you — no noise, no overload' },
                { icon: '🆘', title: 'Personal SOS System', desc: 'One tap to alert your close circle or call police' },
                { icon: '📸', title: 'Instant Evidence Capture', desc: 'Photo, video, audio — sent securely in seconds' },
                { icon: '🔐', title: 'Privacy by Design', desc: 'Your precise location is never shared with other users' },
              ].map((f) => (
                <div key={f.title} className="feature-item">
                  <div className="feature-icon">{f.icon}</div>
                  <div className="feature-text">
                    <strong>{f.title}</strong>
                    {f.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ticker">🔴 Live network · Community safety platform · Est. 2026</div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="auth-card">

            {success ? (
              <div className="success-screen">
                <div className="success-ring">✓</div>
                <h3>You&apos;re in the network</h3>
                <p>
                  Your account has been created. AlertFind is now watching your area.<br /><br />
                  <strong style={{ color: 'var(--white)' }}>Check your email</strong> to verify
                  your address, then you&apos;ll be taken to your dashboard.
                </p>
              </div>
            ) : (
              <>
                {/* Tab bar */}
                <div className="tab-bar">
                  {(['register', 'login'] as Tab[]).map((t, i) => (
                    <button
                      key={t}
                      className={`tab-btn${tab === t ? ' active' : ''}`}
                      onClick={() => { setTab(t); setRegStep(1); }}
                    >
                      {i === 0 ? 'Create Account' : 'Sign In'}
                    </button>
                  ))}
                </div>

                {/* REGISTER */}
                {tab === 'register' && (
                  <div style={{ animation: 'fadeUp 0.35s ease' }}>
                    {/* Step dots */}
                    <div className="step-dots">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className={`step-dot${regStep === n ? ' active' : regStep > n ? ' done' : ''}`}
                        />
                      ))}
                    </div>

                    {/* Step 1 */}
                    {regStep === 1 && (
                      <>
                        <h2 className="card-title">Create account</h2>
                        <p className="card-sub">Join the AlertFind network. It only takes 2 minutes.</p>

                        <div className="field-row">
                          <div className="field">
                            <label>First Name <span style={{ color: 'var(--red)' }}>*</span></label>
                            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Maria" />
                          </div>
                          <div className="field">
                            <label>Last Name <span style={{ color: 'var(--red)' }}>*</span></label>
                            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Müller" />
                          </div>
                        </div>

                        <div className="field">
                          <label>Email Address <span style={{ color: 'var(--red)' }}>*</span></label>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@example.com" />
                        </div>

                        <div className="field">
                          <label>Password <span style={{ color: 'var(--red)' }}>*</span></label>
                          <div className="pw-wrap">
                            <input
                              type={showPw ? 'text' : 'password'}
                              value={password}
                              onChange={e => { setPassword(e.target.value); checkStrength(e.target.value); }}
                              placeholder="Min. 8 characters"
                              style={{ paddingRight: '46px' }}
                            />
                            <button className="pw-toggle" type="button" onClick={() => setShowPw(!showPw)}>
                              {showPw ? '🙈' : '👁️'}
                            </button>
                          </div>
                          <div className="strength-bar">
                            {[1, 2, 3, 4].map((i) => (
                              <div key={i} className="strength-seg" style={{ background: getSegColor(i) }} />
                            ))}
                          </div>
                        </div>

                        <div className="step-nav">
                          <button className="btn-next" onClick={handleNext}>Continue →</button>
                        </div>
                      </>
                    )}

                    {/* Step 2 */}
                    {regStep === 2 && (
                      <>
                        <h2 className="card-title">Your area</h2>
                        <p className="card-sub">We use this to send you relevant alerts. No precise address needed.</p>

                        <div className="location-note">
                          <span>🔒</span>
                          <div>Your <strong>exact location is never shared</strong> with other users. We only use your town to match you with nearby cases.</div>
                        </div>

                        <div className="field">
                          <label>Country <span style={{ color: 'var(--red)' }}>*</span></label>
                          <select value={country} onChange={e => setCountry(e.target.value)}>
                            <option value="">— Select your country —</option>
                            {['Germany', 'France', 'United Kingdom', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Cameroon', 'Nigeria', 'South Africa', 'Other'].map(c => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </div>

                        <div className="field">
                          <label>City / Town <span style={{ color: 'var(--red)' }}>*</span></label>
                          <input value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. Nuremberg" />
                        </div>

                        <div className="field">
                          <label>Neighbourhood / Quarter (optional)</label>
                          <input value={quarter} onChange={e => setQuarter(e.target.value)} placeholder="e.g. Gostenhof, Maxfeld..." />
                          <p className="hint">Helps us send even more targeted alerts</p>
                        </div>

                        <div className="field">
                          <label>Phone Number (optional)</label>
                          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+49 911 000 0000" />
                          <p className="hint">Used only for SOS alerts to your close circle</p>
                        </div>

                        <div className="step-nav">
                          <button className="btn-back" onClick={() => setRegStep(1)}>← Back</button>
                          <button className="btn-next" onClick={handleNext}>Continue →</button>
                        </div>
                      </>
                    )}

                    {/* Step 3 */}
                    {regStep === 3 && (
                      <>
                        <h2 className="card-title">Almost done</h2>
                        <p className="card-sub">Choose your alert preferences and agree to our terms.</p>

                        <div className="field">
                          <label>I want alerts for</label>
                          <select value={alertPref} onChange={e => setAlertPref(e.target.value)}>
                            <option>All missing persons cases near me</option>
                            <option>Children and minors only</option>
                            <option>Urgent / high-risk cases only</option>
                            <option>All cases nationwide</option>
                          </select>
                        </div>

                        <div className="field">
                          <label>Alert delivery</label>
                          <select value={alertDelivery} onChange={e => setAlertDelivery(e.target.value)}>
                            <option>Push notifications + Email</option>
                            <option>Push notifications only</option>
                            <option>Email only</option>
                            <option>In-app only</option>
                          </select>
                        </div>

                        <div className="agree-row" style={{ marginTop: '1.2rem' }}>
                          <input type="checkbox" id="terms" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} />
                          <label htmlFor="terms">
                            I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>. I understand my location data is used only for alert routing and never shared with other users.
                          </label>
                        </div>

                        <div className="agree-row">
                          <input type="checkbox" id="gdpr" checked={agreeGdpr} onChange={e => setAgreeGdpr(e.target.checked)} />
                          <label htmlFor="gdpr">
                            I consent to AlertFind processing my data in accordance with GDPR for community safety alerts.
                          </label>
                        </div>

                        <div className="step-nav">
                          <button className="btn-back" onClick={() => setRegStep(2)}>← Back</button>
                          <button
                            className="btn-submit"
                            style={{ marginTop: 0 }}
                            onClick={handleRegister}
                            disabled={loading}
                          >
                            {loading ? 'Creating account…' : 'Create My Account'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* LOGIN */}
                {tab === 'login' && (
                  <div style={{ animation: 'fadeUp 0.35s ease' }}>
                    <h2 className="card-title">Welcome back</h2>
                    <p className="card-sub">Sign in to your AlertFind account to access your dashboard.</p>

                    <div className="field">
                      <label>Email Address</label>
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@example.com" />
                    </div>

                    <div className="field">
                      <label>Password</label>
                      <div className="pw-wrap">
                        <input
                          type={showPw ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Your password"
                          style={{ paddingRight: '46px' }}
                        />
                        <button className="pw-toggle" type="button" onClick={() => setShowPw(!showPw)}>
                          {showPw ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>

                    <a href="#" className="forgot-link">Forgot your password?</a>

                    <button className="btn-submit" onClick={handleLogin} disabled={loading}>
                      {loading ? 'Signing in…' : 'Sign In'}
                    </button>

                    <div className="divider">or continue with</div>

                    <div className="oauth-row">
                      <button className="btn-oauth">
                        <span>G</span> Google
                      </button>
                      <button className="btn-oauth">
                        <span>f</span> Facebook
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
