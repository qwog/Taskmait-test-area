import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'dark:bg-gray-800 dark:text-white',
            style: { borderRadius: '12px', fontFamily: 'inherit' },
            success: { duration: 3000, iconTheme: { primary: '#6366f1', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
