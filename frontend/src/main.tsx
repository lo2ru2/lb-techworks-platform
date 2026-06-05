import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { App } from './ui/App';
import './ui/legacy.css';
import { useAuthStore } from './ui/store/authStore';


axios.interceptors.response.use(
  (res) => res,
  (error: { response?: { status?: number }; config?: { _retry?: boolean } }) => {
    if (error.response?.status === 401 && !error.config?._retry) {
      useAuthStore.getState().logoutUser();
      useAuthStore.getState().logoutAdmin();
      const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      window.location.href = isAdmin ? '/admin/login' : '/login';
    }
    return Promise.reject(error);
  },
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
