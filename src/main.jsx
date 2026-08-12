
// import React from 'react';
// import ReactDOM from 'react-dom/client';
// import App from './App';
// import './index.css';

// ReactDOM.createRoot(document.getElementById('root')).render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>
// );

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

// 1. Create a client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Prevents data from refetching immediately when you switch tabs
      refetchOnWindowFocus: false, 
      // Retries failed requests 1 time before showing error
      retry: 1,
    },
  },
});

console.log(
  `%c NAYSA Financials %c Build: ${__APP_VERSION__} `,
  'color: white; background: #1e40af; padding: 5px 10px; border-radius: 5px 0 0 5px; font-weight: bold;',
  'color: #1e40af; background: #f3f4f6; padding: 5px 10px; border-radius: 0 5px 5px 0; border: 1px solid #1e40af;'
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 2. Wrap the app with the Provider */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);