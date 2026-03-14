import { DefaultLayout } from '@/renderer/layouts/DefaultLayout';
import HomePage from '@/renderer/pages/HomePage';
import './globals.css';
import './App.css';

export default function App() {
  return (
    <DefaultLayout>
      <HomePage />
    </DefaultLayout>
  );
}
