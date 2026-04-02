import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWeb3ModalAccount, useWeb3Modal } from '@web3modal/ethers5/react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

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
    
    const storedSession = getStoredSession();
    const [user, setUser] = useState(
        storedSession 
            ? { address: storedSession.address, role: storedSession.role, userName: storedSession.userName, status: storedSession.status }
            : { address: null, role: null, userName: null, status: null }
    );
    const [loading, setLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(!!storedSession);
    const router = useRouter();
    const prevAddressRef = useRef(storedSession?.address || null);

    useEffect(() => {
        const stored = getStoredSession();
        if (isConnected && address && stored && stored.address?.toLowerCase() === address?.toLowerCase()) {
            setIsAuthenticated(true);
        } else if (!isConnected || !address) {
            setIsAuthenticated(false);
        } else if (stored && stored.address?.toLowerCase() !== address?.toLowerCase()) {
            setIsAuthenticated(false);
            localStorage.removeItem('herbalchain_session');
            setUser({ address: address, role: null, userName: null, status: null });
        }
    }, [isConnected, address]);

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

    const setSession = (sessionData) => {
        setUser({
            address: sessionData.address,
            role: sessionData.role,
            userName: sessionData.userName || null,
            status: sessionData.status || null
        });
        setIsAuthenticated(true);
    };

    const checkStatus = async () => {
        const stored = getStoredSession();
        if (!stored?.address) return;
        try {
            const statusRes = await fetch(`http://127.0.0.1:5000/auth/status/${stored.address}`);
            const statusData = await statusRes.json();

            if (statusData.verification_status === 'verified') {
                const roleRes = await fetch(`http://127.0.0.1:5000/auth/check-role/${stored.address}`);
                const roleData = await roleRes.json();

                const newUser = {
                    address: stored.address,
                    role: roleData.role || 'doctor',
                    userName: roleData.name || stored.userName,
                    status: 'active'
                };
                setUser(newUser);
                setIsAuthenticated(true);
                localStorage.setItem('herbalchain_session', JSON.stringify(newUser));
                if (newUser.role === 'herbal_doctor') router.push('/herbs/dashboard');
                else router.push('/doctor/dashboard');
            }
        } catch (err) {
            console.error('checkStatus error:', err);
        }
    };

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
                return { success: false, error: data.error || data.message, message: data.message };
            }
        } catch (error) {
            console.error("Login Error:", error);
            return { success: false, error: error.message };
        }
    };

    useEffect(() => {
        if (isConnected && address) {
            if (prevAddressRef.current && prevAddressRef.current.toLowerCase() !== address.toLowerCase()) {
                console.log('🔄 MetaMask account changed, redirecting to /login');
                setUser({ address: address, role: null, userName: null, status: null });
                setIsAuthenticated(false);
                localStorage.removeItem('herbalchain_session');
                router.push('/login');
            } else {
                setUser(prev => ({ ...prev, address: address }));
            }
            prevAddressRef.current = address;
        } else if (!isConnected) {
            const stored = getStoredSession();
            if (!stored) {
                setUser({ address: null, role: null, userName: null, status: null });
                setIsAuthenticated(false);
            }
            prevAddressRef.current = null;
        }
    }, [isConnected, address]);

    useEffect(() => {
        if (isConnected && address && !isAuthenticated) {
            const currentPath = router.pathname;
            if (currentPath === '/') {
                router.push('/login');
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
            checkStatus,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);