// src/App.jsx

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/authContext";
import { FinancialProvider } from "./context/FinancialContext";
import { FamilyProvider } from "./context/FamilyContext";

import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./pages/DashboardLayout";
import PrivateRoute from "./components/PrivateRoute";
import LandingPage from "./LandingPage";
import SettingsView from "./pages/SettingsView";
import SendMoneyView from "./pages/SendMoneyView";
import ConsentCallback from "./pages/ConsentCallback";
import AIAnalysisPage from "./pages/AIAnalysis";
import CompareBudgetExpensePage from "./pages/CompareBudgetExpensePage";
import Notification from "./pages/Notification";
import GamificationDashboard from "./pages/GamificationDashboard";
import JoinFamily from "./pages/JoinFamily";

function App() {
  return (
    <AuthProvider>
      <FinancialProvider>
        <FamilyProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/join-family" element={<PrivateRoute><JoinFamily /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute><SettingsView /></PrivateRoute>} />
              <Route path="/send-money" element={<PrivateRoute><SendMoneyView /></PrivateRoute>} />
              <Route path="/consent/callback" element={<PrivateRoute><ConsentCallback /></PrivateRoute>} />
              <Route path="/dashboard/ai-analysis" element={<PrivateRoute><AIAnalysisPage /></PrivateRoute>} />
              <Route path="/dashboard/compare-budget-expense" element={<PrivateRoute><CompareBudgetExpensePage /></PrivateRoute>} />
              <Route path="/dashboard/notification" element={<PrivateRoute><Notification /></PrivateRoute>} />
              <Route path="/dashboard/gamification" element={<PrivateRoute><GamificationDashboard /></PrivateRoute>} />
            </Routes>
          </Router>
        </FamilyProvider>
      </FinancialProvider>
    </AuthProvider>
  );
}

export default App;