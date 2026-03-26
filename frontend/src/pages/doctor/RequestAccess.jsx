import React from 'react';
import { Info, Send, Plus } from 'lucide-react';

const RequestAccess = ({ 
  patientAddr, 
  setPatientAddr, 
  handleRequest, 
  txLoading,
  pendingRequests = [],
  approvedDocs = [] 
}) => {
  return (
    <div className="request-wrapper">
      {/* 1. HEADER SECTION (Sesuai Gaya Beranda) */}
      <div className="header-content">
        <div>
          <h2 className="title">Request Akses</h2>
          <p className="subtitle">Kirim dan pantau status permintaan akses ke data pasien</p>
        </div>
        {/* Tombol bisa dikosongkan atau dipakai untuk reset form */}
        <div className="header-action-placeholder"></div>
      </div>

      {/* 2. ALERT INFO (Warna Biru Cerah) */}
      <div className="alert-info">
        <div className="alert-icon"><Info size={20} /></div>
        <div className="alert-text">
          <p>
            Masukkan alamat wallet pasien untuk meminta izin akses. Pasien akan menerima 
            notifikasi dan kamu bisa mulai mengisi diagnosa setelah mereka menyetujuinya.
          </p>
        </div>
      </div>

      <div className="main-grid-request">
        {/* FORM CARD */}
        <div className="request-card">
          <div className="card-header-simple">
             <h3>Kirim request akses baru</h3>
          </div>
          <form onSubmit={handleRequest}>
            <div className="form-group">
              <label>ID Pasien (Wallet Address)</label>
              <input 
                type="text" 
                placeholder="0x..." 
                value={patientAddr}
                onChange={(e) => setPatientAddr(e.target.value)}
                required
                className="input-field"
              />
              <p className="input-hint">Pastikan alamat wallet pasien valid.</p>
            </div>

            <button 
              type="submit" 
              className="btn-submit" 
              disabled={txLoading || !patientAddr}
            >
              <Send size={18} />
              <span>{txLoading ? "Memproses..." : "Kirim Request"}</span>
            </button>
          </form>
        </div>

        {/* TABEL RIWAYAT (Background Putih Bersih) */}
       <div className="history-card">
        <div className="card-header-simple">
          <h3>Riwayat Request Terbaru</h3>
        </div>
        <div className="table-responsive">
          <table className="request-table">
            <thead>
              <tr>
                <th>Informasi Pasien</th> {/* Satu kolom untuk Nama & Wallet */}
                <th>Status</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. TAMPILKAN YANG SUDAH DISETUJUI (Approved) */}
  {approvedDocs.length > 0 && approvedDocs.map((req, idx) => (
    <tr key={`app-${idx}`}>
      <td className="info-cell">
        <div className="patient-name">{req.name || "Pasien Terdaftar"}</div>
        <div className="patient-addr">{req.address.substring(0, 16)}...</div>
      </td>
      <td>
        <span className="status-tag success">Disetujui</span>
      </td>
      <td className="time-cell">Selesai</td>
    </tr>
  ))}

  {/* 2. TAMPILKAN YANG MASIH MENUNGGU (Pending) */}
  {pendingRequests.length > 0 && pendingRequests.map((req, idx) => (
    <tr key={`pen-${idx}`}>
      <td className="info-cell">
        <div className="patient-name">{req.name || "Pasien Terdaftar"}</div>
        <div className="patient-addr">{req.address.substring(0, 16)}...</div>
      </td>
      <td>
        <span className="status-tag waiting">Menunggu</span>
      </td>
      <td className="time-cell">{req.date || 'Baru saja'}</td>
    </tr>
  ))}

  {typeof rejectedRequests !== 'undefined' && rejectedRequests.map((req, idx) => (
    <tr key={`rej-${idx}`}>
      <td className="info-cell">
        <div className="patient-name">{req.name}</div>
        <div className="patient-addr">{req.address.substring(0, 16)}...</div>
      </td>
      <td>
        <span className="status-tag rejected">Ditolak</span>
      </td>
      <td className="time-cell">Oleh Pasien</td>
    </tr>
  ))}

              {/* 4. JIKA SEMUA KOSONG */}
              {approvedDocs.length === 0 && pendingRequests.length === 0 && (
                <tr>
                  <td colSpan="3" className="empty-row">Belum ada riwayat permintaan akses.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      <style jsx>{`
      /* Hijau untuk Disetujui */
.status-tag.success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

/* Kuning/Oranye untuk Menunggu */
.status-tag.waiting {
  background: #fff8e1;
  color: #f57f17;
  border: 1px solid #ffecb3;
}

/* Merah untuk Ditolak */
.status-tag.rejected {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #ffcdd2;
}

.status-tag {
  font-size: 10px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 20px;
  text-transform: uppercase;
}
        /* Background utama dibuat lebih terang (Putih Kebiruan Sangat Muda) */
        .request-wrapper { 
          padding: 10px 0; 
          background: transparent; 
        }

        /* HEADER STYLE */
        .header-content { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 25px; 
        }
        .title { font-size: 24px; font-weight: 700; margin: 0; color: #333; }
        .subtitle { font-size: 14px; color: #666; margin-top: 4px; }

        .alert-info {
          background: #e3f2fd; 
          border: 1px solid #bbdefb;
          border-radius: 16px; 
          padding: 18px;
          display: flex; 
          gap: 15px; 
          margin-bottom: 30px;
        }
        .alert-icon { color: #1976d2; }
        .alert-text p { margin: 0; font-size: 14px; color: #0d47a1; line-height: 1.5; }

        .main-grid-request { display: flex; flex-direction: column; gap: 25px; }

        /* CARD STYLE (Putih Bersih) */
        .request-card, .history-card {
          background: #ffffff; 
          border: 1px solid #f0f0f0;
          border-radius: 24px; 
          padding: 25px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }

        .card-header-simple h3 {
          margin: 0 0 20px 0; 
          font-size: 17px; 
          color: #333;
          font-weight: 700;
        }

        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #555; }
        
        /* Input Field Lebih Cerah */
        .input-field {
          width: 100%; 
          padding: 14px 15px; 
          border: 1.5px solid #eee;
          border-radius: 12px; 
          font-family: monospace; 
          font-size: 14px;
          background: #fff; 
          transition: 0.2s;
        }
        .input-field:focus { outline: none; border-color: #2e7d32; box-shadow: 0 0 0 3px rgba(46, 125, 50, 0.1); }
        
        .btn-submit {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: #2e7d32; color: white; border: none;
          padding: 14px 25px; border-radius: 12px; font-weight: 600;
          cursor: pointer; width: 100%; transition: 0.2s;
        }
        .btn-submit:hover { background: #1b5e20; }
        .btn-submit:disabled { background: #ccc; }

        /* TABLE STYLE */
        .request-table { width: 100%; border-collapse: collapse; }
        .request-table th { text-align: left; padding: 12px; font-size: 12px; color: #999; border-bottom: 1px solid #f0f0f0; text-transform: uppercase; letter-spacing: 0.5px; }
        .request-table td { padding: 16px 12px; font-size: 14px; border-bottom: 1px solid #fafafa; }
        .addr-cell { font-family: monospace; color: #444; font-weight: 500; }
        .status-tag { padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .status-tag.waiting { background: #fff8e1; color: #f57f17; }
        .empty-row { text-align: center; color: #bbb; padding: 40px 0; font-style: italic; }

        .info-cell {
          padding: 12px;
        }
        .patient-name {
          font-weight: 700; /* Nama Bold */
          color: #333;
          font-size: 14px;
          margin-bottom: 2px;
        }
        .patient-addr {
          font-size: 11px; /* Wallet lebih kecil */
          color: #888;
          font-family: monospace;
        }
        .request-table {
          width: 100%;
          border-collapse: collapse;
        }
        .request-table th {
          text-align: left;
          font-size: 12px;
          color: #999;
          padding: 10px 12px;
          border-bottom: 1px solid #eee;
        }
        .request-table td {
          border-bottom: 1px solid #fafafa;
          vertical-align: middle;
        }
        .status-tag {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 20px;
        }
        .status-tag.waiting {
          background: #fff8e1;
          color: #f57f17;
        }
        .time-cell {
          font-size: 12px;
          color: #999;
        }
        .empty-row {
          text-align: center;
          padding: 40px;
          color: #bbb;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default RequestAccess;