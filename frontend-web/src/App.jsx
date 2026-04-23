import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/layouts/ProtectedRoute';
import AdminLayout from './components/layouts/AdminLayout';
import AuthLayout from './components/layouts/AuthLayout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/Products/ProductList';
import ProductDetails from './pages/Products/ProductDetails';
import ProductForm from './pages/Products/ProductForm';
import CategoryList from './pages/Categories/CategoryList';
import CategoryDetails from './pages/Categories/CategoryDetails';
import CategoryForm from './pages/Categories/CategoryForm';
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
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
        </Route>

        {/* Protected Admin Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            
            {/* Products */}
            <Route path="products">
              <Route index element={<ProductList />} />
              <Route path="new" element={<ProductForm />} />
              <Route path=":id" element={<ProductDetails />} />
              <Route path=":id/edit" element={<ProductForm />} />
            </Route>
            
            {/* Categories */}
            <Route path="categories">
              <Route index element={<CategoryList />} />
              <Route path="new" element={<CategoryForm />} />
              <Route path=":id" element={<CategoryDetails />} />
              <Route path=":id/edit" element={<CategoryForm />} />
            </Route>
            
            {/* Orders */}
            <Route path="orders">
              <Route index element={<OrderList />} />
              <Route path=":id" element={<OrderDetails />} />
            </Route>
            
            {/* Issues */}
            <Route path="issues">
              <Route index element={<IssueList />} />
              <Route path=":id" element={<IssueDetails />} />
            </Route>
            
            {/* Refund Requests */}
            <Route path="refund-requests">
              <Route index element={<RefundRequestList />} />
              <Route path=":id" element={<RefundRequestDetails />} />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
