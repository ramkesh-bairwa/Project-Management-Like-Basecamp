'use client';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';

export default function DocsPage() {
  const { get } = usePageContent('docs');

  const quicklinks = [1,2,3,4].map(i => ({
    icon:  get(`quicklink${i}`,'icon',''),
    label: get(`quicklink${i}`,'label',''),
    desc:  get(`quicklink${i}`,'desc',''),
  })).filter(q => q.label);

  const sections = [1,2,3,4,5,6].map(i => {
    const raw = get(`section${i}`,'articles','');
    const articles = raw.split('|').filter(Boolean).map(a => {
      const [title, time] = a.split(':');
      return { title: title?.trim() || '', time: time?.trim() || '' };
    });
    return {
      icon:     get(`section${i}`,'icon','📄'),
      title:    get(`section${i}`,'title',''),
      articles,
    };
  }).filter(s => s.title);

  return (
    <div style={{ minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:'#f8fafc', color:'#1d3557' }}>
      <PublicNav />

      {/* Hero */}
      <section style={{ background:'linear-gradient(135deg,#1d3557,#2a4a73)', padding:'72px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <div style={{ display:'inline-block', padding:'5px 16px', borderRadius:20, background:'rgba(168,218,220,0.15)', border:'1px solid rgba(168,218,220,0.3)', color:'#a8dadc', fontSize:13, fontWeight:700, marginBottom:20 }}>Documentation</div>
          <h1 style={{ fontSize:48, fontWeight:900, color:'#fff', margin:'0 0 16px', letterSpacing:'-1.5px' }}>{get('hero','title','How can we help?')}</h1>
          <p style={{ fontSize:16, color:'rgba(255,255,255,0.5)', margin:'0 0 28px' }}>{get('hero','subtitle','Search our docs or browse by category below.')}</p>
          <div style={{ position:'relative', maxWidth:480, margin:'0 auto' }}>
            <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', fontSize:16 }}>🔍</span>
            <input placeholder="Search documentation…" style={{ width:'100%', padding:'14px 16px 14px 44px', borderRadius:14, border:'none', fontSize:15, color:'#1d3557', background:'#fff', boxSizing:'border-box', outline:'none', boxShadow:'0 4px 20px rgba(0,0,0,0.15)' }} />
          </div>
        </div>
      </section>

      {/* Quick links */}
      {quicklinks.length > 0 && (
        <section style={{ maxWidth:900, margin:'0 auto', padding:'48px 24px 0' }}>
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${quicklinks.length},1fr)`, gap:16 }}>
            {quicklinks.map(q => (
              <div key={q.label} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'20px', textAlign:'center', cursor:'pointer' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>{q.icon}</div>
                <div style={{ fontWeight:800, fontSize:14, color:'#1d3557', marginBottom:4 }}>{q.label}</div>
                <div style={{ fontSize:12, color:'#94a3b8' }}>{q.desc}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Doc sections */}
      {sections.length > 0 && (
        <section style={{ maxWidth:900, margin:'0 auto', padding:'48px 24px 80px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {sections.map(s => (
              <div key={s.title} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:20, padding:'28px 24px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <span style={{ fontSize:24 }}>{s.icon}</span>
                  <h3 style={{ fontSize:16, fontWeight:800, margin:0, color:'#1d3557' }}>{s.title}</h3>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                  {s.articles.map(a => (
                    <a key={a.title} href="#" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid #f1f5f9', textDecoration:'none', color:'#475569', fontSize:13 }}>
                      <span style={{ fontWeight:500 }}>{a.title}</span>
                      <span style={{ fontSize:11, color:'#94a3b8', flexShrink:0, marginLeft:8 }}>{a.time}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Support */}
      <section style={{ background:'#fff', borderTop:'1px solid #e2e8f0', padding:'64px 24px', textAlign:'center' }}>
        <div style={{ fontSize:40, marginBottom:16 }}>🤝</div>
        <h2 style={{ fontSize:28, fontWeight:900, margin:'0 0 12px' }}>{get('support','title','Still need help?')}</h2>
        <p style={{ color:'#6b7a8d', fontSize:15, margin:'0 0 28px' }}>{get('support','subtitle','Our support team is available Monday–Friday, 9am–6pm EST.')}</p>
        <Link href="/contact" style={{ display:'inline-block', padding:'13px 28px', borderRadius:12, background:'#1d3557', color:'#fff', fontWeight:800, fontSize:15, textDecoration:'none' }}>
          {get('support','button','Contact Support →')}
        </Link>
      </section>
      <footer style={{ background:'#0f1f35', padding:'24px', textAlign:'center' }}>
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>© 2025 ProjectHub · <Link href="/" style={{ color:'rgba(255,255,255,0.4)', textDecoration:'none' }}>Home</Link></span>
      </footer>
    </div>
  );
}
