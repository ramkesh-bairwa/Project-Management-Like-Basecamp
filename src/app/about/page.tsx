'use client';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';
import { OWNER } from '@/lib/owner';

export default function AboutPage() {
  const { get } = usePageContent('about');

  const values = [1,2,3,4].map(i => ({
    icon:  get(`value${i}`,'icon',''),
    title: get(`value${i}`,'title',''),
    desc:  get(`value${i}`,'desc',''),
  })).filter(v => v.title);

  const members = [1,2,3,4,5,6].map(i => ({
    name:   get(`member${i}`,'name',''),
    role:   get(`member${i}`,'role',''),
    avatar: get(`member${i}`,'avatar',''),
    color:  get(`member${i}`,'color','#457b9d'),
    bio:    get(`member${i}`,'bio',''),
  })).filter(m => m.name);

  return (
    <div style={{ minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:'#f8fafc', color:'#1d3557' }}>
      <PublicNav />

      {/* Hero */}
      <section style={{ background:'linear-gradient(135deg,#1d3557,#2a4a73)', padding:'80px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ display:'inline-block', padding:'5px 16px', borderRadius:20, background:'rgba(168,218,220,0.15)', border:'1px solid rgba(168,218,220,0.3)', color:'#a8dadc', fontSize:13, fontWeight:700, marginBottom:20 }}>About Us</div>
          <h1 style={{ fontSize:52, fontWeight:900, color:'#fff', margin:'0 0 20px', letterSpacing:'-1.5px', lineHeight:1.1 }}>{get('hero','title','We are on a mission')}</h1>
          <p style={{ fontSize:18, color:'rgba(255,255,255,0.55)', lineHeight:1.7 }}>{get('hero','subtitle','')}</p>
        </div>
      </section>

      {/* Story + Stats */}
      <section style={{ maxWidth:900, margin:'0 auto', padding:'80px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }}>
          <div>
            <h2 style={{ fontSize:36, fontWeight:900, margin:'0 0 16px', letterSpacing:'-0.5px' }}>{get('story','title','Our Story')}</h2>
            <div dangerouslySetInnerHTML={{ __html: get('story','body','') }} style={{ fontSize:15, color:'#6b7a8d', lineHeight:1.8 }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[
              [get('stats','teams','10k+'),    'Teams worldwide'],
              [get('stats','countries','50+'), 'Countries'],
              [get('stats','uptime','99.9%'),  'Uptime SLA'],
              [get('stats','founded','2022'),  'Founded'],
            ].map(([val,lbl]) => (
              <div key={lbl} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:16, padding:'24px 20px', textAlign:'center' }}>
                <div style={{ fontSize:28, fontWeight:900, color:'#e63946', marginBottom:4 }}>{val}</div>
                <div style={{ fontSize:13, color:'#6b7a8d' }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      {values.length > 0 && (
        <section style={{ background:'#fff', padding:'80px 24px', borderTop:'1px solid #e2e8f0' }}>
          <div style={{ maxWidth:900, margin:'0 auto' }}>
            <h2 style={{ fontSize:36, fontWeight:900, textAlign:'center', margin:'0 0 48px', letterSpacing:'-0.5px' }}>{get('values','title','Our Values')}</h2>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
              {values.map(v => (
                <div key={v.title} style={{ textAlign:'center', padding:'28px 20px', background:'#f8fafc', borderRadius:20, border:'1px solid #e2e8f0' }}>
                  <div style={{ fontSize:36, marginBottom:14 }}>{v.icon}</div>
                  <h3 style={{ fontSize:15, fontWeight:800, margin:'0 0 8px' }}>{v.title}</h3>
                  <p style={{ fontSize:13, color:'#6b7a8d', margin:0, lineHeight:1.6 }}>{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Team */}
      {members.length > 0 && (
        <section style={{ maxWidth:1000, margin:'0 auto', padding:'80px 24px' }}>
          <h2 style={{ fontSize:36, fontWeight:900, textAlign:'center', margin:'0 0 48px', letterSpacing:'-0.5px' }}>{get('team','title','Meet the Team')}</h2>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
            {members.map(m => (
              <div key={m.name} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:20, padding:'28px 24px', textAlign:'center' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:m.color, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900, fontSize:20, margin:'0 auto 16px' }}>{m.avatar}</div>
                <div style={{ fontWeight:800, fontSize:16, color:'#1d3557', marginBottom:4 }}>{m.name}</div>
                <div style={{ fontSize:13, color:m.color, fontWeight:600, marginBottom:12 }}>{m.role}</div>
                <p style={{ fontSize:13, color:'#6b7a8d', margin:0, lineHeight:1.6 }}>{m.bio}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ background:'#1d3557', padding:'80px 24px', textAlign:'center' }}>
        <h2 style={{ fontSize:36, fontWeight:900, color:'#fff', margin:'0 0 12px' }}>{get('cta','title','Join our growing team')}</h2>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:16, margin:'0 0 32px' }}>{get('cta','subtitle','We are always looking for talented people.')}</p>
        <div style={{ display:'flex', gap:14, justifyContent:'center' }}>
          <Link href="/contact" style={{ padding:'13px 28px', borderRadius:12, background:'#e63946', color:'#fff', fontWeight:800, fontSize:15, textDecoration:'none' }}>{get('cta','button1','View Open Roles')}</Link>
          <Link href="/register" style={{ padding:'13px 28px', borderRadius:12, border:'2px solid rgba(255,255,255,0.2)', color:'#fff', fontWeight:700, fontSize:15, textDecoration:'none' }}>{get('cta','button2','Try ProjectHub')}</Link>
        </div>
      </section>
      <footer style={{ background:'#0f1f35', padding:'24px', textAlign:'center' }}>
        <div style={{ color:'rgba(255,255,255,0.3)', fontSize:13, lineHeight:2 }}>
          <span>© 2025 ProjectHub · <Link href="/" style={{ color:'rgba(255,255,255,0.4)', textDecoration:'none' }}>Home</Link></span><br />
          <a href={`mailto:${OWNER.email}`} style={{ color:'rgba(255,255,255,0.3)', textDecoration:'none' }}>{OWNER.email}</a>
          {' · '}
          <a href={`tel:${OWNER.phone}`} style={{ color:'rgba(255,255,255,0.3)', textDecoration:'none' }}>{OWNER.phone}</a>
          {' · '}
          <span>{OWNER.address}</span>
        </div>
      </footer>
    </div>
  );
}
