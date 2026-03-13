import { ipcMain } from 'electron';
import { LogicDispatchRequest } from '../../shared/logic';
import { ensureAuthenticatedSession } from '../auth/runtime';
import { LogicDispatcher } from './dispatcher';

const logicDispatcher = new LogicDispatcher();

export const registerLogicHandlers = () => {
  ipcMain.handle('logic:catalog', async () => logicDispatcher.getCatalog());
  ipcMain.handle(
    'logic:dispatch',
    async (_event, request: LogicDispatchRequest) => {
      ensureAuthenticatedSession();
      return logicDispatcher.dispatch(request);
    },
  );
};
