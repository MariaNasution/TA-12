import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAuth } from '../context/AuthContext';
import { CONTRACT_ADDRESS, HEALTH_RECORD_ABI } from '../api/contract_abi';
import { useRouter } from 'next/router';
import axios from 'axios';

export default function RegisterPage() {
    const { address, isConnected, connectWallet, setSession } = useAuth();
    const router = useRouter();
    const [name, setName] = useState(''); 
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('patient');
    const [specialty, setSpecialty] = useState('');
    const [loading, setLoading] = useState(false);
    const [adminAddress, setAdminAddress] = useState(null);

    // Custom UI Notifications States
    const [toast, setToast] = useState(null);
    const [popup, setPopup] = useState(null);
    const [inlineErrors, setInlineErrors] = useState({});
    const [pendingRedirect, setPendingRedirect] = useState(null); // Track where to redirect after popup close

    const fetchAdminFromChain = async () => {
        if (typeof window !== 'undefined' && window.ethereum) {
            try {
                const provider = new ethers.providers.Web3Provider(window.ethereum);
                const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, provider);
                const currentAdmin = await contract.admin(); // Panggil fungsi admin() di Smart Contract
                setAdminAddress(currentAdmin.toLowerCase());
            } catch (error) {
                console.error("Gagal fetch admin address:", error);
            }
        }
    };
    useEffect(() => {
        fetchAdminFromChain();
    }, []);

    const isAdmin = address?.toLowerCase() === adminAddress;

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleRegister = async () => {
        setInlineErrors({}); // clear previous errors
        
        if (typeof window === 'undefined' || !window.ethereum) {
            return setPopup({ title: "MetaMask Tidak Ditemukan", message: "Silakan install ekstensi MetaMask di browser Anda terlebih dahulu!" });
        }
        if (!address) {
            return setPopup({ title: "Perhatian", message: "Harap hubungkan wallet MetaMask Anda terlebih dahulu." });
        }

        // Inline Field Validations
        let errs = {};
        if (!name.trim()) errs.name = "Nama lengkap wajib diisi!";
        if (!password) errs.password = "Password tidak boleh kosong!";
        if (password && password !== confirmPassword) errs.confirmPassword = "Konfirmasi password tidak cocok!";
        if (role === 'doctor' && !specialty) errs.specialty = "Kategori spesialisasi dokter wajib dipilih!";
        
        if (Object.keys(errs).length > 0) {
            setInlineErrors(errs);
            return;
        }

        setLoading(true);
        try {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const signer = provider.getSigner();
            const contract = new ethers.Contract(CONTRACT_ADDRESS, HEALTH_RECORD_ABI, signer);

            // 1. Simpan ke Backend (MySQL + Password)
            const res = await axios.post('http://127.0.0.1:5000/auth/register', {
                address: address,
                name: name,
                password: password,
                role: role
            }, { validateStatus: (status) => status < 500 });

            if (res.status === 409) {
                setLoading(false);
                return setPopup({ title: "Registrasi Gagal", message: "Wallet ini sudah terdaftar di basis data." });
            }
            if (res.status !== 200 && res.status !== 201) {
                setLoading(false);
                return showToast("Gagal mendaftar ke server", "error");
            }

            // 2. Lanjutkan ke Blockchain menggunakan Wallet Address sebagai Nama

            try {
                if (role === 'patient') {
                    const tx = await contract.registerPatient(name);
                    await tx.wait();
                    setPopup({ 
                        title: "Berhasil!", 
                        message: "Registrasi Pasien Berhasil! Anda akan dialihkan ke halaman Login." 
                    });
                    setPendingRedirect('/login');
                } else {
                    const tx = await contract.registerDoctor(name, specialty);
                    await tx.wait();
                    // Set session sebagai pending_approval agar langsung masuk ke pending-verification
                    const doctorRole = specialty.toLowerCase().includes('herbal') ? 'herbal_doctor' : 'doctor';
                    setSession({
                        address: address,
                        role: doctorRole,
                        userName: name,
                        status: 'pending_approval'
                    });
                    setPopup({ 
                        title: "Berhasil!", 
                        message: "Registrasi Dokter Berhasil! Tunggu Approval Admin. Anda akan dialihkan ke halaman verifikasi." 
                    });
                    setPendingRedirect('/pending-verification');
                }
            } catch (bcError) {
                console.warn("Blockchain transaction skipped:", bcError.message);
                const errorMsg = bcError?.data?.message || bcError?.message || "";
                if (errorMsg.toLowerCase().includes("sudah terdaftar") || errorMsg.toLowerCase().includes("revert")) {
                    setPopup({ 
                        title: "Registrasi Selesai", 
                        message: "Password tersimpan. Wallet Anda sebelumnya sudah tercatat di Blockchain." 
                    });
                    setPendingRedirect('/login');
                } else {
                    throw bcError;
                }
            }

        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.error || error.message;
            showToast("Proses registrasi gagal. Cek konsol browser.", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: '#f7fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
            
            {/* TOAST NOTIFICATION */}
            {toast && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', padding: '16px 24px', background: toast.type === 'success' ? '#38a169' : '#e53e3e', color: 'white', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: 'bold', animation: 'fadeIn 0.3s' }}>
                    {toast.message}
                </div>
            )}

            {/* POPUP MODAL NOTIFICATION */}
            {popup && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '90%', maxWidth: '400px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#2d3748', fontSize: '1.25rem' }}>{popup.title}</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#4a5568', lineHeight: '1.5' }}>{popup.message}</p>
                        <button onClick={() => { setPopup(null); if (pendingRedirect) { router.push(pendingRedirect); setPendingRedirect(null); } }} style={{ padding: '10px 24px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            <div style={{ padding: '40px', width: '100%', maxWidth: '500px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                <h2 style={{ textAlign: 'center', color: '#2d3748', marginBottom: '30px' }}>📝 Registrasi Blockchain</h2>

                {!isConnected ? (
                    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <p style={{ color: '#718096', marginBottom: '15px' }}>Hubungkan wallet MetaMask untuk mendaftar</p>
                        <button onClick={connectWallet} style={{ width: '100%', padding: '14px', background: '#4a5568', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                            Connect MetaMask
                        </button>
                    </div>
                ) : isAdmin ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{ color: '#4a5568', marginBottom: '16px', fontWeight: 'bold' }}>
                            Ini adalah wallet Admin Sistem. Admin sudah terdaftar di Smart Contract secara default.
                        </p>
                        <button onClick={() => router.push('/login')} style={{ width: '100%', padding: '14px', background: '#3182ce', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                            Menuju Halaman Login
                        </button>
                    </div>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} style={{ width: '100%' }}>
                        <div style={{ marginBottom: '20px', padding: '10px', background: '#f7fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <small style={{ color: '#718096' }}>Wallet terhubung:</small>
                            <p style={{ margin: '4px 0 0', fontWeight: 'bold', fontSize: '0.85rem', wordBreak: 'break-all' }}>{address}</p>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label>Nama Lengkap:</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Lengkap" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }} />
                            {inlineErrors.name && <p style={{ color: 'red', fontSize: '12px' }}>{inlineErrors.name}</p>}
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>Daftar Sebagai:</label>
                            <select style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e0' }} onChange={(e) => setRole(e.target.value)}>
                                <option value="patient">Pasien</option>
                                <option value="doctor">Dokter</option>
                            </select>
                        </div>

                        {role === 'doctor' && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Pilih Kategori Dokter:</label>
                                <div style={{ display: 'flex', gap: '20px', background: '#f7fafc', padding: '15px', borderRadius: '8px', border: `1px solid ${inlineErrors.specialty ? '#e53e3e' : '#e2e8f0'}` }}>
                                    <label style={{ cursor: 'pointer' }}>
                                        <input type="radio" name="specialty" value="Dokter Umum" checked={specialty === "Dokter Umum"} onChange={(e) => { setSpecialty(e.target.value); setInlineErrors({...inlineErrors, specialty: null}); }} /> Dokter Umum
                                    </label>
                                    <label style={{ cursor: 'pointer' }}>
                                        <input type="radio" name="specialty" value="Dokter Spesialis Herbal" checked={specialty === "Dokter Spesialis Herbal"} onChange={(e) => { setSpecialty(e.target.value); setInlineErrors({...inlineErrors, specialty: null}); }} /> Dokter Herbal
                                    </label>
                                </div>
                                {inlineErrors.specialty && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '6px' }}>⚠️ {inlineErrors.specialty}</p>}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>Buat Password:</label>
                            <input 
                                type="password" 
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${inlineErrors.password ? '#e53e3e' : '#cbd5e0'}`, outline: 'none' }} 
                                onChange={(e) => { setPassword(e.target.value); setInlineErrors({...inlineErrors, password: null}); }} 
                                placeholder="Masukkan password" 
                            />
                            {inlineErrors.password && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '6px' }}>⚠️ {inlineErrors.password}</p>}
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>Konfirmasi Password:</label>
                            <input 
                                type="password" 
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${inlineErrors.confirmPassword ? '#e53e3e' : '#cbd5e0'}`, outline: 'none' }} 
                                onChange={(e) => { setConfirmPassword(e.target.value); setInlineErrors({...inlineErrors, confirmPassword: null}); }} 
                                placeholder="Ulangi password" 
                            />
                            {inlineErrors.confirmPassword && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '6px' }}>⚠️ {inlineErrors.confirmPassword}</p>}
                        </div>

                        <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: '#2f855a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Sedang Mendaftar...' : 'Daftar Sekarang'}
                        </button>

                        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: '#718096' }}>
                            Sudah punya akun?{' '}
                            <span onClick={() => router.push('/login')} style={{ color: '#3182ce', cursor: 'pointer', textDecoration: 'underline' }}>
                                Login di sini
                            </span>
                        </p>
                    </form>
                )}
            </div>
            
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}