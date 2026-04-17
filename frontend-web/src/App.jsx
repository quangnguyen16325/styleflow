import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/layouts/ProtectedRoute';
import AdminLayout from './components/layouts/AdminLayout';
import AuthLayout from './components/layouts/AuthLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/Products/ProductList';
import ProductDetails from './pages/Products/ProductDetails';
import ProductForm from './pages/Products/ProductForm';
import OrderList from './pages/Orders/OrderList';
import OrderDetails from './pages/Orders/OrderDetails';
import IssueList from './pages/Issues/IssueList';
import IssueDetails from './pages/Issues/IssueDetails';
import RefundRequestList from './pages/RefundRequests/RefundRequestList';
import RefundRequestDetails from './pages/RefundRequests/RefundRequestDetails';
import NotFound from './pages/NotFound';
import './App.css';

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
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductDetails />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="orders" element={<OrderList />} />
            <Route path="orders/:id" element={<OrderDetails />} />
            <Route path="issues" element={<IssueList />} />
            <Route path="issues/:id" element={<IssueDetails />} />
            <Route path="refund-requests" element={<RefundRequestList />} />
            <Route path="refund-requests/:id" element={<RefundRequestDetails />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
