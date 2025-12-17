import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { RouterProvider } from 'react-router';
import { routes } from './routes.ts';
import { CoreServiceProvider } from './core/CoreServiceProvider';
import ToastContainer from './components/Toast/ToastContainer';

const root = document.getElementById('root');

createRoot(root!).render(
  <StrictMode>
    <CoreServiceProvider>
      <RouterProvider router={routes} />
      <ToastContainer position="top-right" />
    </CoreServiceProvider>
  </StrictMode>
);
