'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Case {
  id: string; case_number: string; first_name: string; last_name: string;
  age: number | null; gender: string; last_seen_location: string;
  case_type: string; status: string; created_at: string;
  photo_url: string | null; description: string;
  case_groups: { id: string }[] | { id: string } | null;
}

const COLORS = ['#E03030','#E07830','#1D9E75','#378ADD','#7F77DD','#D4537E','#0F6E56','#BA7517'];
function getColor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}
function getInitials(f: string, l: string) { return `${f?.[0]??''}${l?.[0]??''}`.toUpperCase(); }
function timeAgo(d: string) {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3600000);
  return h < 1 ? 'Just now' : h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

export default function CasesPage() {
  const [cases, setCases]   = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');


  /*async function fetchCases() {
    const { data } = await supabase
      .from('reports')
      .select('*, case_groups(id)')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setCases(data ?? []);
    setLoading(false);
  }*/
 async function fetchCases() {
  const { data } = await supabase
    .from('reports')
    .select(`
      *,
      case_groups ( id )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  setCases(data ?? []);
  setLoading(false);
}
useEffect(() => { fetchCases(); }, []);

  const filtered = cases.filter(c => {
    const s = `${c.first_name} ${c.last_name} ${c.last_seen_location}`.toLowerCase();
    if (!s.includes(search.toLowerCase())) return false;
    if (filter === 'children') return (c.age ?? 99) < 18;
    if (filter === 'elderly')  return (c.age ?? 0) >= 65;
    if (filter === 'adults')   return (c.age ?? 0) >= 18 && (c.age ?? 0) < 65;
    return true;
  });

  return (
    <main style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--red:#E03030;--red-dim:rgba(224,48,48,.12);--red-glow:rgba(224,48,48,.35);--ink:#0D0B0A;--surface:#141210;--card:#1C1917;--line:#2C2825;--muted:#7A6E68;--soft:#B5A89F;--white:#F5F0EC;--success:#2ECC71;}
        html,body{min-height:100%;background:var(--ink);color:var(--white);overflow-x:hidden}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        @keyframes ping{0%{transform:scale(1);opacity:.4}100%{transform:scale(1.8);opacity:0}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .bg{position:fixed;inset:0;z-index:0;background:var(--ink);overflow:hidden}
        .bg::before{content:'';position:absolute;width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(224,48,48,.15) 0%,transparent 70%);top:-150px;right:-150px;animation:breathe 6s ease-in-out infinite}
        .bg-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at center,black 20%,transparent 80%)}
        .page{position:relative;z-index:1;min-height:100vh;max-width:1100px;margin:0 auto;padding:2rem 1.5rem 4rem}
        .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:2.5rem}
        .brand{display:flex;align-items:center;gap:10px;text-decoration:none}
        .brand-dot{width:28px;height:28px;background:var(--red);border-radius:50%;position:relative}
        .brand-dot::after{content:'';position:absolute;inset:-4px;border-radius:50%;border:1.5px solid var(--red);opacity:.4;animation:ping 2s ease-out infinite}
        .brand-name{font-family:'Syne',sans-serif;font-size:1.2rem;font-weight:800;letter-spacing:-.03em;color:var(--white)}
        .back-btn{display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--surface);border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:.82rem;font-weight:500;text-decoration:none;transition:all .2s}
        .back-btn:hover{border-color:var(--muted);color:var(--white)}
        .page-title{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;letter-spacing:-.04em;margin-bottom:.4rem}
        .page-title span{color:var(--red)}
        .page-desc{font-size:.88rem;color:var(--muted);margin-bottom:2rem}
        .toolbar{display:flex;gap:.75rem;margin-bottom:1.5rem;flex-wrap:wrap}
        .search-wrap{flex:1;min-width:200px;position:relative}
        .search-icon{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted);pointer-events:none}
        .search-input{width:100%;background:var(--surface);border:1.5px solid var(--line);border-radius:11px;padding:10px 14px 10px 36px;font-family:'Instrument Sans',sans-serif;font-size:.88rem;color:var(--white);outline:none;transition:all .2s}
        .search-input:focus{border-color:var(--red);box-shadow:0 0 0 3px var(--red-dim)}
        .search-input::placeholder{color:var(--muted)}
        .filter-group{display:flex;gap:6px;flex-wrap:wrap}
        .filter-btn{padding:8px 14px;background:var(--surface);border:1.5px solid var(--line);border-radius:20px;font-size:.78rem;font-weight:600;color:var(--muted);cursor:pointer;transition:all .2s}
        .filter-btn.active{background:var(--red-dim);border-color:var(--red);color:var(--white)}
        .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}
        .case-card{background:var(--surface);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;transition:all .2s;animation:fadeUp .4s ease;text-decoration:none;display:block}
        .case-card:hover{border-color:var(--muted);transform:translateY(-2px)}
        .case-photo{width:100%;height:160px;object-fit:cover;background:var(--card);display:block}
        .case-photo-placeholder{width:100%;height:160px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:white}
        .case-body{padding:1.25rem}
        .case-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:.6rem}
        .case-name{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:var(--white);letter-spacing:-.02em}
        .case-meta{font-size:.75rem;color:var(--muted);margin-top:2px}
        .case-type{font-size:.7rem;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:3px 8px;color:var(--muted)}
        .case-location{display:flex;align-items:center;gap:6px;font-size:.78rem;color:var(--soft);margin-bottom:.75rem}
        .case-desc{font-size:.78rem;color:var(--muted);line-height:1.5;margin-bottom:1rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .case-footer{display:flex;align-items:center;justify-content:space-between;padding-top:.75rem;border-top:1px solid var(--line)}
        .case-time{font-size:.72rem;color:var(--muted)}
        .join-btn{display:flex;align-items:center;gap:6px;padding:7px 14px;background:var(--red);color:white;border:none;border-radius:8px;font-family:'Syne',sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;transition:all .2s;text-decoration:none}
        .join-btn:hover{background:#C42828}
        .loading-wrap{display:flex;align-items:center;justify-content:center;padding:4rem;gap:1rem;color:var(--muted)}
        .spinner{width:24px;height:24px;border:2px solid var(--line);border-top-color:var(--red);border-radius:50%;animation:spin .8s linear infinite}
        .empty{text-align:center;padding:4rem;color:var(--muted)}
        .count{font-size:.82rem;color:var(--muted);margin-bottom:1rem}
      `}</style>

      <div className="bg"><div className="bg-grid" /></div>
      <div className="page">
        <div className="topbar">
          <a href="/" className="brand">
            <div className="brand-dot" />
            <span className="brand-name">Alert<span style={{color:'var(--red)'}}>Find</span></span>
          </a>
          <a href="/dashboard" className="back-btn">← Back to Dashboard</a>
        </div>

        <h1 className="page-title">Browse <span>Cases</span></h1>
        <p className="page-desc">Join a case group to share information, tips, and help bring someone home.</p>

        <div className="toolbar">
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <input className="search-input" placeholder="Search by name or location..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="filter-group">
            {['all','children','adults','elderly'].map(f => (
              <button key={f} className={`filter-btn${filter===f?' active':''}`} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase()+f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="loading-wrap"><div className="spinner"/>Loading cases...</div>
        ) : (
          <>
            <p className="count">{filtered.length} case{filtered.length!==1?'s':''} found</p>
            <div className="grid">
              {filtered.map(c => {
                const groupId = Array.isArray(c.case_groups)
                ? c.case_groups?.[0]?.id
                : (c.case_groups as { id: string } | null)?.id;
                const color   = getColor(c.id);
                return (
                  <div key={c.id} className="case-card">
                    {c.photo_url
                      ? <img src={c.photo_url} className="case-photo" alt={`${c.first_name} ${c.last_name}`}/>
                      : <div className="case-photo-placeholder" style={{background:color}}>{getInitials(c.first_name,c.last_name)}</div>
                    }
                    <div className="case-body">
                      <div className="case-top">
                        <div>
                          <div className="case-name">{c.first_name} {c.last_name}</div>
                          <div className="case-meta">{c.age ? `${c.age} yrs` : 'Age unknown'} · {c.gender||'Unknown'}</div>
                        </div>
                        <span className="case-type">{c.case_type||'Missing'}</span>
                      </div>
                      {c.last_seen_location && (
                        <div className="case-location">📍 {c.last_seen_location}</div>
                      )}
                      {c.description && <p className="case-desc">{c.description}</p>}
                      <div className="case-footer">
                        <span className="case-time">{timeAgo(c.created_at)}</span>
                        {groupId && (
                          <a href={`/cases/${groupId}`} className="join-btn">
                            💬 Join Group
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}