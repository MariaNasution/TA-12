import React, { useState, useEffect } from 'react';

const NotifikasiPasien = ({ address }) => {
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:5000/notifications?address=${address}`);
        const data = await res.json();
        setNotifs(data);
      } catch (e) { console.error(e); }
    };
    fetchNotifs();
  }, [address]);

  return (
    <div className="menu-wrapper">
      <div className="header-section">
        <h2 className="title">Notifikasi</h2>
        <p className="subtitle">Aktivitas terbaru pada akunmu</p>
      </div>

      <div className="card-white">
        {notifs.length === 0 ? (
          <p className="empty">Tidak ada notifikasi terbaru.</p>
        ) : (
          notifs.map((n) => (
            <div key={n.id} className="notif-item">
            <div className={`status-dot ${n.is_read ? 'read' : 'unread'}`}></div>
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
        .title { font-size: 20px; font-weight: 700; color: #333; }
        .subtitle { font-size: 13px; color: #777; margin-top: 4px; margin-bottom: 25px; }
        
        .card-white { background: white; border-radius: 20px; border: 1px solid #f0f0f0; padding: 15px 25px; }
        
        .notif-item { display: flex; gap: 15px; padding: 20px 0; border-bottom: 1px solid #f5f5f5; }
        .notif-item:last-child { border-bottom: none; }
        
        .status-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
        .status-dot.unread { background: #4caf50; } /* Titik Hijau */
        .status-dot.read { border: 1px solid #ccc; background: transparent; }
        
        .notif-text { font-size: 14px; color: #333; margin: 0; line-height: 1.5; font-weight: 500; }
        .notif-time { font-size: 12px; color: #999; display: block; margin-top: 6px; }
        
        .empty { text-align: center; padding: 40px; color: #aaa; font-style: italic; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default NotifikasiPasien;