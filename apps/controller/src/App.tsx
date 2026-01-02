import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ControllerPage from './pages/ControllerPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/:roomCode" element={<ControllerPage />} />
    </Routes>
  );
}

export default App;
