import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Clock, CheckCircle, LogOut, RefreshCw, AlertCircle, Upload, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const PendingVerification = () => {
  const { address, userName, logout, checkStatus } = useAuth();
  const router = useRouter();
  const [statusInfo, setStatusInfo] = useState({ status: 'pending', reason: '' });
  const [loading, setLoading] = useState(true);
  
  // State for re-upload
  const [showReupload, setShowReupload] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchCurrentStatus = async () => {
    if (!address) return;
    try {
      const res = await axios.get(`http://127.0.0.1:5000/auth/status/${address}`);
      if (res.data) {
        setStatusInfo({
          status: res.data.verification_status,
          reason: res.data.rejection_reason
        });
        
        if (res.data.verification_status === 'verified') {
           await checkStatus();
        }
      }
    } catch (err) {
      // Jika 404, mungkin data sedang sinkronisasi, jangan log sebagai error keras dulu
      if (err.response?.status === 404) {
        console.warn("Status belum tersedia di database, mencoba sinkronisasi...");
      } else {
        console.error("Gagal ambil status:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentStatus();
    const interval = setInterval(fetchCurrentStatus, 10000); // Cek tiap 10 detik
    return () => clearInterval(interval);
  }, [address]);

  const handleReupload = async () => {
    if (!newFile) return alert("Pilih file terlebih dahulu!");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("address", address);
      formData.append("document", newFile);
      formData.append("role", "doctor"); // backend update Logic
      
      // Gunakan endpoint khusus reupload agar tidak trigger 409 duplicate
      const res = await axios.post('http://127.0.0.1:5000/auth/reupload-document', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.status === 200) {
        alert("Dokumen berhasil diunggah ulang! Menunggu verifikasi kembali.");
        setShowReupload(false);
        setNewFile(null);
        fetchCurrentStatus();
      }
    } catch (err) {
      alert("Gagal unggah ulang: " + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="pending-container">
      <div className="pending-card">
        {statusInfo.status === 'rejected' ? (
           <div className="icon-wrapper rejected">
             <AlertCircle size={48} />
           </div>
        ) : (
          <div className="icon-wrapper">
            <Clock size={48} className="icon-pulse" />
          </div>
        )}

        <h1 className="title">
          {statusInfo.status === 'rejected' ? 'Verifikasi Ditolak' : 'Pendaftaran Diterima!'}
        </h1>
        
        <p className="subtitle">
          {statusInfo.status === 'rejected' 
            ? `Maaf ${userName}, dokumen Anda tidak dapat kami verifikasi.`
            : `Halo ${userName}. Akun Anda sedang dalam proses peninjauan.`}
        </p>

        {statusInfo.status === 'rejected' && statusInfo.reason && (
          <div className="reason-box">
            <p className="reason-label">Alasan Penolakan:</p>
            <p className="reason-text">"{statusInfo.reason}"</p>
          </div>
        )}

        <div className="status-box">
          <div className="status-item">
            <CheckCircle size={18} color="#4caf50" />
            <span>Registrasi Blockchain Berhasil</span>
          </div>
          
          {statusInfo.status === 'rejected' ? (
            <div className="status-item rejected">
              <X size={18} color="#f44336" />
              <span>Verifikasi Dokumen Gagal</span>
            </div>
          ) : (
            <div className="status-item current">
              <RefreshCw size={18} className={statusInfo.status === 'pending' ? 'icon-spin' : ''} color="#2196f3" />
              <span>Menunggu Verifikasi Admin</span>
            </div>
          )}
        </div>

        <p className="info-text">
          {statusInfo.status === 'rejected' 
            ? 'Silakan unggah ulang dokumen STR/SIP Anda yang valid untuk melanjutkan.'
            : 'Admin sedang memeriksa dokumen dan spesialisasi Anda. Halaman ini akan otomatis dialihkan setelah akun Anda disetujui.'}
        </p>

        <div className="action-buttons">
          {statusInfo.status === 'rejected' ? (
            <button onClick={() => setShowReupload(true)} className="btn-reupload">
              <Upload size={16} /> Unggah Ulang Dokumen
            </button>
          ) : (
            <button onClick={fetchCurrentStatus} className="btn-refresh">
              <RefreshCw size={16} /> Cek Status Sekarang
            </button>
          )}
          
          <button onClick={logout} className="btn-logout">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </div>

      {/* Modal Re-upload */}
      {showReupload && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Unggah Ulang STR/SIP</h3>
              <button onClick={() => setShowReupload(false)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                Pastikan foto dokumen jelas (Format: JPG/PNG/PDF).
              </p>
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.pdf" 
                onChange={(e) => setNewFile(e.target.files[0])}
                style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '8px' }}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowReupload(false)} className="btn-cancel">Batal</button>
              <button 
                onClick={handleReupload} 
                disabled={uploading || !newFile}
                className="btn-confirm-upload"
              >
                {uploading ? 'Mengunggah...' : 'Unggah Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .pending-container {
          display: flex; justify-content: center; align-items: center;
          min-height: 100vh; background: #f4f7f6; font-family: 'Inter', sans-serif;
        }
        .pending-card {
          background: white; padding: 40px; border-radius: 24px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.06);
          text-align: center; max-width: 480px; width: 90%;
        }
        .icon-wrapper {
          background: #e3f2fd; width: 80px; height: 80px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 24px; color: #2196f3;
        }
        .icon-wrapper.rejected { background: #ffebee; color: #f44336; }
        
        .title { font-size: 26px; font-weight: 800; color: #1a202c; margin-bottom: 12px; }
        .subtitle { color: #4a5568; font-size: 15.5px; line-height: 1.6; }
        
        .reason-box {
          background: #fff5f5; border: 1px solid #fed7d7; border-radius: 12px;
          padding: 16px; margin: 20px 0; text-align: left;
        }
        .reason-label { font-size: 13px; font-weight: 700; color: #c53030; margin-bottom: 4px; }
        .reason-text { font-size: 14px; color: #742a2a; font-style: italic; margin: 0; }

        .status-box {
          background: #f8fafc; padding: 20px; border-radius: 16px; border: 1px solid #edf2f7;
          margin: 25px 0; text-align: left;
        }
        .status-item { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font-size: 14.5px; color: #718096; }
        .status-item:last-child { margin-bottom: 0; }
        .status-item.current { color: #2196f3; font-weight: 600; }
        .status-item.rejected { color: #f44336; font-weight: 600; }
        
        .info-text { font-size: 13.5px; color: #a0aec0; margin-bottom: 32px; line-height: 1.5; }

        .action-buttons { display: flex; flex-direction: column; gap: 12px; }
        
        .btn-refresh, .btn-reupload {
          background: #2e7d32; color: white; border: none; padding: 14px;
          border-radius: 12px; cursor: pointer; font-weight: 700; font-size: 15px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: all 0.2s; box-shadow: 0 4px 6px rgba(46, 125, 50, 0.2);
        }
        .btn-reupload { background: #3182ce; box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2); }
        .btn-refresh:hover, .btn-reupload:hover { transform: translateY(-2px); filter: brightness(1.1); }
        
        .btn-logout {
          background: white; border: 1px solid #e2e8f0; color: #4a5568; padding: 12px;
          border-radius: 12px; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 10px; font-weight: 600; transition: all 0.2s;
        }
        .btn-logout:hover { background: #f7fafc; color: #2d3748; }

        /* Modal Styles */
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center;
          z-index: 1000; backdrop-filter: blur(4px);
        }
        .modal-content {
          background: white; border-radius: 20px; padding: 28px; width: 90%; maxWidth: 440px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); animation: modalIn 0.3s ease;
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-header h3 { margin: 0; font-size: 19px; font-weight: 800; color: #1a202c; }
        .close-btn { background: none; border: none; cursor: pointer; color: #a0aec0; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 28px; }
        .btn-cancel { padding: 11px 22px; background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 600; color: #4a5568; }
        .btn-confirm-upload {
          padding: 11px 22px; background: #3182ce; color: white; border: none;
          border-radius: 10px; cursor: pointer; font-size: 14px; font-weight: 700;
          box-shadow: 0 4px 6px rgba(49, 130, 206, 0.2);
        }
        .btn-confirm-upload:disabled { opacity: 0.6; cursor: not-allowed; }

        .icon-pulse { animation: pulse 2s infinite; }
        .icon-spin { animation: spin 2.5s linear infinite; }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes modalIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default PendingVerification;