import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './tailwind.css';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>test-update 4.1</div>} />
      </Routes>
    </Router>
  );
}
