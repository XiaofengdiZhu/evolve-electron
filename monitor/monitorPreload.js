const { contextBridge, ipcRenderer } = require('electron')

let onLogCallback,postMessage;
contextBridge.exposeInMainWorld('electron', {
    onLog: (callback) => {
        onLogCallback = callback;
    },
    getGameDays:()=>{
        if(postMessage)postMessage("getGameDays");
    },
    stopOrContinue:()=>{
        if(postMessage)postMessage("stopOrContinue");
    }
});
ipcRenderer.on("port", (event) => {
    const [ port ] = event.ports
    port.onmessage = (event) => {
        if(onLogCallback){
            onLogCallback(event.data);
        }
    }
    postMessage = (message)=>port.postMessage(message);
})