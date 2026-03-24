import React, { useState, useEffect } from 'react';

const NotifikasiDokter = ({ address }) => {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const fetchNotifs = async () => {
      console.log("📡 [DEBUG] Memulai fetch notifikasi untuk:", address);
      try {
        const res = await fetch(`http://localhost:5000/notifications?address=${address}`);
        
        if (!res.ok) {
          console.error("❌ [DEBUG] Response API Error:", res.status);
          return;
        }

        const data = await res.json();
        console.log("📥 [DEBUG] Data diterima dari Flask:", data);

        if (data.length === 0) {
          console.warn("⚠️ [DEBUG] Data kosong. Cek apakah di database MySQL ada notif untuk address ini.");
        }

        // Urutkan terbaru di atas
        const sortedData = data.sort((a, b) => b.id - a.id);
        setNotifs(sortedData);
      } catch (e) { 
        console.error("🔥 [DEBUG] Gagal total fetch notif:", e); 
      }
    };

    if (address) {
      fetchNotifs();
    } else {
      console.warn("🚫 [DEBUG] Address belum ada/undefined, fetch dibatalkan.");
    }
  }, [address]);

  // Fungsi pembantu warna
  const getStatusColor = (pesan) => {
    const p = pesan.toLowerCase();
    if (p.includes('setuju') || p.includes('approve')) return '#4caf50'; 
    if (p.includes('tolak') || p.includes('reject')) return '#f44336'; 
    if (p.includes('cabut') || p.includes('revoke')) return '#ff9800'; 
    return '#2196f3'; 
  };

  return (
    <div className="menu-wrapper">
      <div className="header-section">
        <h2 className="title">Pusat Notifikasi</h2>
        <p className="subtitle">Pantau aktivitas dan izin akses pasien Anda</p>
      </div>

      <div className="card-white">
        {notifs.length === 0 ? (
          <p className="empty">Belum ada aktivitas terbaru (Cek Console Log).</p>
        ) : (
          notifs.map((n) => (
            <div key={n.id} className="notif-item">
              <div 
                className={`status-dot ${n.is_read ? 'read' : 'unread'}`}
                style={{ backgroundColor: !n.is_read ? getStatusColor(n.pesan) : 'transparent' }}
              ></div>
              
              <div className="notif-content">
                <p className="notif-text">{n.pesan}</p>
                <span className="notif-time">
                  {new Date(n.tanggal).toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .menu-wrapper { animation: fadeIn 0.4s ease; }
        .title { font-size: 20px; font-weight: 700; color: #333; margin: 0; }
        .subtitle { font-size: 13px; color: #777; margin-top: 4px; margin-bottom: 25px; }
        
        .card-white { 
          background: white; 
          border-radius: 20px; 
          border: 1px solid #f0f0f0; 
          padding: 10px 25px; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
        }
        
        .notif-item { 
          display: flex; 
          gap: 15px; 
          padding: 18px 0; 
          border-bottom: 1px solid #f5f5f5; 
          align-items: flex-start;
        }
        .notif-item:last-child { border-bottom: none; }
        
        .status-dot { 
          width: 8px; 
          height: 8px; 
          border-radius: 50%; 
          margin-top: 6px; 
          flex-shrink: 0; 
        }
        .status-dot.unread { 
          /* Warna diatur inline melalui prop style di atas */
        }
        .status-dot.read { 
          border: 1px solid #ccc; 
        }
        
        .notif-text { font-size: 14px; color: #333; margin: 0; line-height: 1.5; font-weight: 500; }
        .notif-time { font-size: 12px; color: #999; display: block; margin-top: 6px; }
        
        .empty { text-align: center; padding: 40px; color: #aaa; font-style: italic; }
        
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(5px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
      `}</style>
    </div>
  );
};

export default NotifikasiDokter;