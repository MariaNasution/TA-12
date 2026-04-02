import React, { useState, useEffect } from 'react';
import { Calendar, Hash, FileText, User } from 'lucide-react'; 
import { useAuth } from '../../../context/AuthContext';

const RiwayatMedis = ({ medicalRecords = [] }) => {
  const { address } = useAuth();
  const [doctorNames, setDoctorNames] = useState({});

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch('http://localhost:5000/auth/doctors');
        const data = await res.json();
        if (data && data.doctors) {
          const map = {};
          data.doctors.forEach(doc => {
            map[doc.address.toLowerCase()] = doc.name;
          });
          setDoctorNames(map);
        }
      } catch (err) {
        console.error("Gagal load dokter:", err);
      }
    };
    fetchDoctors();
  }, []);

  return (
    <div className="menu-wrapper">
      <div className="header-section">
        <h2 className="title">Riwayat Data Medis</h2>
        <p className="subtitle">Daftar rekam medis Anda yang tersimpan secara aman di Blockchain</p>
      </div>

      <div className="card-white">
        {medicalRecords.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} color="#ccc" />
            <p>Belum ada data medis yang tercatat untuk akun ini.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="medical-table">
              <thead>
                <tr>
                  <th><div className="th-content"><Calendar size={14} /> Tanggal & Waktu</div></th>
                  <th><div className="th-content"><FileText size={14} /> Diagnosis</div></th>
                  <th><div className="th-content"><User size={14} /> Diterbitkan Oleh</div></th> 
                  <th><div className="th-content"><Hash size={14} /> CID</div></th>
                </tr>
              </thead>
              <tbody>
                {medicalRecords
                  .filter((rec) => {
                    
                    const isNonAktif = rec.isActive === false || rec.isActive === 0 || rec.isActive === "false";
                    return !isNonAktif;
                  })
                  .map((rec, idx) => (
                    <tr key={idx}>
                      <td className="td-date">
                        {new Date(rec.timestamp * 1000).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="td-diagnosis">
                        <div className="diagnosis-badge">{rec.diagnosis}</div>
                      </td>
                      <td className="td-doctor">
                        <span className="doctor-wallet">
                          {(() => {
                            const rawAddr = rec.doctor || "";
                            const docAddr = rawAddr.trim().toLowerCase();
                            if (doctorNames && doctorNames[docAddr]) {
                              return `dr. ${doctorNames[docAddr]}`;
                            }
                            return rawAddr ? `dr. ${rawAddr.substring(0, 6)}...` : "Dokter Terverifikasi";
                          })()}
                        </span>
                      </td>
                      <td className="td-cid">
                        <code title={rec.cid}>{rec.cid ? rec.cid.substring(0, 8) : "N/A"}...</code>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .menu-wrapper { animation: fadeIn 0.4s ease; }
        .title { font-size: 20px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { font-size: 13px; color: #777; margin: 4px 0 25px 0; }
        .card-white { background: white; border-radius: 20px; border: 1px solid #f0f0f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .table-container { width: 100%; overflow-x: auto; }
        .medical-table { width: 100%; border-collapse: collapse; text-align: left; table-layout: fixed; }
        .medical-table th { background: #fafafa; padding: 15px 20px; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 1px solid #eee; }
        .medical-table th:nth-child(1) { width: 18%; }
        .medical-table th:nth-child(2) { width: 40%; }
        .medical-table th:nth-child(3) { width: 22%; }
        .medical-table th:nth-child(4) { width: 20%; }
        .th-content { display: flex; align-items: center; gap: 8px; }
        .medical-table td { padding: 18px 20px; border-bottom: 1px solid #f9f9f9; font-size: 13px; color: #444; vertical-align: top; }
        .diagnosis-badge { background: #e8f5e9; color: #2e7d32; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 12px; display: inline-block; word-wrap: break-word; overflow-wrap: break-word; white-space: normal; max-width: 100%; }
        .doctor-wallet { font-family: sans-serif; color: #1976d2; background: #e3f2fd; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; }
        .td-cid code { color: #888; font-size: 11px; word-break: break-all; }
        .empty-state { padding: 60px; text-align: center; color: #aaa; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default RiwayatMedis;