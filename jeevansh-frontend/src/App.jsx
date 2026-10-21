import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RequestProvider } from './context/RequestContext';
import ScrollToTop from './components/ScrollToTop';

import RequesterLayout from './components/layout/RequesterLayout';
import DonorLayout from './components/layout/DonorLayout';
import BankLayout from './components/layout/BankLayout';

import DonorCertificate from './pages/DonorCertificate';
import VerifyScreen from './pages/VerifyScreen';
import Home from './pages/Home';
import RequestForm from './pages/RequestForm';
import BanksScreen from './pages/BanksScreen'; // <-- NEW IMPORT
import AlertingScreen from './pages/AlertingScreen';
import StatusScreen from './pages/StatusScreen';
import DonorRegister from './pages/DonorRegister';
import DonorLogin from './pages/DonorLogin';
import DonorDashboard from './pages/DonorDashboard';
import BankLogin from './pages/BankLogin';
import BankDashboard from './pages/BankDashboard';
import BankScan from './pages/BankScan';

function DonorRoute({ children }) {
  const { donor } = useAuth();
  return donor ? children : <Navigate to="/donor/login" />;
}

function BankRoute({ children }) {
  const { bank } = useAuth();
  return bank ? children : <Navigate to="/bank/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <RequestProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Toaster position="top-center" toastOptions={{
            style: { background: '#333', color: '#fff', borderRadius: '12px' }
          }} />
          <Routes>
            {/* Public + Requester Routes */}
            <Route element={<RequesterLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/request" element={<RequestForm />} />
              <Route path="/request/banks" element={<BanksScreen />} /> {/* <-- NEW ROUTE */}
              <Route path="/request/alerting" element={<AlertingScreen />} />
              <Route path="/request/status/:id" element={<StatusScreen />} />
              <Route path="/verify/:token" element={<VerifyScreen />} />
              <Route path="/donor/register" element={<DonorRegister />} />
              <Route path="/donor/login" element={<DonorLogin />} />
              <Route path="/bank/login" element={<BankLogin />} />
            </Route>

            {/* Protected Donor Routes */}
            <Route element={<DonorRoute><DonorLayout /></DonorRoute>}>
              <Route path="/donor/dashboard" element={<DonorDashboard />} />
              <Route path="/donor/certificate/:certId" element={<DonorCertificate />} /> {/* <-- NEW */}
            </Route>

            {/* Protected Bank Routes */}
            <Route element={<BankRoute><BankLayout /></BankRoute>}>
              <Route path="/bank/dashboard" element={<BankDashboard />} />
              <Route path="/bank/scan" element={<BankScan />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RequestProvider>
    </AuthProvider>
  );
}