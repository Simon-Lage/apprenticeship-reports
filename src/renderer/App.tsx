import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './tailwind.css';
import './App.css';


export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<div>test</div>} />
      </Routes>
    </Router>
  );
}
