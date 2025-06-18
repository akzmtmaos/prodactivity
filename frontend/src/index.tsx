import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';  // Make sure to import your global styles

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
