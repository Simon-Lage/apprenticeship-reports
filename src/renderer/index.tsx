import { createRoot } from 'react-dom/client';
import { IconContext } from 'react-icons';
import App from './App';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <IconContext.Provider
    value={{
      color: 'blue',
      className: 'global-class-name',
      style: { verticalAlign: 'middle' },
    }}
  >
    <App />
  </IconContext.Provider>,
);

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping']);
