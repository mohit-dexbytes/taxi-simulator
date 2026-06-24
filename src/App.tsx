import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { UserSimulator } from './pages/UserSimulator';
import { DriverSimulator } from './pages/DriverSimulator';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/user" element={<UserSimulator />} />
        <Route path="/driver" element={<DriverSimulator />} />
      </Routes>
    </Router>
  );
}

export default App;
