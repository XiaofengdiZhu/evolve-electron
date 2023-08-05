const { contextBridge, ipcRenderer } = require('electron')

let postMessage,getGameDaysCallback,stopOrContinueCallback;
contextBridge.exposeInMainWorld('electron', {
    log: (message) => {if(postMessage)postMessage(message)},
    getGameDaysHandler:(callback)=>{
        getGameDaysCallback=callback;
    },
    stopOrContinueHandler: (callback)=>{
        stopOrContinueCallback=callback;
    }
});
ipcRenderer.on("port",(event) => {
    const [ port ] = event.ports;
    port.onmessage = (event) => {
        console.log('收到监视器命令', event.data);
        switch (event.data){
            case "getGameDays":
                try{
                    port.postMessage("当前游戏天数："+getGameDaysCallback());
                }catch(e){
                    port.postMessage(e);
                }
                break;
            case "stopOrContinue":
                if(stopOrContinueCallback()){
                    port.postMessage("游戏已暂停");
                }else {
                    port.postMessage("游戏已继续");
                }
                break;
        }
    };
    postMessage = (message)=>port.postMessage(message);
});
ipcRenderer.send('request-worker-channel');