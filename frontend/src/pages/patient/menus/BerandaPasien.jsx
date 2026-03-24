import React from 'react';
import { Plus } from 'lucide-react';

const BerandaPasien = ({ 
  medicalRecords = [], 
  pendingDocs = [], 
  approvedDocs = [], 
  rekomendasiCount = 0, // Tambahkan ini
  changeTab,
}) => {
  
  const recentRecords = medicalRecords.slice(0, 2);

  return (
    <div className="beranda-wrapper">
      <div className="header-content">
        <div>
          <h2 className="title">Beranda</h2>
          <p className="subtitle">Ringkasan kondisi & rekomendasi terbaru</p>
        </div>
        <button className="btn-minta" onClick={() => changeTab('rekomendasi')}>
          <Plus size={18} />
          <span>Minta Rekomendasi</span>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Rekomendasi diterima</span>
          <h2 className="stat-value">{rekomendasiCount}</h2> 
          <span className="stat-sub">Sepanjang waktu</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Data medis tercatat</span>
          <h2 className="stat-value">{medicalRecords.length}</h2>
          <span className="stat-sub">{approvedDocs.length > 0 ? `Dari ${approvedDocs.length} dokter` : "Belum ada dokter"}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Dokter terotorisasi</span>
          <h2 className="stat-value">{approvedDocs.length}</h2>
          <span className="stat-sub">Akses aktif</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Menunggu persetujuan</span>
          <h2 className={`stat-value ${pendingDocs.length > 0 ? 'text-red' : ''}`}>
            {pendingDocs.length}
          </h2>
          <span className="stat-sub">Request baru</span>
        </div>
      </div>

      <div className="main-grid">
        <div className="card-white">
          <div className="card-header">
            <h3>Rekomendasi terbaru</h3>
            <span className="link" onClick={() => changeTab('rekomendasi')}>Tanya AI →</span>
          </div>
          <div className="list-items">
            <p className="empty-text">Lihat riwayat lengkap di menu Rekomendasi.</p>
          </div>
        </div>

        <div className="card-white">
          <div className="card-header">
            <h3>Status Akses Dokter</h3>
            <span className="link" onClick={() => changeTab('akses_dokter')}>Kelola izin →</span>
          </div>

          <div className="list-items">
            {/* 1. Tampilkan yang Menunggu (Pending) */}
            {pendingDocs.map((doc, idx) => (
              <div key={`pending-${idx}`} className="doc-item-row">
                <div className="doc-main-info">
                  <p className="doc-name">{doc.name}</p>
                  <p className="doc-sub">{doc.address.substring(0, 20)}...</p>
                </div>
                <div className="status-badge-baru waiting">Menunggu</div>
              </div>
            ))}

            {/* 2. Tampilkan yang Aktif (Approved) */}
            {approvedDocs.map((doc, idx) => (
              <div key={`approved-${idx}`} className="doc-item-row">
                <div className="doc-main-info">
                  <p className="doc-name">{doc.name}</p>
                  <p className="doc-sub">{doc.address.substring(0, 20)}...</p>
                </div>
                <div className="status-badge-baru aktif">Aktif</div>
              </div>
            ))}

            {/* Jika semua kosong */}
            {pendingDocs.length === 0 && approvedDocs.length === 0 && (
              <p className="empty-text">Belum ada aktivitas akses dokter.</p>
            )}
          </div>
        </div>
      </div>

      <div className="bottom-section">
        <div className="card-white full-width">
            <div className="card-header">
              <h3>Riwayat data medis terbaru</h3>
              <span className="link" onClick={() => changeTab('riwayat_medis')}>Lihat semua →</span>
            </div>
          <div className="medical-list">
            {medicalRecords.length === 0 ? (
              <p className="empty-text">Belum ada rekam medis.</p>
            ) : (
              recentRecords.map((rec, idx) => (
                <div className="medical-item" key={idx}>
                  <div className="medical-info">
                    <p className="med-title">{rec.diagnosis}</p>
                    <p className="med-doc">{new Date(rec.timestamp * 1000).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="medical-tags">
                    <span className="tag">CID: {rec.cid.substring(0, 10)}...</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .beranda-wrapper { padding-top: 10px; }
        .header-content { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; }
        .title { font-size: 24px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { font-size: 14px; color: #666; margin: 4px 0 0 0; }
        .btn-minta { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #eee; padding: 10px 16px; border-radius: 12px; font-weight: 600; cursor: pointer; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
        .stat-card { background: #F9F9F7; border: 1px solid #F0F0EE; padding: 18px; border-radius: 16px; }
        .stat-label { font-size: 12px; color: #777; display: block; }
        .stat-value { font-size: 28px; font-weight: 700; margin: 8px 0; color: #333; }
        .text-red { color: #D32F2F !important; }
        .stat-sub { font-size: 11px; color: #999; }
        
        .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .card-white { background: white; border: 1px solid #f0f0f0; border-radius: 20px; padding: 20px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .card-header h3 { font-size: 16px; margin: 0; }
        .link { font-size: 12px; color: #2E7D32; font-weight: 600; cursor: pointer; }
        
        .item-doctor-action { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #fafafa; }
        .action-buttons { display: flex; gap: 8px; }
        .btn-approve { background: #e8f5e9; color: #2e7d32; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; }
        .btn-reject { background: #ffebee; color: #c62828; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; }
        
        .medical-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #fafafa; }
        .doc-name, .med-title { font-weight: 600; margin: 0; font-size: 14px; }
        .doc-sub, .med-doc { font-size: 11px; color: #999; margin: 2px 0 0 0; }
        .tag { background: #f0f4f8; color: #555; padding: 4px 10px; border-radius: 6px; font-size: 11px; }
        .empty-text { font-size: 13px; color: #aaa; font-style: italic; text-align: center; width: 100%; padding: 10px 0; }
        .bottom-section { margin-top: 20px; }
        .full-width { width: 100%; }

        .doc-item-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #f9f9f9;
        }

        .doc-name {
          font-weight: 700;
          font-size: 14px;
          margin: 0;
          color: #333;
        }

        .doc-sub {
          font-size: 11px;
          color: #999;
          margin: 2px 0 0 0;
        }

        /* Base style untuk semua badge */
        .status-badge-baru {
          font-size: 10px;
          font-weight: 700;
          padding: 4px 12px;
          border-radius: 20px;
          text-transform: uppercase;
        }

        /* Warna HIJAU untuk Aktif */
        .status-badge-baru.aktif {
          background: #e8f5e9;
          color: #2e7d32;
        }

        /* Warna KUNING untuk Menunggu */
        .status-badge-baru.waiting {
          background: #fff8e1;
          color: #f57f17;
        }

        /* Warna MERAH untuk Ditolak (Jika Maria ingin menambahkan list ditolak) */
        .status-badge-baru.rejected {
          background: #ffeead;
          color: #c62828;
        }

        .empty-text {
          font-size: 13px;
          color: #aaa;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default BerandaPasien;