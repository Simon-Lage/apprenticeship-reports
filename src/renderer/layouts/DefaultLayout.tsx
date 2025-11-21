import { Outlet } from 'react-router-dom';

export default function DefaultLayout() {
  return (
    <div>
      <div>DefaultLayout</div>
      <Outlet />
    </div>
  );
}
