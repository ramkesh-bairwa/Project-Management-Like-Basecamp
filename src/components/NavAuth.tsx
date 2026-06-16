'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function NavAuth() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'));
  }, []);

  function logout() {
    window.location.href = '/logout';
  }

  if (loggedIn) {
    return (
      <>
        <Link href="/dashboard" style={{ padding: '7px 16px', borderRadius: 8, color: '#1d3557', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Dashboard</Link>
        <button onClick={logout} style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(230,57,70,0.3)' }}>
          Logout
        </button>
      </>
    );
  }

  return (
    <>
      <Link href="/login" className="nav-link" style={{ padding: '7px 16px', borderRadius: 8, color: '#1d3557', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>Sign In</Link>
      <Link href="/register" style={{ padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg,#e63946,#c1121f)', color: '#fff', fontWeight: 700, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(230,57,70,0.3)' }}>Get Started Free</Link>
    </>
  );
}
