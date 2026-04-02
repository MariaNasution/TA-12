import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

import { 
  Home, 
  Leaf, 
  FileText, 
  UserCheck, 
  Bell, 
  Settings, 
  KeyRound, 
  PencilLine, 
  Users,
  LogOut,
  Flower2,
  Clock
} from 'lucide-react';

const Sidebar = ({ activeTab, setActiveTab, dokterCount, notifications = {} }) => {
  const { address, role, userName, logout } = useAuth();
  const router = useRouter();

  const menuConfig = {
    patient: [
      { id: 'beranda', label: 'Beranda', icon: <Home size={20} />, badgeKey: null },
      { id: 'rekomendasi', label: 'Minta Rekomendasi', icon: <Leaf size={20} />, badgeKey: null },
      { id: 'riwayat_medis', label: 'Riwayat Data Medis', icon: <FileText size={20} />, badgeKey: null },
      { id: 'akses_dokter', label: 'Akses Dokter', icon: <UserCheck size={20} />, badgeKey: 'dokterCount' },
      { id: 'riwayat_rekomendasi', label: 'Riwayat Rekomendasi', icon: <Clock size={20} />, badgeKey: null },
      { id: 'notifikasi', label: 'Notifikasi', icon: <Bell size={20} />, badgeKey: 'notifCount' },
      { id: 'profil', label: 'Profil Saya', icon: <Settings size={20} /> },
    ],
    doctor: [
      { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} /> },
      { id: 'request', label: 'Request Akses', icon: <KeyRound size={20} /> },
      { id: 'list', label: 'Pasien Saya', icon: <Users size={20} /> },
      { id: 'input', label: 'Tambah Data Medis', icon: <PencilLine size={20} /> },
      { id: 'riwayat', label: 'Riwayat Input Data', icon: <Clock size={20} /> },
      { id: 'notifikasi', label: 'Notifikasi', icon: <Bell size={20} />, badgeKey: 'notifCount' },
      { id: 'profil', label: 'Profil Saya', icon: <Settings size={20} /> },
    ],
    herbal_doctor: [
      { id: 'dashboard', label: 'Beranda', icon: <Home size={20} /> }, 
      { id: 'input', label: 'Tambah Herbal', icon: <PencilLine size={20} /> }, 
      { id: 'katalog', label: 'Katalog Herbal', icon: <Flower2 size={20} /> }, 
      { id: 'profil', label: 'Profil Saya', icon: <Settings size={20} /> },
    ],
    admin: [
      { id: 'dashboard', label: 'Beranda', icon: <Home size={20} /> },
      { id: 'verifikasi', label: 'Verifikasi Akun', icon: <UserCheck size={20} />, badgeKey: 'pendingVerifCount' },
      { id: 'pengguna', label: 'Kelola Pengguna', icon: <Users size={20} /> },
      { id: 'profil', label: 'Profil Saya', icon: <Settings size={20} /> },
    ],
  };

  const currentMenu = menuConfig[role] || [];

  return (
    <div className="sidebar-container">
      {/* Brand Logo Section */}
      <div className="brand-section">
        <div className="brand-logo-icon">
          <Leaf size={24} color="#2e7d32" />
        </div>
        <div className="brand-info">
          <h2 className="brand-name">SmartHerbal</h2>
          <p className="brand-tagline">AI Medical Recommendation</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="nav-list">
        {currentMenu.map((item) => {
          const isActive = activeTab === item.id;
          const badgeValue = 
          item.badgeKey === 'dokterCount' ? dokterCount : 
          (notifications && notifications[item.badgeKey]) ? notifications[item.badgeKey] : 
          0;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              {/* Icon Garis Otomatis Berubah Warna karena currentColor */}
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              
              {badgeValue > 0 && (
                <span className={`badge ${item.id === 'notifikasi' ? 'badge-green' : 'badge-red'}`}>
                  {badgeValue}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Profile Section */}
      <div className="sidebar-footer">
        <div className="user-avatar">
          {/* 1. Inisial Nama (Contoh: Maria jadi 'M') */}
          {userName ? userName.substring(0, 1).toUpperCase() : '??'}
        </div>
        
        <div className="user-detail">
          {/* 2. Tampilkan Nama Lengkap di sini */}
          <span className="user-name">{userName || 'User'}</span>
          
          {/* Tampilkan Address kecil di bawahnya (opsional) */}
          <span className="user-role" style={{ fontSize: '10px', opacity: 0.7 }}>
              {address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : ''}
          </span>
        </div>

        <button onClick={logout} className="logout-button" title="Keluar">
          <LogOut size={18} color="#888" />
        </button>
      </div>

      {/* STYLING JSX (SCOPED) */}
      <style jsx>{`
        .sidebar-container {
          width: 260px;
          height: 100vh;
          background: #ffffff;
          border-right: 1px solid #f2f2f2;
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          padding: 20px 0;
          z-index: 1000;
        }

        .brand-section {
          padding: 0 25px 35px 25px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand-logo-icon {
          background: #e8f5e9;
          padding: 10px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-name { font-size: 19px; font-weight: 700; color: #333; margin: 0; }
        .brand-tagline { font-size: 11px; color: #2e7d32; margin: 0; font-weight: 500; }

        .nav-list { flex: 1; padding: 0 15px; }

        .nav-item {
          display: flex;
          align-items: center;
          padding: 14px 18px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          color: #757575; /* Warna teks/icon saat idle (Abu-abu Tua) */
          margin-bottom: 6px;
          position: relative;
        }

        .nav-item:hover {
          background: #f9f9f9;
          color: #333;
        }

        .nav-item.active {
          background: #e8f5e9; /* Background Hijau Pucat */
          color: #2e7d32; /* Warna Hijau Tua saat aktif */
          font-weight: 600;
        }

        .nav-icon {
          margin-right: 15px;
          display: flex;
          align-items: center;
          color: currentColor; /* Trik agar warna icon mengikuti warna teks (color) nav-item */
        }

        .nav-label { font-size: 14.5px; }

        /* Style Dasar Badge */
        .badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 10px;
          position: absolute;
          right: 18px;
          color: white;
          transition: all 0.3s ease;
        }

        .badge-red {
          background: #ff5252;
          box-shadow: 0 2px 5px rgba(255, 82, 82, 0.3);
        }

        .badge-green {
          background: #4caf50; 
          box-shadow: 0 2px 5px rgba(76, 175, 80, 0.3);
        }

        .nav-item.active .badge-red,
        .nav-item.active .badge-green {
          background: white;
          color: #2e7d32; 
        }

        .sidebar-footer {
          padding: 20px 20px 0 20px;
          border-top: 1px solid #f2f2f2;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .user-avatar {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: #f0f4f8;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px; font-weight: bold; color: #555;
          border: 2px solid #fff;
          box-shadow: 0 0 0 1px #eee;
        }

        .user-detail { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
        .user-name { font-size: 13.5px; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 11px; color: #aaa; text-transform: capitalize; margin-top: 2px; }
        
        .logout-button { background: none; border: none; cursor: pointer; padding: 5px; display: flex; align-items: center; }
        .logout-button:hover { background: #f9f9f9; border-radius: 8px; }
      `}</style>
    </div>
  );
};

export default Sidebar;