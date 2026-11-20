'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/** Auth-aware CTA buttons for the public nav. `stacked` = full-width (mobile menu). */
export default function NavAuth({ stacked = false }: { stacked?: boolean }) {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
  }, []);

  function logout() {
    window.location.href = '/logout';
  }

  const ghost = `btn btn-ghost btn-sm ${stacked ? 'btn-secondary !h-11 w-full' : ''}`;
  const primary = `btn btn-primary btn-sm ${stacked ? '!h-11 w-full' : ''}`;
  const arrow = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );

  if (loggedIn) {
    return (
      <>
        <Link href="/dashboard" className={`group ${primary}`}>Dashboard {arrow}</Link>
        <button type="button" onClick={logout} className={ghost}>Logout</button>
      </>
    );
  }

  return (
    <>
      <Link href="/login" className={ghost}>Sign in</Link>
      <Link href="/register" className={`group ${primary}`}>Get started {arrow}</Link>
    </>
  );
}
