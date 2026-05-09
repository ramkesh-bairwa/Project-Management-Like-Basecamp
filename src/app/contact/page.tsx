'use client';
import { useState } from 'react';
import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import { usePageContent } from '@/lib/hooks/usePageContent';
import { OWNER } from '@/lib/owner';

export default function ContactPage() {
  const { get } = usePageContent('contact');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const offices = [
    { city: 'Jaipur, India', address: OWNER.address, flag: '🇮🇳' },
  ];

  const contactOptions = [
    { icon: '💬', title: 'Live Chat',     desc: 'Chat with our team in real-time',          badge: 'Online',  color: '#2a9d8f' },
    { icon: '📧', title: 'Email Support', desc: OWNER.email,  badge: '< 24h',  color: '#457b9d' },
    { icon: '📞', title: 'Phone',         desc: OWNER.phone,  badge: 'Mon–Fri', color: '#e63946' },
    { icon: '🐦', title: 'Twitter / X',   desc: get('info','twitter','@projecthub'),          badge: 'DM us',   color: '#6d6875' },
  ];

  return (
    <div style={{ minHeight: '100vh', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background: '#f8fafc', color: '#1d3557' }}>
      <PublicNav />
      <section style={{ background: 'linear-gradient(135deg,#1d3557,#2a4a73)', padding: '72px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 20, background: 'rgba(168,218,220,0.15)', border: '1px solid rgba(168,218,220,0.3)', color: '#a8dadc', fontSize: 13, fontWeight: 700, marginBottom: 20 }}>Contact Us</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: '#fff', margin: '0 0 16px', letterSpacing: '-1.5px' }}>{get('hero','title',"We'd love to hear from you")}</h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.5)', margin: 0 }}>{get('hero','subtitle',"Whether you have a question, feedback or just want to say hi — we're here.")}</p>
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '56px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {contactOptions.map(o => (
            <div key={o.title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: '24px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{o.icon}</div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#1d3557', marginBottom: 4 }}>{o.title}</div>
              <div style={{ fontSize: 13, color: '#6b7a8d', marginBottom: 10 }}>{o.desc}</div>
              <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 12, background: `${o.color}15`, color: o.color, fontSize: 11, fontWeight: 700 }}>{o.badge}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 32 }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 24, padding: '40px 36px' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1d3557', margin: '0 0 8px' }}>Message sent!</h2>
                <p style={{ color: '#6b7a8d', fontSize: 14, margin: '0 0 24px' }}>We'll get back to you within 24 hours.</p>
                <button onClick={() => { setSent(false); setForm({ name:'',email:'',subject:'',message:'' }); }}
                  style={{ padding: '10px 24px', borderRadius: 10, background: '#1d3557', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer' }}>Send another</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 900, margin: '0 0 4px' }}>Send us a message</h2>
                <p style={{ color: '#6b7a8d', fontSize: 14, margin: '0 0 28px' }}>We typically respond within 24 hours.</p>
                <form onSubmit={e => { e.preventDefault(); setSent(true); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1d3557', marginBottom: 6 }}>Full name</label>
                      <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="Jane Smith" required style={{ width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid #d0dce8',fontSize:14,color:'#1d3557',outline:'none',boxSizing:'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1d3557', marginBottom: 6 }}>Email</label>
                      <input type="email" value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} placeholder="you@example.com" required style={{ width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid #d0dce8',fontSize:14,color:'#1d3557',outline:'none',boxSizing:'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1d3557', marginBottom: 6 }}>Subject</label>
                    <input value={form.subject} onChange={e => setForm(p=>({...p,subject:e.target.value}))} placeholder="How can we help?" required style={{ width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid #d0dce8',fontSize:14,color:'#1d3557',outline:'none',boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1d3557', marginBottom: 6 }}>Message</label>
                    <textarea value={form.message} onChange={e => setForm(p=>({...p,message:e.target.value}))} placeholder="Tell us more…" required rows={5} style={{ width:'100%',padding:'11px 14px',borderRadius:10,border:'1.5px solid #d0dce8',fontSize:14,color:'#1d3557',outline:'none',boxSizing:'border-box',resize:'vertical',fontFamily:'inherit' }} />
                  </div>
                  <button type="submit" style={{ padding:'13px',borderRadius:12,background:'linear-gradient(135deg,#e63946,#c1121f)',color:'#fff',fontWeight:800,fontSize:15,border:'none',cursor:'pointer',boxShadow:'0 4px 14px rgba(230,57,70,0.3)' }}>Send Message →</button>
                </form>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {offices.length > 0 && (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '28px 24px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>🏢 Our Offices</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {offices.map(o => (
                    <div key={o.city} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 20 }}>{o.flag}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#1d3557' }}>{o.city}</div>
                        <div style={{ fontSize: 13, color: '#6b7a8d', lineHeight: 1.5 }}>{o.address}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '28px 24px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>⏰ Support Hours</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Monday – Friday', get('info','hours_weekday','9:00 AM – 6:00 PM IST')],
                  ['Saturday',        get('info','hours_saturday','10:00 AM – 2:00 PM IST')],
                  ['Sunday',          'Closed'],
                ].map(([day, hours]) => (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#475569', fontWeight: 600 }}>{day}</span>
                    <span style={{ color: '#6b7a8d' }}>{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg,#1d3557,#2a4a73)', borderRadius: 20, padding: '28px 24px' }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>📚</div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Check our docs first</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', margin: '0 0 16px', lineHeight: 1.6 }}>Most questions are answered in our documentation.</p>
              <Link href="/docs" style={{ display: 'inline-block', padding: '9px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Browse Docs →</Link>
            </div>
          </div>
        </div>
      </section>
      <footer style={{ background: '#0f1f35', padding: '24px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, lineHeight: 2 }}>
          <span>© 2025 ProjectHub · <Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>Home</Link></span><br />
          <a href={`mailto:${OWNER.email}`} style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{OWNER.email}</a>
          {' · '}
          <a href={`tel:${OWNER.phone}`} style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{OWNER.phone}</a>
          {' · '}
          <span>{OWNER.address}</span>
        </div>
      </footer>
    </div>
  );
}
