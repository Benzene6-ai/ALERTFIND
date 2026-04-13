'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

type ReportStep = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Person Details', 'Disappearance', 'Your Contact', 'Review'];

interface FormData {
  firstName: string; lastName: string; age: string; gender: string;
  dob: string; nationality: string; height: string; weight: string;
  hair: string; eyes: string; clothing: string; features: string;
  photoPreview: string;
  lastDate: string; lastTime: string; location: string;
  caseType: string; policeNotified: string; description: string;
  possibleLocations: string; alerts: string[];
  reporterName: string; relationship: string; phone: string;
  reporterEmail: string; altContact: string; notes: string;
}

export default function ReportPage() {
  const [step, setStep]       = useState<ReportStep>(1);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [caseId, setCaseId]   = useState('');
  const fileRef               = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    firstName:'', lastName:'', age:'', gender:'', dob:'', nationality:'',
    height:'', weight:'', hair:'', eyes:'', clothing:'', features:'', photoPreview:'',
    lastDate:'', lastTime:'', location:'', caseType:'', policeNotified:'',
    description:'', possibleLocations:'', alerts:[],
    reporterName:'', relationship:'', phone:'', reporterEmail:'', altContact:'', notes:'',
  });

  function set(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function toggleAlert(label: string) {
    setForm(f => ({
      ...f,
      alerts: f.alerts.includes(label)
        ? f.alerts.filter(a => a !== label)
        : [...f.alerts, label],
    }));
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('photoPreview', ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function next() {
    if (step === 1 && (!form.firstName || !form.lastName || !form.age)) {
      alert('Please fill in first name, last name and age.'); return;
    }
    if (step === 2 && (!form.lastDate || !form.location)) {
      alert('Please fill in date last seen and location.'); return;
    }
    if (step === 3 && (!form.reporterName || !form.phone)) {
      alert('Please fill in your name and phone number.'); return;
    }
    setStep(s => (s + 1) as ReportStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setStep(s => (s - 1) as ReportStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
  setLoading(true);
 
  // Generate a unique case number
  const caseNumber = 'AF-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);
 
  // Get the currently logged-in user
  const { data: { user } } = await supabase.auth.getUser();
 
  // Save the report to Supabase
  const { error } = await supabase
    .from('reports')
    .insert({
      case_number:        caseNumber,
      reporter_id:        user?.id ?? null,
      first_name:         form.firstName,
      last_name:          form.lastName,
      age:                form.age ? parseInt(form.age) : null,
      gender:             form.gender,
      dob:                form.dob || null,
      nationality:        form.nationality,
      height_cm:          form.height ? parseInt(form.height) : null,
      weight_kg:          form.weight ? parseInt(form.weight) : null,
      hair_color:         form.hair,
      eye_color:          form.eyes,
      clothing:           form.clothing,
      features:           form.features,
      last_seen_date:     form.lastDate || null,
      last_seen_time:     form.lastTime || null,
      last_seen_location: form.location,
      case_type:          form.caseType,
      police_notified:    form.policeNotified,
      description:        form.description,
      possible_locations: form.possibleLocations,
      alerts:             form.alerts,
      reporter_name:      form.reporterName,
      relationship:       form.relationship,
      reporter_phone:     form.phone,
      reporter_email:     form.reporterEmail,
      alt_contact:        form.altContact,
      notes:              form.notes,
      status:             'active',
    });
 
  if (error) {
    alert('Error submitting report: ' + error.message);
    setLoading(false);
    return;
  }
 
  setCaseId(caseNumber);
  setLoading(false);
  setSuccess(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

  function rv(label: string, val: string) {
    return val ? (
      <div style={{ display:'flex', gap:'1rem', marginBottom:'0.5rem', fontSize:'.88rem' }}>
        <span style={{ color:'var(--muted)', minWidth:'140px', flexShrink:0, fontSize:'.8rem' }}>{label}</span>
        <span style={{ color:'var(--white)', fontWeight:500 }}>{val}</span>
      </div>
    ) : null;
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

        html, body { min-height: 100%; background: var(--ink); color: var(--white); overflow-x: hidden; }

        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

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

        .page {
          position: relative; z-index: 1;
          min-height: 100vh;
          display: flex; flex-direction: column; align-items: center;
          padding: 0 1.5rem 5rem;
        }

        .header {
          width: 100%; max-width: 780px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem 0 0; margin-bottom: 2rem;
        }
        .brand { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .brand-dot {
          width: 32px; height: 32px; background: var(--red);
          border-radius: 50%; position: relative; flex-shrink: 0;
        }
        .brand-dot::after {
          content: ''; position: absolute; inset: -5px;
          border-radius: 50%; border: 1.5px solid var(--red);
          opacity: 0.4; animation: ping 2s ease-out infinite;
        }
        .brand-name {
          font-family: 'Syne', sans-serif; font-size: 1.4rem;
          font-weight: 800; letter-spacing: -0.03em; color: var(--white);
        }
        .header-badge {
          background: var(--red); color: white; font-size: 0.65rem;
          font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 4px 10px; border-radius: 20px;
        }

        .banner {
          width: 100%; max-width: 780px;
          background: var(--red-dim); border: 1px solid rgba(224,48,48,0.25);
          border-radius: 11px; padding: 0.75rem 1.25rem;
          font-size: 0.82rem; color: var(--soft); line-height: 1.5;
          display: flex; align-items: center; gap: 10px; margin-bottom: 2rem;
        }
        .banner strong { color: var(--red); font-weight: 700; }

        .inner { width: 100%; max-width: 780px; }

        .page-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 800; letter-spacing: -0.04em;
          color: var(--white); margin-bottom: 0.4rem; line-height: 1.1;
        }
        .page-title span { color: var(--red); }
        .page-desc {
          font-size: 0.88rem; color: var(--muted);
          line-height: 1.6; margin-bottom: 2rem; max-width: 520px;
        }

        .step-bar { display: flex; align-items: center; margin-bottom: 2rem; }
        .step-item { display: flex; align-items: center; gap: 8px; }
        .step-num {
          width: 30px; height: 30px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700;
          border: 2px solid var(--line); background: var(--ink); color: var(--muted);
          transition: all 0.3s; flex-shrink: 0;
        }
        .step-item.active .step-num { background: var(--red); border-color: var(--red); color: white; }
        .step-item.done .step-num   { background: var(--success); border-color: var(--success); color: white; }
        .step-label {
          font-size: 0.72rem; font-weight: 600; color: var(--muted);
          white-space: nowrap; letter-spacing: 0.02em;
        }
        .step-item.active .step-label,
        .step-item.done .step-label { color: var(--soft); }
        .step-conn { flex: 1; height: 2px; background: var(--line); margin: 0 8px; min-width: 16px; transition: background 0.3s; }
        .step-conn.done { background: var(--success); }
        @media (max-width: 560px) { .step-label { display: none; } .step-conn { min-width: 8px; } }

        /* CARD — same as auth card */
        .card {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 16px;
          padding: 2rem;
          animation: fadeUp 0.4s ease;
        }

        .section-title {
          font-family: 'Syne', sans-serif; font-size: 1.4rem;
          font-weight: 700; letter-spacing: -0.03em;
          color: var(--white); margin-bottom: 0.25rem;
        }
        .section-desc { font-size: 0.88rem; color: var(--muted); margin-bottom: 1.75rem; line-height: 1.5; }

        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .span2 { grid-column: span 2; }
        @media (max-width: 560px) {
          .form-grid { grid-template-columns: 1fr; }
          .span2 { grid-column: span 1; }
        }

        /* FIELDS — identical to page.tsx */
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label {
          display: block; font-size: 0.73rem; font-weight: 600;
          letter-spacing: 0.07em; text-transform: uppercase; color: var(--soft);
        }
        .field label .req { color: var(--red); margin-left: 2px; }
        .field input, .field select, .field textarea {
          width: 100%; background: var(--surface);
          border: 1.5px solid var(--line); border-radius: 11px;
          padding: 13px 16px; font-family: 'Instrument Sans', sans-serif;
          font-size: 0.95rem; color: var(--white); outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; appearance: none;
        }
        .field input::placeholder, .field textarea::placeholder { color: var(--muted); }
        .field input:focus, .field select:focus, .field textarea:focus {
          border-color: var(--red); box-shadow: 0 0 0 3px var(--red-dim);
          background: var(--card);
        }
        .field select option { background: var(--card); }
        .field textarea { resize: vertical; min-height: 88px; }
        .field .hint { font-size: 0.73rem; color: var(--muted); }

        .sep { border: none; border-top: 1px solid var(--line); margin: 0.5rem 0; grid-column: span 2; }
        @media (max-width: 560px) { .sep { grid-column: span 1; } }

        .upload-zone {
          border: 2px dashed var(--line); border-radius: 11px; padding: 1.5rem;
          text-align: center; cursor: pointer;
          transition: border-color 0.2s, background 0.2s; position: relative; overflow: hidden;
        }
        .upload-zone:hover { border-color: var(--red); background: var(--red-dim); }
        .upload-icon {
          width: 40px; height: 40px; background: var(--red-dim); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 0.75rem; font-size: 1.1rem;
        }
        .upload-zone p { font-size: 0.82rem; color: var(--muted); line-height: 1.5; }
        .upload-zone p strong { color: var(--soft); font-weight: 600; }
        .photo-preview { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem; }
        .photo-preview img { width: 68px; height: 68px; object-fit: cover; border-radius: 10px; border: 2px solid var(--line); }

        .chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip {
          display: flex; align-items: center; gap: 6px;
          background: var(--surface); border: 1.5px solid var(--line);
          border-radius: 8px; padding: 7px 12px; cursor: pointer;
          font-size: 0.8rem; font-weight: 500; color: var(--soft);
          transition: all 0.2s; user-select: none;
          font-family: 'Instrument Sans', sans-serif;
        }
        .chip.on { background: var(--red-dim); border-color: var(--red); color: var(--white); }

        .note-box {
          background: var(--red-dim); border: 1px solid rgba(224,48,48,0.2);
          border-radius: 10px; padding: 12px 14px; font-size: 0.8rem;
          color: var(--soft); line-height: 1.5; margin-bottom: 1.25rem;
          display: flex; gap: 10px; align-items: flex-start;
        }

        .review-block {
          background: var(--card); border: 1px solid var(--line);
          border-radius: 11px; padding: 1.25rem; margin-bottom: 1rem;
        }
        .review-block h4 {
          font-size: 0.68rem; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--muted); margin-bottom: 0.9rem;
        }

        .btn-row {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 1.75rem; gap: 1rem;
        }
        .req-note { font-size: 0.72rem; color: var(--muted); }
        .req-note span { color: var(--red); }

        /* BUTTONS — same class names as page.tsx */
        .btn-submit {
          padding: 13px 28px; background: var(--red);
          color: white; border: none; border-radius: 12px;
          font-family: 'Syne', sans-serif; font-size: 0.95rem; font-weight: 700;
          letter-spacing: 0.03em; cursor: pointer; transition: all 0.2s;
          display: flex; align-items: center; gap: 8px;
        }
        .btn-submit:hover:not(:disabled) {
          background: #C42828; transform: translateY(-1px);
          box-shadow: 0 6px 24px var(--red-glow);
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-next {
          flex: 1; padding: 13px; background: var(--card);
          border: 1.5px solid var(--line); border-radius: 11px;
          color: var(--white); font-family: 'Syne', sans-serif;
          font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: all 0.2s;
        }
        .btn-next:hover { border-color: var(--red); color: var(--red); }

        .btn-back {
          padding: 12px 20px; background: transparent;
          border: 1.5px solid var(--line); border-radius: 11px;
          color: var(--muted); font-family: 'Instrument Sans', sans-serif;
          font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
        }
        .btn-back:hover { border-color: var(--muted); color: var(--white); }

        .success-screen { text-align: center; padding: 2.5rem 1rem; animation: fadeUp 0.5s ease; }
        .success-ring {
          width: 72px; height: 72px; border-radius: 50%;
          background: rgba(46,204,113,0.12); border: 2px solid var(--success);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1.25rem; font-size: 1.8rem;
        }
        .success-screen h3 {
          font-family: 'Syne', sans-serif; font-size: 1.75rem;
          font-weight: 700; letter-spacing: -0.03em; margin-bottom: 0.5rem;
        }
        .success-screen p { font-size: 0.88rem; color: var(--muted); line-height: 1.6; max-width: 400px; margin: 0 auto 1.5rem; }
        .case-id-box {
          display: inline-block; background: var(--card);
          border: 1px solid var(--line); border-radius: 12px;
          padding: 1rem 2rem; margin-bottom: 1.5rem;
        }
        .case-id-box small {
          display: block; font-size: 0.65rem; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--muted); margin-bottom: 0.25rem;
        }
        .case-id-box span {
          font-family: 'Syne', sans-serif; font-size: 1.4rem;
          font-weight: 800; color: var(--white); letter-spacing: 0.06em;
        }
      `}</style>

      {/* BACKGROUND — exact copy from page.tsx */}
      <div className="bg">
        <div className="bg-grid" />
      </div>

      <div className="page">

        <header className="header">
          <a href="/" className="brand">
            <div className="brand-dot" />
            <span className="brand-name">
              Alert<span style={{ color: 'var(--red)' }}>Find</span>
            </span>
          </a>
          <span className="header-badge">🔴 Live System</span>
        </header>

        <div className="banner">
          <span>⚠️</span>
          <span>
            <strong>Emergency?</strong> Call <strong>110</strong> (Police) or{' '}
            <strong>112</strong> immediately — then file this report.
          </span>
        </div>

        <div className="inner">

          {success ? (
            <div className="card">
              <div className="success-screen">
                <div className="success-ring">✓</div>
                <h3>Report Submitted</h3>
                <p>
                  Your missing person report has been received and alert networks
                  have been notified. Please keep your phone accessible for follow-up.
                </p>
                <div className="case-id-box">
                  <small>Case Reference Number</small>
                  <span>{caseId}</span>
                </div>
                <br />
                <button
                  className="btn-submit"
                  style={{ margin: '0 auto' }}
                  onClick={() => { setSuccess(false); setStep(1); }}
                >
                  Submit Another Report
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="page-title">
                Report a <span>Missing</span> Person
              </h1>
              <p className="page-desc">
                Fill in as much detail as possible — every piece of information helps.
                Your report is secure and shared only with relevant authorities.
              </p>

              {/* STEP BAR */}
              <div className="step-bar">
                {STEP_LABELS.map((label, i) => {
                  const n = i + 1;
                  const isActive = step === n;
                  const isDone   = step > n;
                  return (
                    <div key={n} style={{ display:'flex', alignItems:'center', flex: i < STEP_LABELS.length - 1 ? 1 : undefined }}>
                      <div className={`step-item${isActive ? ' active' : isDone ? ' done' : ''}`}>
                        <div className="step-num">{isDone ? '✓' : n}</div>
                        <span className="step-label">{label}</span>
                      </div>
                      {i < STEP_LABELS.length - 1 && (
                        <div className={`step-conn${isDone ? ' done' : ''}`} style={{ flex:1 }} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="card">

                {/* STEP 1 */}
                {step === 1 && (
                  <>
                    <h2 className="section-title">About the Missing Person</h2>
                    <p className="section-desc">Provide as much detail as you can about the person&apos;s physical appearance.</p>
                    <div className="form-grid">
                      <div className="field">
                        <label>First Name <span className="req">*</span></label>
                        <input value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="e.g. Maria" />
                      </div>
                      <div className="field">
                        <label>Last Name <span className="req">*</span></label>
                        <input value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="e.g. Müller" />
                      </div>
                      <div className="field">
                        <label>Age (approx.) <span className="req">*</span></label>
                        <input type="number" value={form.age} onChange={e => set('age', e.target.value)} placeholder="e.g. 34" min="0" max="120" />
                      </div>
                      <div className="field">
                        <label>Date of Birth</label>
                        <input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Gender</label>
                        <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                          <option value="">— Select —</option>
                          <option>Female</option><option>Male</option>
                          <option>Non-binary</option><option>Prefer not to say</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Nationality</label>
                        <input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="e.g. German" />
                      </div>
                      <div className="field">
                        <label>Height (cm)</label>
                        <input type="number" value={form.height} onChange={e => set('height', e.target.value)} placeholder="e.g. 165" />
                      </div>
                      <div className="field">
                        <label>Weight (kg)</label>
                        <input type="number" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="e.g. 60" />
                      </div>
                      <div className="field">
                        <label>Hair Color</label>
                        <select value={form.hair} onChange={e => set('hair', e.target.value)}>
                          <option value="">— Select —</option>
                          <option>Black</option><option>Brown</option><option>Blonde</option>
                          <option>Red / Auburn</option><option>Grey / White</option><option>Other</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Eye Color</label>
                        <select value={form.eyes} onChange={e => set('eyes', e.target.value)}>
                          <option value="">— Select —</option>
                          <option>Brown</option><option>Blue</option><option>Green</option>
                          <option>Hazel</option><option>Grey</option><option>Other</option>
                        </select>
                      </div>
                      <div className="field span2">
                        <label>Last Known Clothing</label>
                        <input value={form.clothing} onChange={e => set('clothing', e.target.value)} placeholder="e.g. Blue jeans, red hoodie, white sneakers" />
                      </div>
                      <div className="field span2">
                        <label>Distinguishing Features</label>
                        <textarea value={form.features} onChange={e => set('features', e.target.value)} placeholder="Tattoos, scars, birthmarks, disabilities, glasses..." />
                      </div>
                      <hr className="sep" />
                      <div className="field span2">
                        <label>Photo of Missing Person</label>
                        <div className="upload-zone" onClick={() => fileRef.current?.click()}>
                          <input
                            ref={fileRef} type="file" accept="image/*" onChange={handlePhoto}
                            style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }}
                          />
                          <div className="upload-icon">📷</div>
                          <p><strong>Click to upload a photo</strong><br />JPG, PNG or GIF · Max 5MB · Most recent photo preferred</p>
                        </div>
                        {form.photoPreview && (
                          <div className="photo-preview">
                            <img src={form.photoPreview} alt="Preview" />
                            <div>
                              <div style={{ fontSize:'.82rem', color:'var(--soft)', marginBottom:'.25rem' }}>Photo ready</div>
                              <button
                                onClick={() => set('photoPreview', '')}
                                style={{ background:'none', border:'none', color:'var(--red)', fontSize:'.75rem', cursor:'pointer', padding:0, fontFamily:"'Instrument Sans', sans-serif" }}
                              >Remove</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="btn-row">
                      <span className="req-note"><span>*</span> Required fields</span>
                      <button className="btn-next" onClick={next}>Continue →</button>
                    </div>
                  </>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                  <>
                    <h2 className="section-title">Circumstances of Disappearance</h2>
                    <p className="section-desc">When and where was this person last seen, and what happened?</p>
                    <div className="note-box">
                      <span>⚠️</span>
                      <div>If the disappearance was just witnessed, <strong style={{ color:'var(--white)' }}>call 110 immediately</strong> before completing this form.</div>
                    </div>
                    <div className="form-grid">
                      <div className="field">
                        <label>Date Last Seen <span className="req">*</span></label>
                        <input type="date" value={form.lastDate} onChange={e => set('lastDate', e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Time Last Seen (approx.)</label>
                        <input type="time" value={form.lastTime} onChange={e => set('lastTime', e.target.value)} />
                      </div>
                      <div className="field span2">
                        <label>Last Known Location <span className="req">*</span></label>
                        <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Hauptmarkt, Nuremberg, Bavaria" />
                        <span className="hint">Be as specific as possible — street, landmark, city</span>
                      </div>
                      <div className="field">
                        <label>Case Type</label>
                        <select value={form.caseType} onChange={e => set('caseType', e.target.value)}>
                          <option value="">— Select —</option>
                          <option>Missing (unknown circumstances)</option>
                          <option>Suspected kidnapping / abduction</option>
                          <option>Runaway</option>
                          <option>Missing child</option>
                          <option>Missing elderly person</option>
                          <option>Missing vulnerable adult</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Reported to Police?</label>
                        <select value={form.policeNotified} onChange={e => set('policeNotified', e.target.value)}>
                          <option value="">— Select —</option>
                          <option>Yes — report filed</option>
                          <option>Yes — verbal report only</option>
                          <option>No — not yet</option>
                          <option>Not sure</option>
                        </select>
                      </div>
                      <div className="field span2">
                        <label>Description of Events</label>
                        <textarea value={form.description} onChange={e => set('description', e.target.value)}
                          placeholder="What happened, any unusual behaviour before disappearance, suspicious individuals or vehicles..."
                          style={{ minHeight:'100px' }} />
                      </div>
                      <div className="field span2">
                        <label>Possible Locations / Destinations</label>
                        <input value={form.possibleLocations} onChange={e => set('possibleLocations', e.target.value)}
                          placeholder="Places they may have gone, friends' addresses, favourite spots..." />
                      </div>
                      <div className="field span2">
                        <label>Alert Networks to Notify</label>
                        <div className="chip-group">
                          {['🚔 Police Alert','📡 Amber Alert (children)','🏥 Hospitals Nearby','🤝 Volunteer Network','📱 Social Media'].map(a => (
                            <div key={a} className={`chip${form.alerts.includes(a) ? ' on' : ''}`} onClick={() => toggleAlert(a)}>{a}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="btn-row">
                      <button className="btn-back" onClick={back}>← Back</button>
                      <button className="btn-next" onClick={next}>Continue →</button>
                    </div>
                  </>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                  <>
                    <h2 className="section-title">Your Contact Information</h2>
                    <p className="section-desc">We&apos;ll use this to keep you updated. Your details are kept strictly confidential.</p>
                    <div className="form-grid">
                      <div className="field">
                        <label>Your Name <span className="req">*</span></label>
                        <input value={form.reporterName} onChange={e => set('reporterName', e.target.value)} placeholder="Your full name" />
                      </div>
                      <div className="field">
                        <label>Relationship to Missing Person</label>
                        <select value={form.relationship} onChange={e => set('relationship', e.target.value)}>
                          <option value="">— Select —</option>
                          <option>Parent</option><option>Spouse / Partner</option>
                          <option>Child (adult)</option><option>Sibling</option>
                          <option>Friend</option><option>Colleague</option>
                          <option>Neighbour</option><option>Witness</option><option>Other</option>
                        </select>
                      </div>
                      <div className="field">
                        <label>Phone Number <span className="req">*</span></label>
                        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+49 911 000 0000" />
                      </div>
                      <div className="field">
                        <label>Email Address</label>
                        <input type="email" value={form.reporterEmail} onChange={e => set('reporterEmail', e.target.value)} placeholder="your@email.com" />
                      </div>
                      <div className="field span2">
                        <label>Alternative Contact</label>
                        <input value={form.altContact} onChange={e => set('altContact', e.target.value)} placeholder="Another person to contact (name + phone)" />
                      </div>
                      <div className="field span2">
                        <label>Additional Notes for Investigators</label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                          placeholder="Medical conditions, medications, mental health concerns, known threats, anything else relevant..." />
                      </div>
                    </div>
                    <div className="btn-row">
                      <button className="btn-back" onClick={back}>← Back</button>
                      <button className="btn-next" onClick={next}>Review Report →</button>
                    </div>
                  </>
                )}

                {/* STEP 4 */}
                {step === 4 && (
                  <>
                    <h2 className="section-title">Review Your Report</h2>
                    <p className="section-desc">Please check all details before submitting. Once submitted, a case number will be assigned and alerts dispatched.</p>
                    <div className="review-block">
                      <h4>🧑 Missing Person</h4>
                      {rv('Full Name', `${form.firstName} ${form.lastName}`)}
                      {rv('Age', form.age)}
                      {rv('Gender', form.gender)}
                      {rv('Hair / Eyes', [form.hair && form.hair+' hair', form.eyes && form.eyes+' eyes'].filter(Boolean).join(', '))}
                      {rv('Height / Weight', [form.height && form.height+' cm', form.weight && form.weight+' kg'].filter(Boolean).join(' / '))}
                      {rv('Clothing', form.clothing)}
                      {rv('Distinguishing Features', form.features)}
                    </div>
                    <div className="review-block">
                      <h4>📍 Disappearance Details</h4>
                      {rv('Last Seen', [form.lastDate, form.lastTime && 'at '+form.lastTime].filter(Boolean).join(' '))}
                      {rv('Location', form.location)}
                      {rv('Case Type', form.caseType)}
                      {rv('Police Notified', form.policeNotified)}
                      {rv('Alert Networks', form.alerts.join(', '))}
                      {rv('Description', form.description)}
                    </div>
                    <div className="review-block">
                      <h4>📞 Reporter</h4>
                      {rv('Name', form.reporterName)}
                      {rv('Relationship', form.relationship)}
                      {rv('Phone', form.phone)}
                      {rv('Email', form.reporterEmail)}
                    </div>
                    <div className="btn-row">
                      <button className="btn-back" onClick={back}>← Back</button>
                      <button className="btn-submit" onClick={submit} disabled={loading}>
                        {loading ? 'Submitting…' : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                              <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                            </svg>
                            Submit Report
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}

              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}