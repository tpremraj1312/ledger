// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
// import AddAccount from "./pages/AddAccount";
import DashboardLayout from "./pages/DashboardLayout";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider } from "./context/authContext";
import LandingPage from "./LandingPage";
import SettingsView from "./pages/SettingsView";
import SendMoneyView from "./pages/SendMoneyView"; // <-- Import the new component
// import BillPayView from "./pages/BillPayView"; // <-- Import the new component
import ConsentCallback from "./pages/ConsentCallback";
import AIAnalysisPage from "./pages/AIAnalysis";
import CompareBudgetExpensePage from "./pages/CompareBudgetExpensePage";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          {/* Wrap layout and specific pages needing protection */}
          <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>} />
          {/* <Route path="/add-account" element={<PrivateRoute><AddAccount /></PrivateRoute>} /> */}
          {/* Settings is likely accessed via DashboardLayout, but defining a direct route can be useful */}
          <Route path="/settings" element={<PrivateRoute><SettingsView /></PrivateRoute>} />
          {/* Add route for Send Money */}
          <Route path="/send-money" element={<PrivateRoute><SendMoneyView /></PrivateRoute>} /> {/* <-- Add the route */}
          {/* <Route path="/pay-bills" element={<PrivateRoute><BillPayView /></PrivateRoute>} /> <-- Add the route */}
          <Route path="/consent/callback" element={<PrivateRoute><ConsentCallback /></PrivateRoute>} />
          <Route path="/dashboard/ai-analysis" element={<AIAnalysisPage />} />
          <Route path="/dashboard/compare-budget-expense" element={<CompareBudgetExpensePage />} />
          {/* Fallback or 404 can go here */}
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;