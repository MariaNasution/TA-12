import React from 'react';
import { Plus, Users, Clock, FileText, XCircle } from 'lucide-react';

const BerandaDokter = ({ 
  stats = { active: 0, pending: 0, totalInput: 0, rejected: 0 },
  activePatients = [], 
  recentRequests = [],
  recentInputs = [],
  changeTab 
}) => {

  return (
    <div className="beranda-wrapper">
      {/* Header Section */}
      <div className="header-content">
        <div>
          <h2 className="title">Beranda</h2>
          <p className="subtitle">Ringkasan aktivitas dan pasien aktif</p>
        </div>
        <button className="btn-action" onClick={() => changeTab('request')}>
          <Plus size={18} />
          <span>Request Akses Pasien</span>
        </button>
      </div>

      {/* Stats Grid - Sesuai Gambar */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Pasien aktif</span>
          <h2 className="stat-value">{stats.active}</h2>
          <span className="stat-sub">Akses disetujui</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Request menunggu</span>
          <h2 className="stat-value text-orange">{stats.pending}</h2>
          <span className="stat-sub">Belum diproses</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Data medis diinput</span>
          <h2 className="stat-value">{stats.totalInput}</h2>
          <span className="stat-sub">Sepanjang waktu</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Request ditolak</span>
          <h2 className="stat-value text-red">{stats.rejected}</h2>
          <span className="stat-sub">Oleh pasien</span>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="main-grid">
        {/* Kolom Kiri: Pasien Aktif */}
        <div className="card-white">
          <div className="card-header">
            <h3>Pasien aktif</h3>
            <span className="link" onClick={() => changeTab('list')}>Lihat semua →</span>
          </div>
          <div className="list-items">
            {activePatients.length > 0 ? activePatients.map((p, idx) => (
              <div key={idx} className="item-row">
                <div className="avatar">{p.name?.substring(0, 2).toUpperCase()}</div>
                <div className="item-info">
                  <p className="item-title">{p.name}</p>
                  <p className="item-sub">Aktif sejak {p.date}</p>
                </div>
                <span className="badge-status aktif">Aktif</span>
              </div>
            )) : <p className="empty-text">Tidak ada pasien aktif.</p>}
          </div>
        </div>

        {/* Kolom Kanan: Status Request Terbaru */}
        <div className="card-white">
          <div className="card-header">
            <h3>Status request terbaru</h3>
            <span className="link" onClick={() => changeTab('request')}>Kelola →</span>
          </div>
          <div className="list-items">
            {recentRequests.length > 0 ? recentRequests.map((r, idx) => (
              <div key={idx} className="item-row">
                <div className="avatar gray">{r.name?.substring(0, 2).toUpperCase()}</div>
                <div className="item-info">
                  <p className="item-title">{r.name}</p>
                  <p className="item-sub">Dikirim {r.date}</p>
                </div>
                <span className={`badge-status ${r.status.toLowerCase()}`}>
                  {r.status}
                </span>
              </div>
            )) : <p className="empty-text">Tidak ada request terbaru.</p>}
          </div>
        </div>
      </div>

      {/* Section Bawah: Input Data Medis Terbaru */}
      <div className="bottom-section">
        <div className="card-white full-width">
          <div className="card-header">
            <h3>Input data medis terbaru</h3>
            <span className="link" onClick={() => changeTab('riwayat')}>Lihat semua →</span>
          </div>
          <div className="medical-history-list">
            {recentInputs.length > 0 ? recentInputs.map((input, idx) => (
              <div key={idx} className="medical-record-item">
                <div className="record-info">
                  <h4>Pemeriksaan Rutin – {input.patientName}</h4>
                  <p>Pasien: {input.patientName}</p>
                  <div className="tag-container">
                    {input.tags?.map((tag, tIdx) => (
                      <span key={tIdx} className="tag-medis">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="record-date">{input.date}</div>
              </div>
            )) : <p className="empty-text">Belum ada riwayat input data.</p>}
          </div>
        </div>
      </div>

      <style jsx>{`
        .beranda-wrapper { padding: 10px 0; }
        .header-content { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
        .title { font-size: 24px; font-weight: 700; margin: 0; }
        .subtitle { font-size: 14px; color: #666; margin-top: 4px; }
        .btn-action { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #ddd; padding: 10px 18px; border-radius: 12px; font-weight: 600; cursor: pointer; }
        
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #F9F9F7; border: 1px solid #F0F0EE; padding: 20px; border-radius: 16px; }
        .stat-label { font-size: 13px; color: #666; }
        .stat-value { font-size: 32px; font-weight: 700; margin: 10px 0; }
        .stat-sub { font-size: 12px; color: #888; }
        .text-orange { color: #f57c00; }
        .text-red { color: #d32f2f; }

        .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 25px; }
        .card-white { background: white; border: 1px solid #eee; border-radius: 20px; padding: 24px; }
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .card-header h3 { font-size: 17px; margin: 0; color: #333; }
        .link { font-size: 13px; color: #2E7D32; font-weight: 600; cursor: pointer; }

        .item-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f9f9f9; }
        .avatar { width: 40px; height: 40px; background: #e3f2fd; color: #1976d2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px; }
        .avatar.gray { background: #f5f5f5; color: #757575; }
        .item-info { flex: 1; }
        .item-title { font-weight: 600; font-size: 14px; margin: 0; }
        .item-sub { font-size: 12px; color: #999; margin: 2px 0 0 0; }

        .badge-status { font-size: 10px; font-weight: 700; padding: 4px 12px; border-radius: 20px; text-transform: capitalize; }
        .badge-status.aktif { background: #e8f5e9; color: #2e7d32; }
        .badge-status.menunggu { background: #fff3e0; color: #f57c00; }
        .badge-status.ditolak { background: #ffebee; color: #c62828; }

        .bottom-section { margin-top: 25px; }
        .medical-record-item { display: flex; justify-content: space-between; padding: 15px 0; border-bottom: 1px solid #f5f5f5; }
        .medical-record-item h4 { margin: 0 0 5px 0; font-size: 15px; color: #333; }
        .medical-record-item p { margin: 0; font-size: 13px; color: #666; }
        .tag-container { display: flex; gap: 8px; margin-top: 8px; }
        .tag-medis { background: #f0f4f8; color: #555; padding: 4px 12px; border-radius: 8px; font-size: 11px; font-weight: 500; }
        .record-date { font-size: 13px; color: #999; }
        .empty-text { font-size: 14px; color: #bbb; text-align: center; padding: 20px 0; }
      `}</style>
    </div>
  );
};

export default BerandaDokter;