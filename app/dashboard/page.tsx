'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type FilterType = 'all' | 'children' | 'adults' | 'elderly' | 'urgent';
type ViewType   = 'grid' | 'list';
type Lang       = 'en' | 'fr';

interface Case {
  id: string;
  case_number: string;
  first_name: string;
  last_name: string;
  age: number | null;
  gender: string;
  last_seen_location: string;
  case_type: string;
  hair_color: string;
  eye_color: string;
  clothing: string;
  status: string;
  created_at: string;
  reporter_name: string;
  reporter_phone: string;
  last_seen_date: string;
  last_seen_time: string;
  description: string;
  photo_url: string | null;
}

function hoursAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
}
function timeAgo(dateStr: string): string {
  const h = hoursAgo(dateStr);
  if (h < 1)  return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function isUrgent(c: Case): boolean {
  return (
    c.case_type === 'Missing child' ||
    c.case_type === 'Suspected kidnapping / abduction' ||
    hoursAgo(c.created_at) <= 12
  );
}
function getInitials(first: string, last: string): string {
  return `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();
}
const COLORS = ['#E03030','#E07830','#1D9E75','#378ADD','#7F77DD','#D4537E','#0F6E56','#BA7517'];
function getColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return COLORS[Math.abs(hash) % COLORS.length];
}

// ─── Share message templates ───────────────────────────────────────────────
function buildMessage(c: Case, lang: Lang): string {
  const date = c.last_seen_date
    ? new Date(c.last_seen_date).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB')
    : '—';
  const contact = c.reporter_phone
    ? (lang === 'fr' ? `📞 Contactez: ${c.reporter_phone}` : `📞 Contact: ${c.reporter_phone}`)
    : (lang === 'fr' ? '📞 Contactez les autorités immédiatement.' : '📞 Contact authorities immediately.');

  if (lang === 'fr') return `🚨 ALERTE PERSONNE DISPARUE 🚨

Nom: ${c.first_name} ${c.last_name}
Âge: ${c.age ? `${c.age} ans` : 'Inconnu'}
Genre: ${c.gender || 'Non précisé'}
Vu(e) pour la dernière fois à: ${c.last_seen_location || 'Inconnu'}
Date: ${date}
Type: ${c.case_type || 'Disparition'}

${c.description || ''}

${contact}
Réf. dossier: ${c.case_number}

🙏 Merci de partager ce message. Chaque partage peut sauver une vie.`;

  return `🚨 MISSING PERSON ALERT 🚨

Name: ${c.first_name} ${c.last_name}
Age: ${c.age ? `${c.age} years old` : 'Unknown'}
Gender: ${c.gender || 'Not specified'}
Last seen: ${c.last_seen_location || 'Unknown'}
Date: ${date}
Case type: ${c.case_type || 'Missing'}

${c.description || ''}

${contact}
Case ref: ${c.case_number}

🙏 Please share this message. Every share could save a life.`;
}

// ─── Share Modal ───────────────────────────────────────────────────────────
function ShareModal({ c, onClose }: { c: Case; onClose: () => void }) {
  const [lang, setLang]               = useState<Lang>('en');
  const [copied, setCopied]           = useState(false);
  const [photoSaved, setPhotoSaved]   = useState(false);
  const [downloading, setDownloading] = useState(false);

  const message        = buildMessage(c, lang);
  const encodedMessage = encodeURIComponent(message);

  async function downloadPhoto() {
    if (!c.photo_url) return;
    setDownloading(true);
    try {
      const res  = await fetch(c.photo_url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `missing-${c.first_name}-${c.last_name}.jpg`.toLowerCase().replace(/\s+/g, '-');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPhotoSaved(true);
    } catch (e) {
      console.error('Download failed:', e);
    }
    setDownloading(false);
  }

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  }

  function shareFacebook() {
    // Facebook no longer supports pre-filled text via URL — copy first, user pastes
    copyMessage();
    window.open('https://www.facebook.com/', '_blank');
  }

  // Reset copied state when language changes
  useEffect(() => { setCopied(false); }, [lang]);

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="share-header">
          <span className="share-title">📢 Share This Case</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Language picker */}
        <div className="share-lang">
          <span className="share-lang-label">Message language:</span>
          <div className="lang-pills">
            <button className={`lang-pill${lang === 'en' ? ' active' : ''}`} onClick={() => setLang('en')}>
              🇬🇧 English
            </button>
            <button className={`lang-pill${lang === 'fr' ? ' active' : ''}`} onClick={() => setLang('fr')}>
              🇫🇷 Français
            </button>
          </div>
        </div>

        {/* Message preview */}
        <div className="share-preview">
          <pre className="share-pre">{message}</pre>
          <button className="share-copy-btn" onClick={copyMessage}>
            {copied ? '✅ Copied!' : '📋 Copy message'}
          </button>
        </div>

        {/* Step 1 — Download photo */}
        {c.photo_url && (
          <div className="share-step">
            <div className="share-step-label">
              <span className="step-num">1</span>
              <span>{lang === 'fr' ? 'Téléchargez la photo' : 'Download the photo'}</span>
            </div>
            <div className="share-step-body">
              <img src={c.photo_url} alt={`${c.first_name} ${c.last_name}`} className="share-thumb" />
              <button
                className={`share-dl-btn${photoSaved ? ' saved' : ''}`}
                onClick={downloadPhoto}
                disabled={downloading}
              >
                {downloading ? '⏳ Saving...' : photoSaved ? '✅ Photo saved!' : '⬇️ Download Photo'}
              </button>
            </div>
            {photoSaved && (
              <p className="share-hint">
                {lang === 'fr'
                  ? 'Photo enregistrée. Joignez-la à votre publication.'
                  : 'Photo saved to your device. Attach it when you post.'}
              </p>
            )}
          </div>
        )}

        {/* Step 2 — Share */}
        <div className="share-step">
          <div className="share-step-label">
            <span className="step-num">{c.photo_url ? '2' : '1'}</span>
            <span>{lang === 'fr' ? 'Partagez le message' : 'Share the message'}</span>
          </div>
          <div className="share-platforms">
            <button className="share-wa" onClick={shareWhatsApp}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.123 1.532 5.859L.057 23.428a.75.75 0 00.916.916l5.569-1.475A11.943 11.943 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.7-.498-5.27-1.453l-.378-.223-3.927 1.04 1.04-3.927-.223-.378A9.953 9.953 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
              </svg>
              WhatsApp
            </button>
            <button className="share-fb" onClick={shareFacebook}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>
          {lang === 'fr'
            ? <p className="share-fb-note">💡 Pour Facebook: le message est copié automatiquement. Collez-le dans votre publication et joignez la photo.</p>
            : <p className="share-fb-note">💡 For Facebook: the message is auto-copied. Paste it in your post and attach the downloaded photo.</p>
          }
        </div>

      </div>
    </div>
  );
}

function JoinGroupButton({ caseId }: { caseId: string }) {
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('case_groups')
      .select('id')
      .eq('case_id', caseId)
      .single()
      .then(({ data }) => setGroupId(data?.id ?? null));
  }, [caseId]);

  if (!groupId) return (
    <button className="btn-outline" disabled>💬 Join Case Group</button>
  );

  return (
    <a href={`/cases/${groupId}`} className="btn-outline"
      style={{ textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
      💬 Join Case Group
    </a>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function Dashboard() {
  const [cases,      setCases]      = useState<Case[]>([]);
  const [loadingDB,  setLoadingDB]  = useState(true);
  const [filter,     setFilter]     = useState<FilterType>('all');
  const [view,       setView]       = useState<ViewType>('grid');
  const [search,     setSearch]     = useState('');
  const [selected,   setSelected]   = useState<Case | null>(null);
  const [sharing,    setSharing]    = useState(false);        // ← new
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [userName,   setUserName]   = useState('ME');

  useEffect(() => { fetchCases(); fetchUser(); }, []);

  async function fetchCases() {
    setLoadingDB(true);
    const { data, error } = await supabase
      .from('reports').select('*').eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) console.error('Fetch error:', error.message);
    else setCases(data ?? []);
    setLoadingDB(false);
  }

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles').select('first_name, last_name').eq('id', user.id).single();
    if (profile) {
      setUserName(
        `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || 'ME'
      );
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  const filtered = cases
    .filter(c => {
      const matchSearch =
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (c.last_seen_location ?? '').toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;
      if (filter === 'all')      return true;
      if (filter === 'urgent')   return isUrgent(c);
      if (filter === 'children') return (c.age ?? 99) < 18;
      if (filter === 'elderly')  return (c.age ?? 0) >= 65;
      if (filter === 'adults')   return (c.age ?? 0) >= 18 && (c.age ?? 0) < 65;
      return true;
    })
    .sort((a, b) => {
      if (isUrgent(a) && !isUrgent(b)) return -1;
      if (!isUrgent(a) && isUrgent(b)) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const urgentCount = cases.filter(isUrgent).length;
  const newToday    = cases.filter(c => hoursAgo(c.created_at) <= 24).length;

  return (
    <main style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --red:#E03030;--red-dim:rgba(224,48,48,.12);--red-glow:rgba(224,48,48,.35);
          --ink:#0D0B0A;--surface:#141210;--card:#1C1917;--line:#2C2825;
          --muted:#7A6E68;--soft:#B5A89F;--white:#F5F0EC;--success:#2ECC71;
        }
        html,body{min-height:100%;background:var(--ink);color:var(--white);overflow-x:hidden}
        @keyframes breathe{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.7}}
        @keyframes ping{0%{transform:scale(1);opacity:.4}100%{transform:scale(1.8);opacity:0}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideRight{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseRing{0%{box-shadow:0 0 0 0 rgba(224,48,48,.5)}70%{box-shadow:0 0 0 8px rgba(224,48,48,0)}100%{box-shadow:0 0 0 0 rgba(224,48,48,0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

        .bg{position:fixed;inset:0;z-index:0;background:var(--ink);overflow:hidden}
        .bg::before{content:'';position:absolute;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,rgba(224,48,48,.18) 0%,transparent 70%);top:-200px;right:-200px;animation:breathe 6s ease-in-out infinite}
        .bg::after{content:'';position:absolute;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(224,48,48,.08) 0%,transparent 70%);bottom:-100px;left:-100px;animation:breathe 8s ease-in-out infinite reverse}
        .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at center,black 20%,transparent 80%)}

        .layout{position:relative;z-index:1;min-height:100vh;display:grid;grid-template-columns:240px 1fr;grid-template-rows:auto 1fr}
        @media(max-width:860px){.layout{grid-template-columns:1fr}.sidebar{display:none}.sidebar.open{display:flex;position:fixed;inset:0;z-index:100;width:260px;box-shadow:4px 0 24px rgba(0,0,0,.5)}}

        .topbar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid var(--line);background:rgba(13,11,10,.85);backdrop-filter:blur(12px);position:sticky;top:0;z-index:50}
        .topbar-left{display:flex;align-items:center;gap:1rem}
        .brand{display:flex;align-items:center;gap:10px;text-decoration:none}
        .brand-dot{width:28px;height:28px;background:var(--red);border-radius:50%;position:relative;flex-shrink:0}
        .brand-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:1.5px solid var(--red);opacity:.4;animation:ping 2s ease-out infinite}
        .brand-name{font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;letter-spacing:-.03em;color:var(--white)}
        .live-badge{display:flex;align-items:center;gap:5px;background:var(--red-dim);border:1px solid rgba(224,48,48,.25);border-radius:20px;padding:3px 10px;font-size:.65rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--red)}
        .live-dot{width:6px;height:6px;background:var(--red);border-radius:50%;animation:pulseRing 1.5s ease-out infinite}
        .topbar-right{display:flex;align-items:center;gap:.75rem}
        .sos-btn{padding:8px 18px;background:var(--red);color:white;border:none;border-radius:20px;font-family:'Syne',sans-serif;font-size:.78rem;font-weight:700;letter-spacing:.04em;cursor:pointer;transition:all .2s}
        .sos-btn:hover{background:#C42828;box-shadow:0 4px 16px var(--red-glow)}
        .icon-btn{width:36px;height:36px;border-radius:10px;background:var(--surface);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;font-size:1rem}
        .icon-btn:hover{border-color:var(--muted);background:var(--card)}
        .avatar-wrap{position:relative}
        .avatar{width:34px;height:34px;border-radius:50%;background:var(--red-dim);border:1.5px solid rgba(224,48,48,.3);display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:var(--red);cursor:pointer;font-family:'Syne',sans-serif}
        .avatar-menu{position:absolute;top:42px;right:0;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:.5rem;min-width:160px;z-index:200;animation:fadeUp .2s ease}
        .avatar-item{display:flex;align-items:center;gap:8px;padding:9px 12px;border-radius:8px;font-size:.82rem;color:var(--soft);cursor:pointer;transition:all .2s;text-decoration:none;white-space:nowrap}
        .avatar-item:hover{background:var(--surface);color:var(--white)}
        .avatar-item.danger{color:var(--red)}
        .hamburger{display:none;width:36px;height:36px;border-radius:10px;background:var(--surface);border:1px solid var(--line);align-items:center;justify-content:center;cursor:pointer;font-size:1rem;color:var(--white)}
        @media(max-width:860px){.hamburger{display:flex}}

        .sidebar{grid-row:2;display:flex;flex-direction:column;border-right:1px solid var(--line);padding:1.5rem 1rem;background:rgba(13,11,10,.9);backdrop-filter:blur(12px);gap:.25rem;overflow-y:auto}
        .sidebar-section{font-size:.62rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:.75rem .75rem .4rem}
        .nav-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;font-size:.85rem;font-weight:500;color:var(--muted);cursor:pointer;transition:all .2s;text-decoration:none;border:1px solid transparent}
        .nav-item:hover{background:var(--surface);color:var(--soft)}
        .nav-item.active{background:var(--red-dim);color:var(--white);border-color:rgba(224,48,48,.2)}
        .nav-icon{font-size:1rem;width:20px;text-align:center}
        .nav-badge{margin-left:auto;background:var(--red);color:white;font-size:.6rem;font-weight:700;padding:2px 6px;border-radius:10px;min-width:18px;text-align:center}
        .sidebar-sep{border:none;border-top:1px solid var(--line);margin:.75rem 0}

        .main{grid-row:2;padding:2rem 1.5rem;overflow-y:auto}

        .stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2rem}
        @media(max-width:700px){.stats-row{grid-template-columns:1fr 1fr}}
        .stat-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1.25rem;animation:fadeUp .4s ease}
        .stat-label{font-size:.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:.5rem}
        .stat-value{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:var(--white);line-height:1;letter-spacing:-.03em}
        .stat-value.red{color:var(--red)}.stat-value.green{color:var(--success)}
        .stat-sub{font-size:.72rem;color:var(--muted);margin-top:.25rem}

        .toolbar{display:flex;align-items:center;gap:.75rem;margin-bottom:1.5rem;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:200px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:.9rem;color:var(--muted);pointer-events:none}
        .search-input{width:100%;background:var(--surface);border:1.5px solid var(--line);border-radius:11px;padding:10px 14px 10px 36px;font-family:'Instrument Sans',sans-serif;font-size:.88rem;color:var(--white);outline:none;transition:border-color .2s,box-shadow .2s}
        .search-input::placeholder{color:var(--muted)}
        .search-input:focus{border-color:var(--red);box-shadow:0 0 0 3px var(--red-dim);background:var(--card)}
        .filter-group{display:flex;gap:6px;flex-wrap:wrap}
        .filter-btn{padding:8px 14px;background:var(--surface);border:1.5px solid var(--line);border-radius:20px;font-family:'Instrument Sans',sans-serif;font-size:.78rem;font-weight:600;color:var(--muted);cursor:pointer;transition:all .2s;white-space:nowrap}
        .filter-btn:hover{border-color:var(--muted);color:var(--soft)}
        .filter-btn.active{background:var(--red-dim);border-color:var(--red);color:var(--white)}
        .view-btns{display:flex;gap:4px}
        .view-btn{width:36px;height:36px;border-radius:9px;background:var(--surface);border:1.5px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.9rem;transition:all .2s;color:var(--muted)}
        .view-btn.active{background:var(--red-dim);border-color:var(--red);color:var(--white)}

        .section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
        .section-title{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:var(--white)}
        .section-count{font-size:.78rem;color:var(--muted)}

        .cases-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1rem}
        .cases-list{display:flex;flex-direction:column;gap:.75rem}

        .case-card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s;animation:fadeUp .4s ease;position:relative;overflow:hidden}
        .case-card:hover{border-color:var(--muted);background:var(--card);transform:translateY(-2px)}
        .case-card.urgent{border-color:rgba(224,48,48,.35)}
        .case-card.urgent::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--red)}
        .card-top{display:flex;align-items:flex-start;gap:.75rem;margin-bottom:.9rem}
        .case-avatar{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:.85rem;font-weight:800;color:white;flex-shrink:0}
        .card-info{flex:1;min-width:0}
        .case-name{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:var(--white);letter-spacing:-.02em;margin-bottom:.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .case-meta{font-size:.75rem;color:var(--muted)}
        .urgent-tag{background:var(--red);color:white;font-size:.6rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:3px 7px;border-radius:6px;white-space:nowrap;flex-shrink:0}
        .case-type-tag{display:inline-block;background:var(--card);border:1px solid var(--line);font-size:.7rem;color:var(--muted);padding:3px 8px;border-radius:6px;margin-bottom:.75rem}
        .case-detail-row{display:flex;gap:.5rem;align-items:flex-start;font-size:.78rem;color:var(--soft);margin-bottom:.4rem}
        .detail-icon-sm{color:var(--muted);flex-shrink:0;width:14px;text-align:center}
        .card-footer{display:flex;align-items:center;justify-content:space-between;margin-top:.9rem;padding-top:.75rem;border-top:1px solid var(--line)}
        .time-badge{font-size:.72rem;color:var(--muted)}
        .time-badge.recent{color:var(--red);font-weight:600}
        .card-action{padding:5px 12px;background:transparent;border:1px solid var(--line);border-radius:7px;font-family:'Instrument Sans',sans-serif;font-size:.72rem;font-weight:600;color:var(--soft);cursor:pointer;transition:all .2s}
        .card-action:hover{border-color:var(--red);color:var(--red)}

        .list-row{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:1rem 1.25rem;display:flex;align-items:center;gap:1rem;cursor:pointer;transition:all .2s}
        .list-row:hover{background:var(--card);border-color:var(--muted)}
        .list-row.urgent{border-left:3px solid var(--red)}
        .list-avatar{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:.75rem;font-weight:800;color:white;flex-shrink:0}
        .list-info{flex:1;min-width:0}
        .list-name{font-family:'Syne',sans-serif;font-size:.92rem;font-weight:700;color:var(--white);letter-spacing:-.02em}
        .list-sub{font-size:.75rem;color:var(--muted)}
        .list-right{text-align:right;flex-shrink:0}
        .list-time{font-size:.72rem;color:var(--muted)}
        .list-time.recent{color:var(--red);font-weight:600}

        .loading-wrap{display:flex;align-items:center;justify-content:center;padding:4rem;gap:1rem;color:var(--muted);font-size:.88rem}
        .spinner{width:24px;height:24px;border:2px solid var(--line);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
        .empty{text-align:center;padding:4rem 2rem;color:var(--muted);font-size:.88rem}
        .empty-icon{font-size:2.5rem;margin-bottom:1rem}
        .empty h3{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;color:var(--soft);margin-bottom:.5rem}
        .empty a{color:var(--red);text-decoration:none;font-weight:600}

        .detail-overlay{position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.7);backdrop-filter:blur(4px);display:flex;justify-content:flex-end}
        .detail-panel{width:100%;max-width:420px;height:100%;background:var(--surface);border-left:1px solid var(--line);overflow-y:auto;animation:slideRight .3s ease;display:flex;flex-direction:column}
        .detail-header{padding:1.25rem 1.5rem;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;background:var(--surface);z-index:10}
        .detail-header h3{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:var(--white)}
        .close-btn{width:32px;height:32px;border-radius:8px;background:var(--card);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;transition:all .2s;color:var(--white)}
        .close-btn:hover{border-color:var(--red)}
        .detail-body{padding:1.5rem;flex:1}
        .detail-avatar-wrap{display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem}
        .detail-avatar{width:64px;height:64px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;color:white;flex-shrink:0}
        .detail-name{font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;letter-spacing:-.03em;color:var(--white);margin-bottom:.25rem}
        .detail-id{font-size:.72rem;color:var(--muted);letter-spacing:.04em}
        .detail-sec{margin-bottom:1.25rem}
        .detail-sec-title{font-size:.65rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:.6rem}
        .detail-row{display:flex;gap:.75rem;margin-bottom:.5rem;font-size:.85rem}
        .dk{color:var(--muted);min-width:110px;flex-shrink:0;font-size:.8rem}
        .dv{color:var(--white);font-weight:500}
        .detail-sep{border:none;border-top:1px solid var(--line);margin:1.25rem 0}
        .detail-actions{padding:1.25rem 1.5rem;border-top:1px solid var(--line);display:flex;flex-direction:column;gap:.75rem}
        .btn-primary{width:100%;padding:13px;background:var(--red);color:white;border:none;border-radius:11px;font-family:'Syne',sans-serif;font-size:.9rem;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
        .btn-primary:hover{background:#C42828;box-shadow:0 4px 16px var(--red-glow)}
        .btn-secondary{width:100%;padding:11px;background:transparent;color:var(--soft);border:1.5px solid var(--line);border-radius:11px;font-family:'Instrument Sans',sans-serif;font-size:.88rem;font-weight:500;cursor:pointer;transition:all .2s}
        .btn-secondary:hover{border-color:var(--muted);color:var(--white)}
        .btn-outline{width:100%;padding:11px;background:var(--card);color:var(--soft);border:1.5px solid var(--line);border-radius:11px;font-family:'Instrument Sans',sans-serif;font-size:.88rem;font-weight:500;cursor:pointer;transition:all .2s}
        .btn-outline:hover{border-color:var(--red);color:var(--red)}

        .fab{position:fixed;bottom:2rem;right:2rem;z-index:90;padding:14px 22px;background:var(--red);color:white;border:none;border-radius:14px;font-family:'Syne',sans-serif;font-size:.9rem;font-weight:700;letter-spacing:.03em;cursor:pointer;transition:all .2s;box-shadow:0 4px 24px var(--red-glow);display:flex;align-items:center;gap:8px;text-decoration:none}
        .fab:hover{background:#C42828;transform:translateY(-2px);box-shadow:0 8px 32px var(--red-glow)}

        /* ── Share modal ── */
        .share-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);display:flex;align-items:flex-end;justify-content:center;padding:0}
        @media(min-width:600px){.share-overlay{align-items:center;padding:1rem}}
        .share-modal{background:var(--card);border:1px solid var(--line);border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;animation:slideUp .28s ease;display:flex;flex-direction:column;gap:1rem;padding:1.25rem}
        @media(min-width:600px){.share-modal{border-radius:20px}}
        .share-header{display:flex;align-items:center;justify-content:space-between}
        .share-title{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:var(--white)}
        .share-lang{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}
        .share-lang-label{font-size:.78rem;color:var(--muted)}
        .lang-pills{display:flex;gap:6px}
        .lang-pill{padding:5px 14px;border-radius:20px;border:1.5px solid var(--line);background:var(--surface);color:var(--muted);font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s}
        .lang-pill.active{background:var(--red-dim);border-color:var(--red);color:var(--white)}
        .share-preview{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:1rem}
        .share-pre{font-family:'Instrument Sans',sans-serif;font-size:.78rem;line-height:1.65;white-space:pre-wrap;color:var(--soft);margin-bottom:.75rem}
        .share-copy-btn{width:100%;padding:8px;background:var(--card);border:1.5px solid var(--line);border-radius:8px;font-size:.8rem;font-weight:600;color:var(--soft);cursor:pointer;transition:all .2s}
        .share-copy-btn:hover{border-color:var(--muted);color:var(--white)}
        .share-step{display:flex;flex-direction:column;gap:.6rem}
        .share-step-label{display:flex;align-items:center;gap:8px;font-size:.88rem;font-weight:600;color:var(--white)}
        .step-num{width:22px;height:22px;border-radius:50%;background:var(--red);color:white;font-size:.7rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .share-step-body{display:flex;align-items:center;gap:.75rem}
        .share-thumb{width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--line);flex-shrink:0}
        .share-dl-btn{flex:1;padding:10px;background:var(--surface);border:1.5px solid var(--line);border-radius:10px;font-size:.82rem;font-weight:600;color:var(--soft);cursor:pointer;transition:all .2s}
        .share-dl-btn:hover{border-color:var(--muted);color:var(--white)}
        .share-dl-btn.saved{border-color:#2ECC71;color:#2ECC71}
        .share-hint{font-size:.75rem;color:#2ECC71}
        .share-platforms{display:flex;flex-direction:column;gap:.5rem}
        .share-wa,.share-fb{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border:none;border-radius:11px;font-family:'Syne',sans-serif;font-size:.88rem;font-weight:700;cursor:pointer;transition:opacity .2s}
        .share-wa{background:#25D366;color:white}
        .share-fb{background:#1877F2;color:white}
        .share-wa:hover,.share-fb:hover{opacity:.88}
        .share-fb-note{font-size:.73rem;color:var(--muted);line-height:1.5}
      `}</style>

      <div className="bg"><div className="bg-grid" /></div>

      <div className="layout">

        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" onClick={() => setMenuOpen(o => !o)}>☰</button>
            <a href="/" className="brand">
              <div className="brand-dot" />
              <span className="brand-name">Alert<span style={{ color:'var(--red)' }}>Find</span></span>
            </a>
            <div className="live-badge"><div className="live-dot" />Live</div>
          </div>
          <div className="topbar-right">
            <button className="sos-btn">🆘 SOS</button>
            <div className="icon-btn">🔔</div>
            <div className="avatar-wrap">
              <div className="avatar" onClick={() => setAvatarOpen(o => !o)}>{userName}</div>
              {avatarOpen && (
                <div className="avatar-menu">
                  <a href="/profile"  className="avatar-item">⚙️ Settings</a>
                  <a href="/rewards"  className="avatar-item">🏅 My Rewards</a>
                  <div className="avatar-item danger" onClick={handleSignOut}>🚪 Sign Out</div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SIDEBAR */}
        <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
          <div className="sidebar-section">Navigation</div>
          <a href="/dashboard" className="nav-item active">
            <span className="nav-icon">🏠</span> Dashboard
            {urgentCount > 0 && <span className="nav-badge">{urgentCount}</span>}
          </a>
          <a href="/report"    className="nav-item"><span className="nav-icon">📋</span> Report Missing</a>
          <a href="/cases"     className="nav-item"><span className="nav-icon">🔍</span> Browse Cases</a>
          <a href="/solved"    className="nav-item"><span className="nav-icon">✅</span> Solved Cases</a>
          <hr className="sidebar-sep" />
          <div className="sidebar-section">Personal Safety</div>
          <a href="/sos"      className="nav-item"><span className="nav-icon">🆘</span> SOS & Panic Button</a>
          <a href="/circle"   className="nav-item"><span className="nav-icon">👥</span> Close Circle</a>
          <a href="/checkin"  className="nav-item"><span className="nav-icon">📍</span> Check-In System</a>
          <a href="/evidence" className="nav-item"><span className="nav-icon">📸</span> Evidence Capture</a>
          <hr className="sidebar-sep" />
          <div className="sidebar-section">Account</div>
          <a href="/rewards"  className="nav-item"><span className="nav-icon">🏅</span> My Rewards</a>
          <a href="/profile"  className="nav-item"><span className="nav-icon">⚙️</span> Settings</a>
        </aside>

        {/* MAIN */}
        <main className="main">
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-label">Active Cases</div>
              <div className="stat-value">{cases.length}</div>
              <div className="stat-sub">Total reported</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Urgent</div>
              <div className="stat-value red">{urgentCount}</div>
              <div className="stat-sub">Need attention now</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">New Today</div>
              <div className="stat-value">{newToday}</div>
              <div className="stat-sub">Last 24 hours</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Solved</div>
              <div className="stat-value green">0</div>
              <div className="stat-sub">This month</div>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                className="search-input"
                placeholder="Search by name or location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="filter-group">
              {(['all','urgent','children','adults','elderly'] as FilterType[]).map(f => (
                <button
                  key={f}
                  className={`filter-btn${filter === f ? ' active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'urgent' ? '🔴 Urgent' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <div className="view-btns">
              <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')}>⊞</button>
              <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>☰</button>
            </div>
          </div>

          <div className="section-header">
            <span className="section-title">
              {filter === 'all'      ? 'All Active Cases'  :
               filter === 'urgent'   ? '🔴 Urgent Cases'   :
               filter === 'children' ? 'Missing Children'  :
               filter === 'elderly'  ? 'Missing Elderly'   : 'Missing Adults'}
            </span>
            <span className="section-count">{filtered.length} case{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {loadingDB ? (
            <div className="loading-wrap"><div className="spinner" /> Loading cases...</div>
          ) : filtered.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">{cases.length === 0 ? '📋' : '🔍'}</div>
              <h3>{cases.length === 0 ? 'No cases reported yet' : 'No cases match your search'}</h3>
              <p>{cases.length === 0 ? <><a href="/report">Be the first to file a report →</a></> : 'Try adjusting your search or filter.'}</p>
            </div>
          ) : view === 'grid' ? (
            <div className="cases-grid">
              {filtered.map(c => {
                const urgent = isUrgent(c);
                const color  = getColor(c.id);
                const inits  = getInitials(c.first_name, c.last_name);
                return (
                  <div key={c.id} className={`case-card${urgent ? ' urgent' : ''}`} onClick={() => setSelected(c)}>
                    <div className="card-top">
                      <div className="case-avatar" style={{ background: color }}>{inits}</div>
                      <div className="card-info">
                        <div className="case-name">{c.first_name} {c.last_name}</div>
                        <div className="case-meta">{c.age ? `${c.age} yrs` : 'Age unknown'} · {c.gender || 'Unknown'}</div>
                      </div>
                      {urgent && <span className="urgent-tag">Urgent</span>}
                    </div>
                    <div className="case-type-tag">{c.case_type || 'Missing'}</div>
                    {c.last_seen_location && <div className="case-detail-row"><span className="detail-icon-sm">📍</span><span>{c.last_seen_location}</span></div>}
                    {c.clothing           && <div className="case-detail-row"><span className="detail-icon-sm">👕</span><span>{c.clothing}</span></div>}
                    <div className="card-footer">
                      <div className={`time-badge${hoursAgo(c.created_at) <= 12 ? ' recent' : ''}`}>{timeAgo(c.created_at)}</div>
                      <button className="card-action" onClick={e => { e.stopPropagation(); setSelected(c); }}>View →</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cases-list">
              {filtered.map(c => {
                const urgent = isUrgent(c);
                const color  = getColor(c.id);
                const inits  = getInitials(c.first_name, c.last_name);
                return (
                  <div key={c.id} className={`list-row${urgent ? ' urgent' : ''}`} onClick={() => setSelected(c)}>
                    <div className="list-avatar" style={{ background: color }}>{inits}</div>
                    <div className="list-info">
                      <div className="list-name">{c.first_name} {c.last_name}</div>
                      <div className="list-sub">{c.age ? `${c.age} yrs · ` : ''}{c.case_type || 'Missing'} · {c.last_seen_location || 'Location unknown'}</div>
                    </div>
                    {urgent && <span className="urgent-tag">Urgent</span>}
                    <div className="list-right">
                      <div className={`list-time${hoursAgo(c.created_at) <= 12 ? ' recent' : ''}`}>{timeAgo(c.created_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <a href="/report" className="fab">+ Report Missing Person</a>

      {/* DETAIL PANEL */}
      {selected && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <h3>Case Details</h3>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="detail-body">
              {selected.photo_url && (
                <img
                  src={selected.photo_url}
                  alt={`${selected.first_name} ${selected.last_name}`}
                  style={{ width:'100%', height:'200px', objectFit:'cover', borderRadius:'12px', marginBottom:'1.25rem', border:'1px solid var(--line)' }}
                />
              )}
              <div className="detail-avatar-wrap">
                <div className="detail-avatar" style={{ background: getColor(selected.id) }}>
                  {getInitials(selected.first_name, selected.last_name)}
                </div>
                <div>
                  <div className="detail-name">{selected.first_name} {selected.last_name}</div>
                  <div className="detail-id">{selected.case_number}</div>
                  {isUrgent(selected) && <span className="urgent-tag" style={{ marginTop:'6px', display:'inline-block' }}>Urgent</span>}
                </div>
              </div>

              <div className="detail-sec">
                <div className="detail-sec-title">Person Details</div>
                {selected.age        && <div className="detail-row"><span className="dk">Age</span><span className="dv">{selected.age} years old</span></div>}
                {selected.gender     && <div className="detail-row"><span className="dk">Gender</span><span className="dv">{selected.gender}</span></div>}
                {selected.hair_color && <div className="detail-row"><span className="dk">Hair</span><span className="dv">{selected.hair_color}</span></div>}
                {selected.eye_color  && <div className="detail-row"><span className="dk">Eyes</span><span className="dv">{selected.eye_color}</span></div>}
                {selected.clothing   && <div className="detail-row"><span className="dk">Clothing</span><span className="dv">{selected.clothing}</span></div>}
              </div>
              <hr className="detail-sep" />
              <div className="detail-sec">
                <div className="detail-sec-title">Disappearance</div>
                {selected.case_type          && <div className="detail-row"><span className="dk">Case Type</span><span className="dv">{selected.case_type}</span></div>}
                {selected.last_seen_location && <div className="detail-row"><span className="dk">Last Seen</span><span className="dv">{selected.last_seen_location}</span></div>}
                {selected.last_seen_date     && <div className="detail-row"><span className="dk">Date</span><span className="dv">{selected.last_seen_date}</span></div>}
                {selected.description        && <div className="detail-row"><span className="dk">Description</span><span className="dv">{selected.description}</span></div>}
                <div className="detail-row"><span className="dk">Reported</span><span className="dv">{timeAgo(selected.created_at)}</span></div>
              </div>
              <hr className="detail-sep" />
              <div className="detail-sec">
                <div className="detail-sec-title">Reporter Contact</div>
                {selected.reporter_name  && <div className="detail-row"><span className="dk">Name</span><span className="dv">{selected.reporter_name}</span></div>}
                {selected.reporter_phone && <div className="detail-row"><span className="dk">Phone</span><span className="dv">{selected.reporter_phone}</span></div>}
              </div>
            </div>

            {/* ── ACTIONS — share button now opens the modal ── */}
            <div className="detail-actions">
              <button className="btn-primary" onClick={() => setSharing(true)}>
                📢 Share This Case
              </button>
              <JoinGroupButton caseId={selected.id} />
              <button className="btn-secondary">📸 Submit Evidence</button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL — rendered on top of everything */}
      {sharing && selected && (
        <ShareModal c={selected} onClose={() => setSharing(false)} />
      )}
    </main>
  );
}