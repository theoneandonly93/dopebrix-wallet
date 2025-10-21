import React, { useEffect, useMemo, useState } from 'react';
import { dopameme } from '../services/dopameme.js';

export default function DopaMeme() {
  const [view, setView] = useState('explore'); // explore | search
  const [section, setSection] = useState('inscriptions'); // inscriptions | runes (stub)
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('all'); // all|images|gifs|text
  const [range, setRange] = useState('All'); // 1H|1D|1W|1M|All (UI only)
  const [sort, setSort] = useState('Trending');

  useEffect(() => { load(1, true); }, []);

  async function load(p = 1, replace = false) {
    setLoading(true);
    try {
      const list = await dopameme.listLatest({ page: p, limit: 24 });
      setItems(replace ? list : [...items, ...list]);
      setPage(p);
    } finally { setLoading(false); }
  }

  const back = () => { if (window.__setAppTab) window.__setAppTab('explore'); };

  const doSearch = async () => {
    if (!q) return;
    setLoading(true);
    try { setItems(await dopameme.search(q)); setView('search'); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    if (type === 'all') return items;
    const t = type;
    return items.filter((it) => {
      const m = (it.mime||'').toLowerCase();
      if (t === 'images') return m.startsWith('image/') && !m.includes('gif');
      if (t === 'gifs') return m.includes('gif');
      if (t === 'text') return m.startsWith('text/');
      return true;
    });
  }, [items, type]);

  return (
    <div className="grid">
      <div className="card" style={{paddingTop:14}}>
        {/* Top segmented nav + search + theme button */}
        <div className="dm-top">
          <div className="seg">
            <button className={section==='inscriptions'?'active':''} onClick={()=>setSection('inscriptions')}>Inscriptions</button>
            <button className={section==='runes'?'active':''} onClick={()=>setSection('runes')}>Runes</button>
          </div>
          <div className="dm-search">
            <input placeholder="Search inscriptions" value={q} onChange={(e)=>setQ(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') doSearch(); }} />
            <button className="round" onClick={doSearch}>🔍</button>
            <button className="round" title="Theme">🌈</button>
          </div>
        </div>

        {/* Type chips */}
        <div className="chipbar" style={{marginTop:10}}>
          {['all','images','gifs','text'].map(t => (
            <button key={t} className={`chip ${type===t?'active':''}`} onClick={()=>setType(t)} style={{textTransform:'capitalize'}}>{t}</button>
          ))}
        </div>

        {/* Sort + range */}
        <div className="row" style={{marginTop:10, alignItems:'center', gap:10}}>
          <button className="selectlike" onClick={()=>setSort(sort)}>{sort} ▾</button>
          <div className="chipbar" style={{gap:6}}>
            {['1H','1D','1W','1M','All'].map(r => (
              <button key={r} className={`chip ${range===r?'active':''}`} onClick={()=>setRange(r)}>{r}</button>
            ))}
          </div>
        </div>
        <div className="muted" style={{marginTop:8}}>Found {Intl.NumberFormat().format(filtered.length)} inscriptions</div>
      </div>

      <div className="gallery">
        {filtered.map((it, i) => (
          <div key={`${it.id||i}`} className="gallery-item" onClick={()=>setSelected(it)}>
            {it.content ? (
              <img src={it.content} alt={it.title} loading="lazy" />
            ) : (
              <div className="gallery-ph"/>
            )}
            <div className="gallery-meta">
              <div className="mono" title={it.id}>{(it.id||'').slice(0,8)}…</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{justifyContent:'space-between'}}>
        <div className="muted">{view==='search' ? 'Search results' : `Page ${page}`}</div>
      </div>
      {view!=='search' && (
        <button className="cta full" onClick={()=>load(page+1)}>Load more</button>
      )}

      {loading && <div className="card">Loading…</div>}

      {selected && (
        <div className="sheet">
          <div className="sheet-inner">
            <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              <div style={{fontWeight:800}}>Inscription</div>
              <button className="pill" onClick={()=>setSelected(null)}>Close</button>
            </div>
            <div className="spacer"/>
            {selected.content ? (
              <img src={selected.content} alt={selected.title} style={{width:'100%',borderRadius:12}} />
            ) : (
              <div className="gallery-ph" style={{height:240}}/>
            )}
            <div className="spacer"/>
            <div className="mono" style={{wordBreak:'break-all'}}>{selected.id}</div>
            <div className="spacer"/>
            <button className="cta" onClick={()=>navigator.clipboard.writeText(selected.id)}>Copy ID</button>
          </div>
        </div>
      )}
    </div>
  );
}
