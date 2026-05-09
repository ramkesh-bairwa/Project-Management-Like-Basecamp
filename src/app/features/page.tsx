'use client';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';

const COLORS = ['#e63946','#457b9d','#2a9d8f','#f4a261','#6d6875','#1d3557','#e63946','#2a9d8f','#457b9d'];
const BGS    = ['rgba(230,57,70,0.06)','rgba(69,123,157,0.06)','rgba(42,157,143,0.06)','rgba(244,162,97,0.06)','rgba(109,104,117,0.06)','rgba(29,53,87,0.06)','rgba(230,57,70,0.06)','rgba(42,157,143,0.06)','rgba(69,123,157,0.06)'];

export default function FeaturesPage() {
  const { get } = usePageContent('features');

  const features = [1,2,3,4,5,6,7,8,9].map((i,idx) => ({
    icon:   get(`feature${i}`,'icon',''),
    title:  get(`feature${i}`,'title',''),
    desc:   get(`feature${i}`,'desc',''),
    points: get(`feature${i}`,'points','').split('|').filter(Boolean),
    color:  COLORS[idx],
    bg:     BGS[idx],
  })).filter(f => f.title);

  return (
    <div style={{ minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:'#f8fafc', color:'#1d3557' }}>
      <PublicNav />

      {/* Hero */}
      <section style={{ background:'linear-gradient(135deg,#1d3557,#2a4a73)', padding:'80px 24px', textAlign:'center' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <div style={{ display:'inline-block', padding:'5px 16px', borderRadius:20, background:'rgba(168,218,220,0.15)', border:'1px solid rgba(168,218,220,0.3)', color:'#a8dadc', fontSize:13, fontWeight:700, marginBottom:20 }}>
            {get('hero','badge','Features')}
          </div>
          <h1 style={{ fontSize:52, fontWeight:900, color:'#fff', margin:'0 0 16px', letterSpacing:'-1.5px', lineHeight:1.1 }}>
            {get('hero','title','Everything your team needs')}
          </h1>
          <p style={{ fontSize:18, color:'rgba(255,255,255,0.55)', margin:'0 0 32px', lineHeight:1.7 }}>
            {get('hero','subtitle','One platform to manage projects, collaborate with your team, and ship products faster.')}
          </p>
          <Link href="/register" style={{ display:'inline-block', padding:'14px 32px', borderRadius:12, background:'#e63946', color:'#fff', fontWeight:800, fontSize:15, textDecoration:'none', boxShadow:'0 4px 20px rgba(230,57,70,0.4)' }}>
            {get('hero','cta_text','Start for Free →')}
          </Link>
        </div>
      </section>

      {/* Feature cards */}
      <section style={{ maxWidth:1100, margin:'0 auto', padding:'80px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:24 }}>
          {features.map(f => (
            <div key={f.title} style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:20, padding:'32px 28px', boxShadow:'0 2px 12px rgba(29,53,87,0.05)' }}>
              <div style={{ width:56, height:56, borderRadius:16, background:f.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, marginBottom:20 }}>{f.icon}</div>
              <h3 style={{ fontSize:18, fontWeight:800, color:'#1d3557', margin:'0 0 10px' }}>{f.title}</h3>
              <p style={{ fontSize:14, color:'#6b7a8d', margin:'0 0 20px', lineHeight:1.7 }}>{f.desc}</p>
              {f.points.length > 0 && (
                <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:8 }}>
                  {f.points.map(p => (
                    <li key={p} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#475569' }}>
                      <span style={{ color:f.color, fontWeight:900 }}>✓</span> {p}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background:'#1d3557', padding:'80px 24px', textAlign:'center' }}>
        <h2 style={{ fontSize:36, fontWeight:900, color:'#fff', margin:'0 0 12px' }}>{get('cta','title','Ready to try it all?')}</h2>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:16, margin:'0 0 32px' }}>{get('cta','subtitle','Free forever. No credit card required.')}</p>
        <Link href="/register" style={{ display:'inline-block', padding:'14px 36px', borderRadius:12, background:'#e63946', color:'#fff', fontWeight:800, fontSize:16, textDecoration:'none' }}>
          {get('cta','button','Get Started Free →')}
        </Link>
      </section>
      <footer style={{ background:'#0f1f35', padding:'24px', textAlign:'center' }}>
        <span style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>© 2025 ProjectHub · <Link href="/" style={{ color:'rgba(255,255,255,0.4)', textDecoration:'none' }}>Home</Link></span>
      </footer>
    </div>
  );
}
