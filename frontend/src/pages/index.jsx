import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useWeb3Modal } from '@web3modal/ethers5/react';

export default function HomePage() {
  const { address, role, status, isConnected, isAuthenticated, loading } = useAuth();
  const { open } = useWeb3Modal();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Jika belum authenticated, arahkan ke register
    if (!isAuthenticated) {
      if (isConnected && address) {
        router.push('/login');
      }
      return;
    }

    // Jika authenticated tapi status pending, arahkan ke pending-verification
    if (status === 'pending_approval') {
      router.push('/pending-verification');
      return;
    }

    // Authenticated dan approved → arahkan ke dashboard sesuai role
    if (role === 'patient') {
      router.push('/patient/dashboard');
    } else if (role === 'herbal_doctor') {
      router.push('/herbs/dashboard');
    } else if (role === 'doctor') {
      router.push('/doctor/dashboard');
    } else if (role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      // Role tidak dikenali atau belum terdaftar
      router.push('/login');
    }
  }, [role, status, isConnected, isAuthenticated, loading, address, router]);

  return (
    <div style={{ textAlign: 'center', padding: '100px', fontFamily: 'sans-serif' }}>
      <h1>🌿 Sistem Rekam Medis Herbal Blockchain</h1>
      
      {!isConnected ? (
        <div style={{ marginTop: '20px' }}>
          <p>Selamat Datang. Silakan hubungkan dompet MetaMask Anda.</p>
          <button 
            onClick={() => open()}
            style={{ padding: '15px 30px', fontSize: '1.1rem', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Hubungkan Wallet
          </button>
        </div>
      ) : (
        <div>
          <p>⌛ Mengarahkan ke halaman yang sesuai...</p>
        </div>
      )}
    </div>
  );
}