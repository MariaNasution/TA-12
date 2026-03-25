import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useWeb3Modal } from '@web3modal/ethers5/react';

export default function HomePage() {
  const { address, role, isConnected, loading } = useAuth();
  const { open } = useWeb3Modal();
  const router = useRouter();

  useEffect(() => {
    // Tunggu sampai loading selesai dan wallet sudah terhubung
    if (!loading && isConnected) {
      if (role === 'none') {
        console.log("User belum terdaftar, mengarahkan ke halaman registrasi...");
        router.push('/register');
      } else if (role === 'patient') {
        router.push('/patient/dashboard');
      } else if (role === 'doctor' || role === 'herbal_doctor') {
        router.push('/doctor/dashboard');
      } else if (role === 'admin') {
        router.push('/admin/dashboard');
      }
    }
  }, [role, isConnected, loading, router]);

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
          <p>⌛ Mengarahkan ke halaman registrasi...</p>
        </div>
      )}
    </div>
  );
}