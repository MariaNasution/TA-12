import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWeb3ModalAccount, useWeb3Modal } from '@web3modal/ethers5/react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const { address, isConnected } = useWeb3ModalAccount();
    const { open } = useWeb3Modal();
    const [user, setUser] = useState({ address: null, role: null, userName: null, status: null });
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();
    const prevAddressRef = useRef(null);

    const connectWallet = async () => {
        try {
            await open();
        } catch (error) {
            console.error("Wallet connection error:", error);
        }
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
            if (prevAddressRef.current && prevAddressRef.current !== address) {
                // Akun MetaMask berubah → reset state dan redirect ke register
                console.log('🔄 MetaMask account changed, redirecting to /register');
                setUser({ address: address, role: null });
                setIsAuthenticated(false);
                router.push('/register');
            } else {
                // Set address awal
                setUser(prev => ({ ...prev, address: address }));
            }
            prevAddressRef.current = address;
        } else if (!isConnected) {
            setUser({ address: null, role: null, userName: null, status: null });
            setIsAuthenticated(false);
            prevAddressRef.current = null;
        }
    }, [isConnected, address]);

    // Saat wallet terhubung dan di halaman utama, arahkan ke register
    useEffect(() => {
        if (isConnected && address && !isAuthenticated) {
            const currentPath = router.pathname;
            if (currentPath === '/') {
                router.push('/register');
            }
        }
    }, [isConnected, address, isAuthenticated]);

    return (
        <AuthContext.Provider value={{ 
            ...user, 
            isConnected, 
            loading, 
            isAuthenticated,
            connectWallet, 
            loginWithPassword 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);