import React from 'react';
import OperationsPage from './pages/OperationsPage';
import './App.css';

/**
 * Main App Component
 * 
 * This can be used standalone or replaced with OperationsPage
 * when integrating into the Control UI.
 */
function App() {
  return (
    <div className="app">
      <OperationsPage />
    </div>
  );
}

export default App;
