import { MemoryRouter as Router, useRoutes } from 'react-router-dom';
import { Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import routes from './routes';
import './App.css';
import './tailwind.css';

function AppRoutes() {
  return useRoutes(routes);
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={null}>
          <AppRoutes />
        </Suspense>
      </Router>
    </AuthProvider>
  );
}
