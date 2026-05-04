'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getToken } from '@/lib/client-auth';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JitsiMeetExternalAPI: new (domain: string, options: any) => { dispose: () => void };
  }
}

export default function MeetingRoomPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const router = useRouter();
  const jitsiRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<{ dispose: () => void } | null>(null);
  const [userName, setUserName] = useState('Guest');
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user name
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    fetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d?.name) setUserName(d.name); });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { apiRef.current?.dispose(); };
  }, []);

  // Init Jitsi AFTER joined=true so the div is in the DOM
  useEffect(() => {
    if (!joined || !jitsiRef.current) return;

    const roomName = `projecthub-${meetingId}`;

    function initJitsi() {
      if (!jitsiRef.current) return;
      try {
        apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
          roomName,
          parentNode: jitsiRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName: userName },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableNoisyMicDetection: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            TOOLBAR_ALWAYS_VISIBLE: true,
          },
        });
        setLoading(false);
      } catch (err) {
        setError('Failed to start meeting. Please try again.');
        setLoading(false);
        setJoined(false);
      }
    }

    // If Jitsi script already loaded
    if (window.JitsiMeetExternalAPI) {
      initJitsi();
      return;
    }

    // Load Jitsi script
    const existing = document.getElementById('jitsi-script');
    if (existing) {
      existing.addEventListener('load', initJitsi);
      return;
    }

    const script = document.createElement('script');
    script.id = 'jitsi-script';
    script.src = 'https://meet.jit.si/external_api.js';
    script.async = true;
    script.onload = initJitsi;
    script.onerror = () => {
      setError('Could not load meeting SDK. Check your internet connection.');
      setLoading(false);
      setJoined(false);
    };
    document.head.appendChild(script);
  }, [joined, meetingId, userName]);

  function handleJoin() {
    setLoading(true);
    setError('');
    setJoined(true); // triggers useEffect above after render
  }

  function leaveMeeting() {
    apiRef.current?.dispose();
    apiRef.current = null;
    router.back();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: '#0f172a', zIndex: 9999 }}>

      {/* Top bar */}
      <div style={{ background: '#1d3557', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}
        className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style={{ background: '#e63946' }}>📹</div>
          <div>
            <div className="font-black text-white text-sm">Video Meeting</div>
            <div className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>{meetingId}</div>
          </div>
        </div>
        <button onClick={leaveMeeting}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 transition"
          style={{ background: '#e63946' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Leave
        </button>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* Jitsi container — always in DOM, hidden until joined */}
        <div
          ref={jitsiRef}
          style={{
            position: 'absolute', inset: 0,
            visibility: joined ? 'visible' : 'hidden',
            pointerEvents: joined ? 'auto' : 'none',
          }}
        />

        {/* Pre-join screen */}
        {!joined && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
            <div className="text-center">
              <div style={{ fontSize: 64, marginBottom: 16 }}>📹</div>
              <div className="font-black text-white" style={{ fontSize: 24, marginBottom: 8 }}>Ready to join?</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 4 }}>
                You'll join as <span style={{ color: '#fff', fontWeight: 700 }}>{userName}</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: 'monospace' }}>
                Room: projecthub-{meetingId}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm font-bold text-white" style={{ background: '#e63946', maxWidth: 360, textAlign: 'center' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={loading}
              className="flex items-center gap-3 rounded-2xl font-black text-white hover:opacity-90 disabled:opacity-50 transition"
              style={{ background: '#2a9d8f', padding: '16px 40px', fontSize: 18 }}>
              {loading ? (
                <>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }} />
                  Connecting…
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                  Join Meeting
                </>
              )}
            </button>

            <button onClick={() => router.back()}
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}
              className="hover:text-white transition">
              ← Go back
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
