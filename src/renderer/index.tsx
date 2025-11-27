import { createRoot } from 'react-dom/client';
import { IconContext } from 'react-icons';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import i18n from './lib/i18n';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <I18nextProvider i18n={i18n}>
    <IconContext.Provider
      value={{
        color: 'blue',
        className: 'global-class-name',
        style: { verticalAlign: 'middle' },
      }}
    >
      <App />
    </IconContext.Provider>
  </I18nextProvider>,
);

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  // eslint-disable-next-line no-console
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping']);
