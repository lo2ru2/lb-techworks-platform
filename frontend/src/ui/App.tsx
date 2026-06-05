import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './layout/Layout';
import { AdminLayout } from './admin/AdminLayout';
import { NotificationHost } from './components/NotificationHost';
import { PageLoading } from './components/PageLoading';
import { NotificationProvider } from './store/NotificationContext';

const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const ProductPage = lazy(() => import('./pages/ProductPage').then((m) => ({ default: m.ProductPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then((m) => ({ default: m.ContactPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then((m) => ({ default: m.BlogPage })));
const DetajetPage = lazy(() => import('./pages/DetajetPage').then((m) => ({ default: m.DetajetPage })));
const PaymentSuccessPage = lazy(() =>
  import('./pages/PaymentSuccessPage').then((m) => ({ default: m.PaymentSuccessPage })),
);
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((m) => ({ default: m.RegisterPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const GoogleAuthSuccessPage = lazy(() =>
  import('./pages/GoogleAuthSuccessPage').then((m) => ({ default: m.GoogleAuthSuccessPage })),
);

const AdminLoginPage = lazy(() => import('./admin/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const AdminOrdersPage = lazy(() => import('./admin/AdminOrdersPage').then((m) => ({ default: m.AdminOrdersPage })));
const AdminProductsPage = lazy(() => import('./admin/AdminProductsPage').then((m) => ({ default: m.AdminProductsPage })));
const AdminStockPage = lazy(() => import('./admin/AdminStockPage').then((m) => ({ default: m.AdminStockPage })));
const AdminReportsPage = lazy(() => import('./admin/AdminReportsPage').then((m) => ({ default: m.AdminReportsPage })));
const AdminUsersPage = lazy(() => import('./admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminCustomersPage = lazy(() => import('./admin/AdminCustomersPage').then((m) => ({ default: m.AdminCustomersPage })));
const AdminCategoriesPage = lazy(() => import('./admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })));
const AdminSupportPage = lazy(() => import('./admin/AdminSupportPage').then((m) => ({ default: m.AdminSupportPage })));

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname, location.search]);
  return null;
}

export function App() {
  return (
    <NotificationProvider>
      <BrowserRouter>
        <ScrollToTop />
        <NotificationHost />
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/detajet" element={<DetajetPage />} />
            <Route path="/payment/success" element={<PaymentSuccessPage />} />
            <Route path="/auth/google/success" element={<GoogleAuthSuccessPage />} />

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/orders" replace />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="stock" element={<AdminStockPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="customers" element={<AdminCustomersPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="support" element={<AdminSupportPage />} />
            </Route>

            <Route element={<Layout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/shop" element={<ShopPage />} />
              <Route path="/telefona" element={<ShopPage />} />
              <Route path="/kamera" element={<ShopPage />} />
              <Route path="/audio" element={<ShopPage />} />
              <Route path="/aksesore" element={<ShopPage />} />
              <Route path="/product/:id" element={<ProductPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </NotificationProvider>
  );
}
