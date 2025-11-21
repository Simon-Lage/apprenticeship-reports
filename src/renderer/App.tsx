import { MemoryRouter as Router, useRoutes } from 'react-router-dom';
import { Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { routes } from './routes';
import './tailwind.css';
import './App.css';

function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<div>Loading...</div>}>
          <AppRoutes />
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
