import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout.jsx';
import Home from './pages/Home.jsx';
import Businesses from './pages/Businesses.jsx';
import BusinessDetail from './pages/BusinessDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import SuperAdminRoute from './components/SuperAdminRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="businesses" element={<Businesses />} />
        <Route path="businesses/:id" element={<BusinessDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="superadmin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
      </Route>
    </Routes>
  );
}
