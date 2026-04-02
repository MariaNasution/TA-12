import React from 'react';

const RiwayatInput = ({ patientsHistory, onEdit, onDelete, txLoading }) => {
  const allRecords = patientsHistory.flatMap(p => 
    (p.medicalRecords || [])
      .map((rec, i) => ({ 
        ...rec, 
        patientName: p.name || "Pasien", 
        patientAddress: p.address,
        blockchainIndex: (rec.index !== undefined && rec.index !== null) ? rec.index : i,
        dateObj: typeof rec.timestamp === 'string' ? new Date(rec.timestamp) : new Date(rec.timestamp * 1000)
      }))
  ).sort((a, b) => b.dateObj - a.dateObj); 

  return (
    <div className="menu-wrapper">
      <div className="header-section">
        <h2 className="title">Riwayat Input Data</h2>
        <p className="subtitle">Semua data medis yang pernah kamu tambahkan</p>
      </div>

      <div className="card-white">
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Pasien</th>
                <th>Diagnosa</th>
                <th>Waktu</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {allRecords.length > 0 ? allRecords.map((rec, idx) => (
                <tr key={idx} className={!rec.isActive ? 'row-disabled' : ''}>
                  <td>
                    <div className="p-name">{rec.patientName}</div>
                    <div className="p-addr">{rec.patientAddress.substring(0, 10)}...</div>
                  </td>
                  <td>
                    <p className="p-diag">{rec.diagnosis}</p>
                  </td>
                  <td>
                    <div className="p-date">
                      {rec.dateObj.toLocaleDateString('id-ID')}
                    </div>
                    <div className="p-time">
                      {rec.dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${rec.isActive ? 'active' : 'inactive'}`}>
                      {rec.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <div className="action-group">
                      {rec.isActive && (
                        <>
                          <button 
                            className="btn-edit" 
                            onClick={() => onEdit(rec)}
                            disabled={txLoading}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-delete" 
                            onClick={() => onDelete(rec.patientAddress, rec.blockchainIndex, rec.cid)}
                            disabled={txLoading}
                          >
                            Nonaktifkan
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="empty-row">Belum ada riwayat penginputan.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style jsx>{`
        .menu-wrapper { animation: fadeIn 0.4s ease; }
        .card-white { background: white; border-radius: 20px; border: 1px solid #f0f0f0; overflow: hidden; }
        .table-container { overflow-x: auto; }
        .custom-table { width: 100%; border-collapse: collapse; text-align: left; }
        .custom-table th { padding: 15px 20px; background: #fafafa; color: #666; font-size: 13px; font-weight: 600; border-bottom: 1px solid #eee; }
        .custom-table td { padding: 18px 20px; border-bottom: 1px solid #f9f9f9; vertical-align: middle; }
        
        .p-name { font-weight: 600; color: #333; font-size: 14px; }
        .p-addr { font-size: 11px; color: #999; }
        .p-diag { font-size: 13px; color: #555; max-width: 250px; margin: 0; line-height: 1.4; }
        .p-date { font-size: 13px; color: #333; }
        .p-time { font-size: 11px; color: #aaa; }
        
        .status-badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 600; }
        .status-badge.active { background: #e8f5e9; color: #2e7d32; }
        .status-badge.inactive { background: #f5f5f5; color: #999; }
        
        .action-group { display: flex; gap: 8px; justify-content: center; }
        .btn-edit { padding: 6px 12px; background: #fff8e1; color: #ffa000; border: 1px solid #ffe082; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .btn-delete { padding: 6px 12px; background: #ffebee; color: #d32f2f; border: 1px solid #ffcdd2; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
        .btn-edit:hover { background: #ffecb3; }
        .btn-delete:hover { background: #ffcdd2; }
        
        .row-disabled { opacity: 0.6; }
        .empty-row { text-align: center; padding: 40px; color: #aaa; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default RiwayatInput;