'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

interface Profile { id: string; first_name: string; last_name: string; points?: number; }
interface Message {
  id: string; group_id: string; sender_id: string; content: string;
  image_url: string | null; message_type: string; is_deleted: boolean;
  created_at: string; sender?: Profile;
}
interface Member {
  id: string; user_id: string; role: string; is_blocked: boolean;
  joined_at: string; profile?: Profile;
}
interface CaseGroup {
  id: string; case_id: string; created_by: string;
  report?: {
    first_name: string; last_name: string; case_number: string;
    status: string; photo_url: string | null; case_type: string;
    last_seen_location: string; reporter_id: string;
  };
}

const COLORS = ['#E03030','#E07830','#1D9E75','#378ADD','#7F77DD','#D4537E','#0F6E56','#BA7517'];
function getColor(id: string) {
  let h = 0; for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h<<5)-h);
  return COLORS[Math.abs(h)%COLORS.length];
}
function getInitials(f='',l='') { return `${f?.[0]??''}${l?.[0]??''}`.toUpperCase(); }
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
}
function formatDate(d: string) {
  const date = new Date(d);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { day:'numeric', month:'short', year:'numeric' });
}

export default function CaseGroupPage() {
  const { id } = useParams<{ id: string }>();
  const [group,        setGroup]        = useState<CaseGroup | null>(null);
  const [messages,     setMessages]     = useState<Message[]>([]);
  const [members,      setMembers]      = useState<Member[]>([]);
  const [me,           setMe]           = useState<Profile | null>(null);
  const [myRole,       setMyRole]       = useState<'admin'|'member'|'none'|null>(null);
  const [text,         setText]         = useState('');
  const [imgFile,      setImgFile]      = useState<File | null>(null);
  const [imgPrev,      setImgPrev]      = useState('');
  const [sending,      setSending]      = useState(false);
  const [panel,        setPanel]        = useState<'members'|'reward'|null>(null);
  const [rewardTarget, setRewardTarget] = useState<Member|null>(null);
  const [rewardMsg,    setRewardMsg]    = useState('');
  const [rewardPts,    setRewardPts]    = useState('50');
  const [solving,      setSolving]      = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── FIX 2: single channel, subscribe once, never re-subscribe ──
  const setupRealtime = useCallback(() => {
    // Remove any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`group-messages-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        async (payload) => {
          const { data } = await supabase
            .from('group_messages')
            .select('*, sender:profiles(id,first_name,last_name,avatar_url)')
            .eq('id', payload.new.id)
            .single();
          if (data) setMessages(prev => [...prev, data]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${id}` },
        (payload) => {
          setMessages(prev =>
            prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } : m)
          );
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [id]);

  // ── FIX 3: fetch members with explicit foreign key hint ──
  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        id, user_id, role, is_blocked, joined_at,
        profile:profiles!group_members_user_id_fkey(id, first_name, last_name, points)
      `)
      .eq('group_id', id);
    if (error) console.error('fetchMembers error:', error.message);
    setMembers(data ?? []);
  }, [id]);

  const fetchMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from('group_messages')
     .select('*, sender:profiles(id,first_name,last_name)')
      .eq('group_id', id)
      .order('created_at', { ascending: true });
    if (error) console.error('fetchMessages error:', error.message);
    setMessages(data ?? []);
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      // 2. Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (cancelled) return;
      setMe(profile);

      // 3. Get group + case info
      const { data: grp } = await supabase
        .from('case_groups')
        .select('*, report:reports(first_name,last_name,case_number,status,photo_url,case_type,last_seen_location,reporter_id)')
        .eq('id', id)
        .single();
      if (cancelled) return;
      setGroup(grp);

      // 4. Check / create membership
      const { data: membership } = await supabase
        .from('group_members')
        .select('role, is_blocked')
        .eq('group_id', id)
        .eq('user_id', user.id)
        .maybeSingle(); // ← maybeSingle so missing row = null, not error

      if (cancelled) return;

      if (!membership) {
        // Auto-join
        await supabase.from('group_members').insert({
          group_id: id, user_id: user.id, role: 'member'
        });
        await supabase.from('group_messages').insert({
          group_id: id, sender_id: user.id,
          content: `${profile?.first_name} ${profile?.last_name} joined the group.`,
          message_type: 'system',
        });
        setMyRole('member');
      } else if (membership.is_blocked) {
        setMyRole('none');
        return;
      } else {
        // Upgrade reporter to admin if needed
        if (grp?.report?.reporter_id === user.id && membership.role !== 'admin') {
          await supabase.from('group_members')
            .update({ role: 'admin' })
            .eq('group_id', id)
            .eq('user_id', user.id);
          setMyRole('admin');
        } else {
          setMyRole(membership.role as 'admin' | 'member');
        }
      }

      if (cancelled) return;

      // 5. Load data then subscribe — FIX 2: subscribe only once here
      await fetchMessages();
      await fetchMembers();
      setupRealtime();
    }

    init();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [id, fetchMessages, fetchMembers, setupRealtime]);

  async function sendMessage() {
    if (!me || (!text.trim() && !imgFile)) return;
    setSending(true);

    let imageUrl: string | null = null;
    if (imgFile) {
      const ext  = imgFile.name.split('.').pop();
      const path = `group-${id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('reports').upload(path, imgFile);
      if (!error) {
        const { data } = supabase.storage.from('reports').getPublicUrl(path);
        imageUrl = data.publicUrl;
      }
    }

    await supabase.from('group_messages').insert({
      group_id: id, sender_id: me.id,
      content: text.trim(),
      image_url: imageUrl,
      message_type: imgFile ? 'image' : 'text',
    });

    setText(''); setImgFile(null); setImgPrev('');
    setSending(false);
  }

  async function deleteMessage(msgId: string) {
    await supabase.from('group_messages').update({ is_deleted: true }).eq('id', msgId);
  }

  async function blockUser(_memberId: string, userId: string) {
    await supabase.from('group_members')
      .update({ is_blocked: true })
      .eq('group_id', id)
      .eq('user_id', userId);
    await supabase.from('group_messages').insert({
      group_id: id, sender_id: me!.id,
      content: 'A member has been removed from this group by the admin.',
      message_type: 'system',
    });
    fetchMembers();
  }

  async function giveReward() {
    if (!rewardTarget || !me) return;
    setSolving(true);
    const autoMsg = `🏆 Thank you ${rewardTarget.profile?.first_name} for your valuable contribution to case ${group?.report?.case_number}. Your help made a real difference. — ${me.first_name} ${me.last_name} (Case Admin)`;
    const finalMsg = rewardMsg.trim() || autoMsg;
    await supabase.from('rewards').insert({
      group_id: id, case_id: group?.case_id,
      awarded_to: rewardTarget.user_id, awarded_by: me.id,
      reward_type: parseInt(rewardPts) > 0 ? 'points' : 'thanks',
      points: parseInt(rewardPts) || 0, message: finalMsg,
    });
    await supabase.from('group_messages').insert({
      group_id: id, sender_id: me.id, content: finalMsg, message_type: 'reward',
    });
    setPanel(null); setRewardTarget(null); setRewardMsg(''); setRewardPts('50');
    setSolving(false);
  }

  async function markSolved() {
    if (!group) return;
    await supabase.from('reports').update({ status: 'solved' }).eq('id', group.case_id);
    await supabase.from('group_messages').insert({
      group_id: id, sender_id: me!.id,
      content: '✅ This case has been marked as SOLVED by the admin. Thank you to everyone who helped.',
      message_type: 'system',
    });
    setGroup(g => g ? { ...g, report: g.report ? { ...g.report, status: 'solved' } : undefined } as CaseGroup : g);
  }

  function handleImg(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setImgFile(file);
    const r = new FileReader();
    r.onload = ev => setImgPrev(ev.target?.result as string);
    r.readAsDataURL(file);
  }

  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach(m => {
    const d = formatDate(m.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.msgs.push(m);
    else grouped.push({ date: d, msgs: [m] });
  });

  const isSolved = group?.report?.status === 'solved';
  const activeMembers = members.filter(m => !m.is_blocked);

  // ── Loading state while init runs ──
  if (myRole === null) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--muted)',fontFamily:"'Instrument Sans',sans-serif",gap:'1rem'}}>
        <div style={{width:'24px',height:'24px',border:'2px solid #2C2825',borderTopColor:'#E03030',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
        Loading group...
      </div>
    );
  }

  return (
    <main style={{ fontFamily:"'Instrument Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{--red:#E03030;--red-dim:rgba(224,48,48,.12);--red-glow:rgba(224,48,48,.35);--ink:#0D0B0A;--surface:#141210;--card:#1C1917;--line:#2C2825;--muted:#7A6E68;--soft:#B5A89F;--white:#F5F0EC;--success:#2ECC71;}
        html,body{min-height:100%;background:var(--ink);color:var(--white);overflow:hidden}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
       .layout{display:grid;grid-template-columns:1fr 380px;grid-template-rows:auto 1fr auto;height:100vh}
        @media(max-width:768px){.layout{grid-template-columns:1fr}.side-panel{display:none}}
        .topbar{grid-column:1/-1;display:flex;align-items:center;gap:1rem;padding:.9rem 1.25rem;border-bottom:1px solid var(--line);background:rgba(13,11,10,.95);backdrop-filter:blur(12px);position:sticky;top:0;z-index:50}
        .back-btn{width:34px;height:34px;background:var(--surface);border:1px solid var(--line);border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--muted);font-size:.9rem;text-decoration:none;transition:all .2s;flex-shrink:0}
        .back-btn:hover{border-color:var(--muted);color:var(--white)}
        .case-avatar-sm{width:38px;height:38px;border-radius:10px;object-fit:cover;flex-shrink:0}
        .case-avatar-sm-placeholder{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:.7rem;font-weight:800;color:white;flex-shrink:0}
        .topbar-info{flex:1;min-width:0}
        .topbar-name{font-family:'Syne',sans-serif;font-size:.95rem;font-weight:700;color:var(--white);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .topbar-meta{font-size:.72rem;color:var(--muted);margin-top:1px}
        .topbar-actions{display:flex;gap:.5rem;flex-shrink:0}
        .icon-btn{width:34px;height:34px;background:var(--surface);border:1px solid var(--line);border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:.9rem;transition:all .2s;color:var(--muted)}
        .icon-btn:hover{border-color:var(--muted);color:var(--white)}
        .solved-badge{padding:4px 10px;background:rgba(46,204,113,.15);border:1px solid var(--success);border-radius:8px;font-size:.7rem;font-weight:700;color:var(--success)}
        .messages-area{grid-column:1;overflow-y:auto;padding:1.5rem 1.25rem;display:flex;flex-direction:column;gap:.25rem}
        .date-divider{text-align:center;margin:1rem 0 .5rem}
        .date-divider span{background:var(--card);border:1px solid var(--line);border-radius:20px;padding:3px 12px;font-size:.7rem;color:var(--muted)}
        .msg-row{display:flex;gap:.6rem;margin-bottom:.25rem;animation:fadeUp .2s ease}
        .msg-row.mine{flex-direction:row-reverse}
        .msg-row.system{justify-content:center}
        .msg-avatar{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:800;color:white;flex-shrink:0;align-self:flex-end}
        .msg-bubble{max-width:72%;padding:.6rem .85rem;border-radius:14px;font-size:.85rem;line-height:1.5;position:relative}
        .msg-bubble.theirs{background:var(--card);border:1px solid var(--line);border-bottom-left-radius:4px;color:var(--white)}
        .msg-bubble.mine{background:var(--red);border-bottom-right-radius:4px;color:white}
        .msg-bubble.system-bubble{background:var(--surface);border:1px solid var(--line);border-radius:10px;color:var(--muted);font-size:.75rem;padding:.5rem 1rem;max-width:90%;text-align:center}
        .msg-bubble.reward-bubble{background:rgba(212,163,30,.12);border:1px solid rgba(212,163,30,.3);border-radius:12px;color:var(--white);font-size:.82rem;padding:.75rem 1rem;max-width:90%}
        .msg-sender{font-size:.68rem;font-weight:600;color:var(--muted);margin-bottom:3px}
        .msg-time{font-size:.62rem;color:rgba(255,255,255,.4);margin-top:3px;text-align:right}
        .msg-time.theirs-time{color:var(--muted);text-align:left}
        .msg-img{max-width:220px;border-radius:10px;display:block;margin-bottom:.35rem;cursor:pointer}
        .msg-deleted{font-style:italic;color:var(--muted);font-size:.78rem}
        .msg-del-btn{background:none;border:none;font-size:.65rem;color:rgba(255,255,255,.4);cursor:pointer;padding:0 0 0 6px;transition:color .2s}
        .msg-del-btn:hover{color:var(--red)}
        .input-bar{grid-column:1;border-top:1px solid var(--line);padding:.9rem 1.25rem;background:rgba(13,11,10,.95);backdrop-filter:blur(8px)}
        .img-preview-wrap{display:flex;align-items:center;gap:.5rem;margin-bottom:.6rem;padding:.5rem;background:var(--card);border-radius:10px;border:1px solid var(--line)}
        .img-preview-thumb{width:48px;height:48px;object-fit:cover;border-radius:8px}
        .img-preview-name{font-size:.75rem;color:var(--soft);flex:1}
        .img-preview-remove{background:none;border:none;color:var(--red);cursor:pointer;font-size:.8rem}
        .input-row{display:flex;gap:.6rem;align-items:flex-end}
        .input-attach{width:36px;height:36px;background:var(--surface);border:1.5px solid var(--line);border-radius:10px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;transition:all .2s;flex-shrink:0}
        .input-attach:hover{border-color:var(--muted)}
        .input-field{flex:1;background:var(--surface);border:1.5px solid var(--line);border-radius:11px;padding:10px 14px;font-family:'Instrument Sans',sans-serif;font-size:.9rem;color:var(--white);outline:none;resize:none;min-height:40px;max-height:120px;transition:all .2s}
        .input-field:focus{border-color:var(--red);box-shadow:0 0 0 3px var(--red-dim)}
        .input-field::placeholder{color:var(--muted)}
        .send-btn{width:38px;height:38px;background:var(--red);border:none;border-radius:11px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0}
        .send-btn:hover:not(:disabled){background:#C42828}
        .send-btn:disabled{opacity:.5;cursor:not-allowed}
        .blocked-notice{text-align:center;padding:1rem;color:var(--red);font-size:.82rem;background:var(--red-dim);border-radius:10px}
        .side-panel{grid-row:1/4;border-left:1px solid var(--line);background:rgba(20,18,16,.95);overflow-y:auto;display:flex;flex-direction:column}
        .panel-header{padding:1rem;border-bottom:1px solid var(--line);font-family:'Syne',sans-serif;font-size:.85rem;font-weight:700;color:var(--white)}
        .case-info-block{padding:1rem;border-bottom:1px solid var(--line)}
        .case-info-photo{width:100%;height:200px;object-fit:contain;background:var(--card);border-radius:10px;margin-bottom:.75rem}
        .case-info-name{font-family:'Syne',sans-serif;font-size:1rem;font-weight:700;color:var(--white);margin-bottom:.2rem}
        .case-info-num{font-size:.7rem;color:var(--muted);margin-bottom:.5rem}
        .case-info-row{font-size:.75rem;color:var(--soft);margin-bottom:.25rem}
        .admin-actions{padding:1rem;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:.5rem}
        .admin-btn{width:100%;padding:9px;border-radius:9px;font-family:'Instrument Sans',sans-serif;font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-align:center}
        .admin-btn.danger{background:var(--red-dim);border:1.5px solid rgba(224,48,48,.3);color:var(--red)}
        .admin-btn.danger:hover{background:var(--red);color:white}
        .admin-btn.success{background:rgba(46,204,113,.12);border:1.5px solid rgba(46,204,113,.3);color:var(--success)}
        .admin-btn.success:hover{background:var(--success);color:white}
        .member-row{display:flex;align-items:center;gap:.6rem;padding:.5rem 0;border-bottom:1px solid var(--line)}
        .member-row:last-child{border-bottom:none}
        .member-avatar{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:800;color:white;flex-shrink:0}
        .member-name{flex:1;font-size:.8rem;color:var(--white)}
        .member-role{font-size:.65rem;padding:2px 6px;border-radius:5px;font-weight:700}
        .member-role.admin{background:var(--red-dim);color:var(--red)}
        .member-role.member{background:var(--surface);color:var(--muted)}
        .member-block-btn{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.75rem;padding:3px 7px;border-radius:5px;transition:all .2s}
        .member-block-btn:hover{background:var(--red-dim);color:var(--red)}
        .member-reward-btn{background:none;border:none;color:var(--muted);cursor:pointer;font-size:.75rem;padding:3px 7px;border-radius:5px;transition:all .2s}
        .member-reward-btn:hover{background:rgba(212,163,30,.15);color:#D4A31E}
        .modal-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:1rem}
        .modal{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:1.5rem;width:100%;max-width:420px;animation:fadeUp .25s ease}
        .modal-title{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:700;color:var(--white);margin-bottom:.25rem}
        .modal-sub{font-size:.8rem;color:var(--muted);margin-bottom:1.25rem}
        .modal-field{display:flex;flex-direction:column;gap:5px;margin-bottom:1rem}
        .modal-field label{font-size:.72rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--soft)}
        .modal-field input,.modal-field textarea,.modal-field select{background:var(--surface);border:1.5px solid var(--line);border-radius:10px;padding:10px 14px;font-family:'Instrument Sans',sans-serif;font-size:.88rem;color:var(--white);outline:none;width:100%;transition:all .2s}
        .modal-field input:focus,.modal-field textarea:focus{border-color:var(--red);box-shadow:0 0 0 3px var(--red-dim)}
        .modal-field textarea{min-height:80px;resize:vertical}
        .modal-btns{display:flex;gap:.75rem;margin-top:1.25rem}
        .modal-btn{flex:1;padding:11px;border-radius:10px;font-family:'Syne',sans-serif;font-size:.88rem;font-weight:700;cursor:pointer;transition:all .2s}
        .modal-btn.primary{background:var(--red);color:white;border:none}
        .modal-btn.primary:hover:not(:disabled){background:#C42828}
        .modal-btn.primary:disabled{opacity:.6;cursor:not-allowed}
        .modal-btn.secondary{background:transparent;color:var(--muted);border:1.5px solid var(--line)}
        .modal-btn.secondary:hover{border-color:var(--muted);color:var(--white)}
        .spinner{width:18px;height:18px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
      `}</style>

      {myRole === 'none' ? (
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:'1rem',color:'var(--muted)'}}>
          <div style={{fontSize:'2rem'}}>🚫</div>
          <div>You have been removed from this group.</div>
          <a href="/cases" style={{color:'var(--red)',textDecoration:'none',fontSize:'.88rem'}}>← Back to Cases</a>
        </div>
      ) : (
        <div className="layout">

          <header className="topbar">
            <a href="/cases" className="back-btn">←</a>
            {group?.report?.photo_url
              ? <img src={group.report.photo_url} className="case-avatar-sm" alt=""/>
              : <div className="case-avatar-sm-placeholder" style={{background: group ? getColor(group.case_id) : '#666'}}>
                  {getInitials(group?.report?.first_name, group?.report?.last_name)}
                </div>
            }
            <div className="topbar-info">
              <div className="topbar-name">{group?.report?.first_name} {group?.report?.last_name}</div>
              <div className="topbar-meta">
                {activeMembers.length} member{activeMembers.length !== 1 ? 's' : ''} · {group?.report?.case_number}
              </div>
            </div>
            <div className="topbar-actions">
              {isSolved && <span className="solved-badge">✅ Solved</span>}
              <button className="icon-btn" onClick={() => setPanel(p => p === 'members' ? null : 'members')}>👥</button>
            </div>
          </header>

          <div className="messages-area">
            {grouped.map(({ date, msgs }) => (
              <div key={date}>
                <div className="date-divider"><span>{date}</span></div>
                {msgs.map(m => {
                  const isMe        = m.sender_id === me?.id;
                  const isSystem    = m.message_type === 'system';
                  const isReward    = m.message_type === 'reward';
                  const canDel      = isMe || myRole === 'admin';
                  const senderColor = m.sender_id ? getColor(m.sender_id) : '#666';

                  if (isSystem) return (
                    <div key={m.id} className="msg-row system">
                      <div className="msg-bubble system-bubble">{m.content}</div>
                    </div>
                  );
                  if (isReward) return (
                    <div key={m.id} className="msg-row system">
                      <div className="msg-bubble reward-bubble">🏆 {m.content}</div>
                    </div>
                  );
                  return (
                    <div key={m.id} className={`msg-row${isMe ? ' mine' : ''}`}>
                      {!isMe && (
                        <div className="msg-avatar" style={{background: senderColor}}>
                          {getInitials(m.sender?.first_name, m.sender?.last_name)}
                        </div>
                      )}
                      <div>
                        {!isMe && !m.is_deleted && (
                          <div className="msg-sender">{m.sender?.first_name} {m.sender?.last_name}</div>
                        )}
                        <div className={`msg-bubble${isMe ? ' mine' : ' theirs'}`}>
                          {m.is_deleted ? (
                            <span className="msg-deleted">🚫 Message deleted</span>
                          ) : (
                            <>
                              {m.image_url && (
                                <img src={m.image_url} className="msg-img" alt="shared"
                                  onClick={() => window.open(m.image_url!, '_blank')} />
                              )}
                              {m.content && <div>{m.content}</div>}
                              {canDel && !m.is_deleted && (
                                <button className="msg-del-btn" onClick={() => deleteMessage(m.id)}>🗑</button>
                              )}
                            </>
                          )}
                          <div className={`msg-time${isMe ? '' : ' theirs-time'}`}>{formatTime(m.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="input-bar">
            {myRole === 'none' ? (
              <div className="blocked-notice">You have been blocked from this group.</div>
            ) : isSolved ? (
              <div className="blocked-notice" style={{color:'var(--success)',background:'rgba(46,204,113,.1)'}}>
                ✅ This case is solved. The group is now read-only.
              </div>
            ) : (
              <>
                {imgPrev && (
                  <div className="img-preview-wrap">
                    <img src={imgPrev} className="img-preview-thumb" alt=""/>
                    <span className="img-preview-name">{imgFile?.name}</span>
                    <button className="img-preview-remove" onClick={() => { setImgFile(null); setImgPrev(''); }}>✕</button>
                  </div>
                )}
                <div className="input-row">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImg} style={{display:'none'}}/>
                  <div className="input-attach" onClick={() => fileRef.current?.click()}>📎</div>
                  <textarea
                    className="input-field"
                    placeholder="Share information about this case..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}}
                    rows={1}
                  />
                  <button className="send-btn" onClick={sendMessage} disabled={sending || (!text.trim() && !imgFile)}>
                    {sending
                      ? <div className="spinner"/>
                      : <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z" stroke="white" strokeWidth="2" fill="none"/></svg>
                    }
                  </button>
                </div>
              </>
            )}
          </div>

          <aside className="side-panel">
            <div className="case-info-block">
              <div className="panel-header">Case Info</div>
              {group?.report?.photo_url && (
                <img src={group.report.photo_url} className="case-info-photo" alt=""/>
              )}
              <div className="case-info-name">{group?.report?.first_name} {group?.report?.last_name}</div>
              <div className="case-info-num">{group?.report?.case_number}</div>
              <div className="case-info-row">📍 {group?.report?.last_seen_location}</div>
              <div className="case-info-row">📋 {group?.report?.case_type}</div>
            </div>

            {myRole === 'admin' && !isSolved && (
              <div className="admin-actions">
                <div style={{fontSize:'.7rem',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:'.25rem'}}>Admin Actions</div>
                <button className="admin-btn success" onClick={() => setPanel('reward')}>🏆 Give Reward</button>
                <button className="admin-btn danger" onClick={markSolved}>✅ Mark as Solved</button>
              </div>
            )}

            <div style={{padding:'1rem 1rem .5rem'}}>
              <div style={{fontSize:'.7rem',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:'.75rem'}}>
                Members ({activeMembers.length})
              </div>
              {activeMembers.map(m => (
                <div key={m.id} className="member-row">
                  <div className="member-avatar" style={{background: getColor(m.user_id)}}>
                    {getInitials(m.profile?.first_name, m.profile?.last_name)}
                  </div>
                  <div className="member-name">
                    {m.profile?.first_name} {m.profile?.last_name}
                    {m.profile?.points ? <span style={{fontSize:'.65rem',color:'#D4A31E',display:'block'}}>⭐ {m.profile.points} pts</span> : null}
                  </div>
                  <span className={`member-role ${m.role}`}>{m.role}</span>
                  {myRole === 'admin' && m.user_id !== me?.id && (
                    <>
                      <button className="member-reward-btn" title="Give reward"
                        onClick={() => { setRewardTarget(m); setPanel('reward'); }}>🏆</button>
                      <button className="member-block-btn" title="Remove from group"
                        onClick={() => blockUser(m.id, m.user_id)}>🚫</button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}

      {panel === 'reward' && (
        <div className="modal-overlay" onClick={() => setPanel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">🏆 Give a Reward</div>
            <div className="modal-sub">Recognise a member's contribution to this case.</div>
            <div className="modal-field">
              <label>Member to reward</label>
              <select value={rewardTarget?.user_id ?? ''}
                onChange={e => setRewardTarget(activeMembers.find(m => m.user_id === e.target.value) || null)}>
                <option value="">— Select a member —</option>
                {activeMembers.filter(m => m.user_id !== me?.id).map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profile?.first_name} {m.profile?.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label>Points to award</label>
              <input type="number" value={rewardPts} min="0" max="500"
                onChange={e => setRewardPts(e.target.value)} placeholder="e.g. 50"/>
            </div>
            <div className="modal-field">
              <label>Thank you message (optional — auto-generated if left blank)</label>
              <textarea value={rewardMsg} onChange={e => setRewardMsg(e.target.value)}
                placeholder={`Thank you ${rewardTarget?.profile?.first_name || '[member]'} for your valuable contribution...`}/>
            </div>
            <div className="modal-btns">
              <button className="modal-btn secondary" onClick={() => { setPanel(null); setRewardTarget(null); }}>Cancel</button>
              <button className="modal-btn primary" onClick={giveReward} disabled={solving || !rewardTarget}>
                {solving ? <span className="spinner"/> : '🏆 Send Reward'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}