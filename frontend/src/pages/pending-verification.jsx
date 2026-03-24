import React from 'react';
import { useRouter } from 'next/router';
import { Clock, CheckCircle, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PendingVerification = () => {
  const { userName, logout, checkStatus } = useAuth();
  const router = useRouter();

  return (
    <div className="pending-container">
      <div className="pending-card">
        {/* Icon Animasi Jam Pasir/Tunggu */}
        <div className="icon-wrapper">
          <Clock size={48} className="icon-pulse" />
        </div>

        <h1 className="title">Pendaftaran Diterima!</h1>
        <p className="subtitle">
          Halo. Akun Anda telah berhasil terdaftar di Blockchain.
        </p>

        <div className="status-box">
          <div className="status-item">
            <CheckCircle size={18} color="#4caf50" />
            <span>Registrasi Blockchain Berhasil</span>
          </div>
          <div className="status-item current">
            <RefreshCw size={18} className="icon-spin" color="#2196f3" />
            <span>Menunggu Verifikasi Admin</span>
          </div>
        </div>

        <p className="info-text">
          Admin sedang memeriksa dokumen dan spesialisasi Anda. 
          Halaman ini akan otomatis dialihkan setelah akun Anda disetujui.
        </p>

        <div className="action-buttons">
          <button onClick={() => window.location.reload()} className="btn-refresh">
            <RefreshCw size={16} /> Cek Status Sekarang
          </button>
          
          <button onClick={logout} className="btn-logout">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </div>

      <style jsx>{`
        .pending-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: #f4f7f6;
          font-family: 'Inter', sans-serif;
        }
        .pending-card {
          background: white;
          padding: 40px;
          border-radius: 20px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.05);
          text-align: center;
          max-width: 450px;
          width: 90%;
        }
        .icon-wrapper {
          background: #e3f2fd;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
          color: #2196f3;
        }
        .title { font-size: 24px; color: #333; margin-bottom: 10px; }
        .subtitle { color: #666; font-size: 15px; line-height: 1.5; }
        
        .status-box {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 12px;
          margin: 25px 0;
          text-align: left;
        }
        .status-item {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-size: 14px;
          color: #888;
        }
        .status-item.current { color: #2196f3; font-weight: 600; }
        
        .info-text { font-size: 13px; color: #999; margin-bottom: 30px; }

        .action-buttons { display: flex; flex-direction: column; gap: 10px; }
        
        .btn-refresh {
          background: #2e7d32;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-logout {
          background: none;
          border: 1px solid #ddd;
          color: #666;
          padding: 10px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* Animasi */
        .icon-pulse { animation: pulse 2s infinite; }
        .icon-spin { animation: spin 2s linear infinite; }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PendingVerification;