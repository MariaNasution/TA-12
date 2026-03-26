import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWeb3ModalAccount, useWeb3Modal } from '@web3modal/ethers5/react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

// Helper: Baca session dari localStorage saat pertama kali mount
const getStoredSession = () => {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem('herbalchain_session');
        if (stored) return JSON.parse(stored);
    } catch (e) { /* ignore */ }
    return null;
};

export const AuthProvider = ({ children }) => {
    const { address, isConnected } = useWeb3ModalAccount();
    const { open } = useWeb3Modal();
    
    // Inisialisasi state dari localStorage jika ada
    const storedSession = getStoredSession();
    const [user, setUser] = useState(
        storedSession 
            ? { address: storedSession.address, role: storedSession.role, userName: storedSession.userName, status: storedSession.status }
            : { address: null, role: null, userName: null, status: null }
    );
    const [loading, setLoading] = useState(false);
    // isAuthenticated hanya true jika ada stored session DAN wallet address cocok
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();
    const prevAddressRef = useRef(storedSession?.address || null);

    // Validasi session: hanya authenticated jika wallet terhubung DAN address cocok dengan session
    useEffect(() => {
        const stored = getStoredSession();
        if (isConnected && address && stored && stored.address?.toLowerCase() === address?.toLowerCase()) {
            // Wallet terhubung dan cocok dengan session → authenticated
            setIsAuthenticated(true);
        } else if (!isConnected || !address) {
            // Wallet belum terhubung → tidak authenticated
            setIsAuthenticated(false);
        } else if (stored && stored.address?.toLowerCase() !== address?.toLowerCase()) {
            // Wallet terhubung tapi address berbeda dari session → reset
            setIsAuthenticated(false);
            localStorage.removeItem('herbalchain_session');
            setUser({ address: address, role: null, userName: null, status: null });
        }
    }, [isConnected, address]);

    // Simpan session ke localStorage setiap kali user state berubah
    useEffect(() => {
        if (user.role && user.address) {
            localStorage.setItem('herbalchain_session', JSON.stringify({
                address: user.address,
                role: user.role,
                userName: user.userName,
                status: user.status
            }));
        }
    }, [user]);

    const connectWallet = async () => {
        try {
            await open();
        } catch (error) {
            console.error("Wallet connection error:", error);
        }
    };

    // Fungsi untuk set session langsung (digunakan setelah registrasi dokter)
    const setSession = (sessionData) => {
        setUser({
            address: sessionData.address,
            role: sessionData.role,
            userName: sessionData.userName || null,
            status: sessionData.status || null
        });
        setIsAuthenticated(true);
    };

    // Login penuh (Wallet + Password) — dipanggil dari halaman /login
    const loginWithPassword = async (walletAddress, password) => {
        try {
            const response = await fetch('http://127.0.0.1:5000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: walletAddress, password })
            });

            const data = await response.json();

            if (response.ok) {
                const userRole = data.role;
                setUser({ address: walletAddress, role: userRole, userName: data.name, status: data.status });
                setIsAuthenticated(true);

                // Navigasi berdasarkan role
                if (data.status === 'pending_approval') {
                    router.push('/pending-verification');
                    return { success: true, data };
                }

                if (userRole === 'herbal_doctor') {
                    router.push('/herbs/dashboard');
                } else if (userRole === 'doctor') {
                    router.push('/doctor/dashboard');
                } else if (userRole === 'patient') {
                    router.push('/patient/dashboard');
                } else if (userRole === 'admin') {
                    router.push('/admin/dashboard');
                }
                return { success: true, data };
            } else {
                return { success: false, error: data.error || data.message };
            }
        } catch (error) {
            console.error("Login Error:", error);
            return { success: false, error: error.message };
        }
    };

    // Deteksi pergantian akun MetaMask → reset auth dan redirect ke /register
    useEffect(() => {
        if (isConnected && address) {
            if (prevAddressRef.current && prevAddressRef.current.toLowerCase() !== address.toLowerCase()) {
                // Akun MetaMask berubah → reset state dan redirect ke register
                console.log('🔄 MetaMask account changed, redirecting to /register');
                setUser({ address: address, role: null, userName: null, status: null });
                setIsAuthenticated(false);
                localStorage.removeItem('herbalchain_session');
                router.push('/register');
            } else {
                // Set address awal (jangan timpa role/userName yang sudah di-restore)
                setUser(prev => ({ ...prev, address: address }));
            }
            prevAddressRef.current = address;
        } else if (!isConnected) {
            // Wallet disconnected
            const stored = getStoredSession();
            if (!stored) {
                setUser({ address: null, role: null, userName: null, status: null });
                setIsAuthenticated(false);
            }
            prevAddressRef.current = null;
        }
    }, [isConnected, address]);

    // Saat wallet terhubung dan di halaman utama, arahkan ke register (jika belum authenticated)
    useEffect(() => {
        if (isConnected && address && !isAuthenticated) {
            const currentPath = router.pathname;
            if (currentPath === '/') {
                router.push('/register');
            }
        }
    }, [isConnected, address, isAuthenticated]);

    const logout = () => {
        setUser({ address: null, role: null, userName: null, status: null });
        setIsAuthenticated(false);
        prevAddressRef.current = null;
        localStorage.removeItem('herbalchain_session');
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ 
            ...user, 
            isConnected, 
            loading, 
            isAuthenticated,
            connectWallet, 
            loginWithPassword,
            setSession,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);