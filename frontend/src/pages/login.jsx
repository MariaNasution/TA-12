import { useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
    const router = useRouter();
    const { address, isConnected, connectWallet, loginWithPassword } = useAuth();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Custom UI Notifications States
    const [toast, setToast] = useState(null);
    const [popup, setPopup] = useState(null);
    const [inlineError, setInlineError] = useState("");

    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const ADMIN_WALLET = "0xf51de12261F60B677fdf4306B6FF54dC98aeAcA3".toLowerCase();
    const isAdmin = address?.toLowerCase() === ADMIN_WALLET;

    const handleConnectWallet = async () => {
        if (typeof window !== 'undefined' && !window.ethereum) {
            return setPopup({ title: "MetaMask Tidak Ditemukan", message: "Silakan install ekstensi MetaMask di browser Anda terlebih dahulu!" });
        }
        try {
            await connectWallet();
            // Optional: showToast("Wallet terhubung", "success");
        } catch (error) {
            showToast("Gagal menghubungkan wallet", "error");
        }
    };

    const handleLogin = async () => {
        setInlineError(""); // clear previous
        if (!address) return setPopup({ title: "Perhatian", message: "Harap hubungkan wallet MetaMask Anda terlebih dahulu." });
        if (!isAdmin && !password) return setInlineError("Password tidak boleh kosong!");

        setLoading(true);
        try {
            const result = await loginWithPassword(address, password || "");

            if (result.success) {
                showToast(`Login Sukses sebagai ${result.data.role}`, "success");
                // Note: AuthContext automatically handles routing on success
            } else {
                const errLower = (result.error || "").toLowerCase();
                if (errLower.includes("password salah")) {
                    setInlineError("Password yang Anda masukkan tidak sesuai.");
                } else if (errLower.includes("belum terdaftar")) {
                    setPopup({ title: "Akses Ditolak", message: result.error || "Wallet ini belum terdaftar di sistem. Silakan registrasi." });
                } else {
                    showToast(result.error || "Login gagal", "error");
                }
            }
        } catch (error) {
            showToast("Terjadi kesalahan sistem", "error");
        } finally {
            setLoading(false);
        }
    };

    const displayAddress = address ? `${address.substring(0, 6)}...${address.substring(38)}` : '';

    return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', fontFamily: 'Inter, sans-serif' }}>
            
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
                        <button onClick={() => setPopup(null)} style={{ padding: '10px 24px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                            Tutup
                        </button>
                    </div>
                </div>
            )}

            <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px', textAlign: 'center' }}>
                <h1 style={{ color: '#2d3748', marginBottom: '24px' }}>🌿 Herbal Chain AI</h1>
                
                {!isConnected || !address ? (
                    <button onClick={handleConnectWallet} style={{ width: '100%', padding: '12px', fontSize: '1rem', cursor: 'pointer', background: '#4a5568', color: '#fff', border: 'none', borderRadius: '8px', transition: 'background 0.3s' }}>
                        Connect MetaMask
                    </button>
                ) : (
                    <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ textAlign: 'left' }}>
                        <p style={{ fontSize: '0.85rem', color: '#718096', marginBottom: '16px' }}>
                            Connected: <strong>{displayAddress}</strong>
                        </p>
                        
                        {!isAdmin && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#4a5568' }}>Password:</label>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (inlineError) setInlineError(""); // clear error on type
                                    }}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${inlineError ? '#e53e3e' : '#cbd5e0'}`, outline: 'none' }}
                                    placeholder="Masukkan password Anda"
                                />
                                {/* INLINE ERROR NOTIFICATION */}
                                {inlineError && <p style={{ color: '#e53e3e', fontSize: '0.8rem', marginTop: '6px', marginBottom: 0 }}>⚠️ {inlineError}</p>}
                            </div>
                        )}

                        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '1rem', cursor: 'pointer', background: '#38a169', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Memproses...' : 'Login Aplikasi'}
                        </button>
                        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.85rem', color: '#718096' }}>
                            Belum punya akun?{' '}
                            <span onClick={() => router.push('/register')} style={{ color: '#3182ce', cursor: 'pointer', textDecoration: 'underline' }}>
                                Daftar di sini
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