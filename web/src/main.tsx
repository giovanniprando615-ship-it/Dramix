import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/archivo/standard.css';
import './index.css';
import App from './App';
import { queryClient } from '@/lib/queries';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster theme="dark" position="top-center" offset="76px" richColors closeButton visibleToasts={3} toastOptions={{ style: { fontFamily: 'inherit' } }} />
    </QueryClientProvider>
  </StrictMode>
);
