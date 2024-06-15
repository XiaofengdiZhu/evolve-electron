const {ipcRenderer, contextBridge} = require('electron');
contextBridge.exposeInMainWorld('ipcRenderer', {
	sendSync:(channel, args) => ipcRenderer.sendSync(channel, args)
});