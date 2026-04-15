import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/layouts/ProtectedRoute';
import AdminLayout from './components/layouts/AdminLayout';
import AuthLayout from './components/layouts/AuthLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/Products/ProductList';
import ProductDetails from './pages/Products/ProductDetails';
import OrderList from './pages/Orders/OrderList';
import OrderDetails from './pages/Orders/OrderDetails';
import './App.css';

// Placeholders for issues to prevent crashing before Commit 2/3 of Phase 2
function IssueList() { return <h1>Issues Tracking</h1>; }
function IssueDetails() { return <h1>Issue Details</h1>; }

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductList />} />
            <Route path="products/:id" element={<ProductDetails />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            
            {/* New routes for phase 2 */}
            <Route path="issues" element={<IssueList />} />
            <Route path="issues/:id" element={<IssueDetails />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
