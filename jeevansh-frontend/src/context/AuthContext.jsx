import { createContext, useContext, useState } from 'react';
import { setDonorToken } from '../services/donorService';

const AuthContext = createContext(null);

function readJson(key) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [donor, setDonor] = useState(() => readJson('jeevansh_donor'));
  const [bank, setBank] = useState(() => readJson('jeevansh_bank'));

  const loginDonor = (data) => {
    setDonor(data.donor);
    localStorage.setItem('jeevansh_donor', JSON.stringify(data.donor));
    if (data.token) setDonorToken(data.token);
  };

  const loginBank = (data) => {
    setBank(data.bank);
    localStorage.setItem('jeevansh_bank', JSON.stringify(data.bank));
    if (data.token) localStorage.setItem('jeevansh_bank_token', data.token);
  };

  const logout = (role = null) => {
    if (!role || role === 'donor') {
      setDonor(null);
      localStorage.removeItem('jeevansh_donor');
      setDonorToken(null);
      localStorage.removeItem('jeevansh_active_qr');
    }
    if (!role || role === 'bank') {
      setBank(null);
      localStorage.removeItem('jeevansh_bank');
      localStorage.removeItem('jeevansh_bank_token');
    }
  };

  return (
    <AuthContext.Provider value={{ donor, bank, loginDonor, loginBank, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
