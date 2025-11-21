import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div>
      <div>AuthLayout</div>
      <Outlet />
    </div>
  );
}
