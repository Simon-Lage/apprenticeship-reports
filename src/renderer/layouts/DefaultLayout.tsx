import { Outlet } from 'react-router-dom';

export default function DefaultLayout() {
  return (
    <div className="layout layout-default">
      <Outlet />
    </div>
  );
}
