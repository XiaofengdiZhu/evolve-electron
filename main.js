const {
    app,
    BrowserWindow,
    powerSaveBlocker,
    shell,
    dialog,
    Menu,
    nativeTheme,
    session,
    crashReporter,
    ipcMain,
    MessageChannelMain
} = require('electron');
const path = require('path');
const Store = require('electron-store');
const prompt = require('./electron-prompt/index.js');
const { v4: uuidv4 } = require('uuid');
const log = require('electron-log');
const ga4mp = require("./ga4mp.js");
const {ElectronChromeExtensions} = require("electron-chrome-extensions");
const axios = require('axios');
let notifier = require('node-notifier');

crashReporter.start({ uploadToServer: false });
const store = new Store();
log.catchErrors();
let ga4;
if(process.platform==="win32"){
    const WindowsToaster = notifier.WindowsToaster;
    notifier = new WindowsToaster({
        withFallback: false
    });
}
let megaEvolvePath = path.join(__dirname.split("app.asar")[0], "MegaEvolve");
let mainWindow,mainWindowID,monitorWindowWebContents,gameWindow,gameWindowWebContents,tampermonkeyWindow,tampermonkeyWindowOpened=false,messageChannelInitiated=false;
const createWindows = () => {
    mainWindow = new BrowserWindow({
        icon: path.join(megaEvolvePath,'evolved'+(nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"-light":"")+'.ico'),
        title: 'evolve-electron by 销锋镝铸',
        width: store.get("mainWindow.bounds.width") ?? 1080,
        height: store.get("mainWindow.bounds.height") ?? 800,
        x: store.get("mainWindow.bounds.x") ?? undefined,
        y: store.get("mainWindow.bounds.y") ?? undefined,
        autoHideMenuBar: store.get("mainWindow.autoHideMenuBar") ?? false,
        backgroundColor: nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"#292a2d":"#ffffff",
        webPreferences: {
            preload: (store.get("offscreen")??false)?path.join(__dirname,'monitor','monitorPreload.js'):path.join(__dirname, 'gamePreload.js'),
            backgroundThrottling: (store.get("offscreen")??false)||!(store.get("stopBackgroundThrottling")??true),
            contextIsolation: true
        }
    });
    updateStartMenuIcon();
    mainWindowID = mainWindow.id;
    setMainMenu();
    if (store.get('mainWindow.isMaximized')) mainWindow.maximize();
    mainWindow.on('closed', () => {
        BrowserWindow.getAllWindows().forEach(window => window.close());
    });
    mainWindow.on('resized', () => {
        saveMainWindowInfo();
    });
    mainWindow.on('moved', () => {
        saveMainWindowInfo();
    });
    mainWindow.on('maximize', () => {
        saveMainWindowInfo();
    });
    mainWindow.on('unmaximize', () => {
        saveMainWindowInfo();
    });
    mainWindow.on('page-title-updated', (event) => {
        event.preventDefault();
    });
    if(store.get("offscreen")??false) {
        gameWindow = new BrowserWindow({
            offscreen: true,
            show: false,
            width:0,
            height:0,
            webPreferences: {
                preload: path.join(__dirname, 'gamePreload.js'),
                backgroundThrottling: !(store.get("stopBackgroundThrottling")??true),
                contextIsolation: true
            }
        });
        monitorWindowWebContents = mainWindow.webContents;
        gameWindowWebContents = gameWindow.webContents;
        gameWindowWebContents.frameRate = 1;
        gameWindowWebContents.mainFrame.ipc.on('request-worker-channel', (event) => {
            const { port1, port2 } = new MessageChannelMain();
            monitorWindowWebContents.postMessage('port', null, [port1]);
            event.senderFrame.postMessage('port', null, [port2]);
        });
    }else{
        gameWindow = mainWindow;
        monitorWindowWebContents = null;
    }
    setupIpc();
    session.defaultSession.loadExtension(path.join(__dirname.split("app.asar")[0], 'extensions', 'dhdgffkkebhmkfjojejmpbldmpobfkfo'), {allowFileAccess: true}).then(()=>{
        switch(store.get("gameSource")){
            case "inside":
                gameWindow.loadFile(path.join(megaEvolvePath,'index.html')).then(firstLoadPage);
                break;
            case "xiaofengdizhu":
                gameWindow.loadURL("https://xiaofengdizhu.github.io/MegaEvolve/").then(firstLoadPage);
                break;
            case "pmotschmann":
                gameWindow.loadURL("https://pmotschmann.github.io/Evolve/").then(firstLoadPage);
                break;
            case "g8hh":
                gameWindow.loadURL("https://g8hh.github.io/evolve/").then(firstLoadPage);
                break;
            default:
                gameWindow.loadFile(path.join(megaEvolvePath,'index.html')).then(firstLoadPage);
        }
        if(store.get("offscreen")??false){
            mainWindow.loadFile(path.join(__dirname,"monitor","monitor.html")).then();
        }
    });
}

function firstLoadPage() {
    try {
        if(store.get("openAutoUpdate")??true){
            checkUpdate();
        }
        let events = [];
        if(!store.has("userID")){
            store.set("userID",uuidv4());
            events.push({name : "sign_up",params :{"method": "Windows"}})
        }
        ga4 = ga4mp.createClient("CZTsXj0VQGy8EV4NDF9Kiw", "G-K2QN2S0MSK", "evolve-electron", store.get("userID"));
        events.push({name : "login",params :{"method": "Windows"}});
        ga4.send(events);
    }catch (e) {
        log.error(e);
    }
}

function saveMainWindowInfo() {
    store.set({
        "mainWindow": {
            bounds: mainWindow.getNormalBounds(),
            isMaximized: mainWindow.isMaximized() || mainWindow.isFullScreen()
        }
    });
}

function setupIpc(){
    ipcMain.on('log', (event, message) => {
        if(monitorWindowWebContents){
            monitorWindowWebContents.send("log",message);
        }
    });
    ipcMain.handle('getGameDays', ()=>{

    });
}

nativeTheme.themeSource = store.get("mainWindow.theme") ?? "system";

app.setAboutPanelOptions({
    applicationName: app.name,
    applicationVersion: app.getVersion(),
    copyright: "by 销锋镝铸",
    credits: "an Electron app that you can play Evolve in it.\n一个用于玩Evolve的Electron套壳软件",
    iconPath: path.join(megaEvolvePath,'evolved.ico'),
    website:"https://github.com/XiaofengdiZhu/evolve-electron"
});
app.enableSandbox();
if(store.get("disableHardwareAcceleration")??false){
    app.disableHardwareAcceleration();
}
let powerSaveBlockerID = null;
app.whenReady().then(() => {
    if(store.get("powerSaveBlocker")??true){
        powerSaveBlockerID=powerSaveBlocker.start('prevent-app-suspension');
    }
    new ElectronChromeExtensions({
        session: session.defaultSession,
        createTab: (details) => {
            const win =
                typeof details.windowId === 'number' &&
                this.windows.find((w) => w.id === details.windowId)
            if (!win) {
                throw new Error(`Unable to find windowId=${details.windowId}`)
            }
            const tab = win.tabs.create()
            if (details.url) tab.loadURL(details.url || newTabUrl)
            if (typeof details.active === 'boolean' ? details.active : true) win.tabs.select(tab.id)

            return [tab.webContents, tab.window]
        },
        selectTab: (tab, browserWindow) => {
            const win = this.getWindowFromBrowserWindow(browserWindow)
            win?.tabs.select(tab.id)
        },
        removeTab: (tab, browserWindow) => {
            const win = this.getWindowFromBrowserWindow(browserWindow)
            win?.tabs.remove(tab.id)
        },
        createWindow: (details) => {
            const win = this.createWindow({
                initialUrl: details.url || newTabUrl,
            })
            return win.window
        },
        removeWindow: (browserWindow) => {
            const win = this.getWindowFromBrowserWindow(browserWindow)
            win?.destroy()
        }
    });
    createWindows();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)createWindows();
    })
})

app.on('window-all-closed', () => {
    app.quit();
})

app.on('quit', () => {
    if(ga4){
        ga4.send({name:"tutorial_complete"});
    }
})

app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({url}) => {
        let str = url.toLowerCase().split("#")[0];
        if (str.endsWith("evolve/wiki.html")) {
            return {
                action: "allow",
                overrideBrowserWindowOptions:{
                    icon: path.join(megaEvolvePath,'evolved'+(nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"-light":"")+'.ico'),
                    width:1080,
                    height:800,
                    autoHideMenuBar: true,
                    backgroundColor: nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"#292a2d":"#ffffff"
                }
            }
        }else if(str.endsWith("options.html")){
            return {
                action: "allow",
                overrideBrowserWindowOptions:{
                    width:1080,
                    height:800,
                    autoHideMenuBar: true,
                    backgroundColor: nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"#292a2d":"#ffffff"
                }
            }
        } else {
            setImmediate(() => {
                shell.openExternal(url).then();
            });
            return {action: 'deny'};
        }
    });
    contents.on('will-navigate', (event,url) => {
        let str = url.toLowerCase().split("#")[0];
        if (str.endsWith("evolve/") || str.endsWith("evolve/index.html") || str.endsWith("evolve/wiki.html") || str.endsWith("options.html")) {

        } else {
            event.preventDefault();
            setImmediate(() => {
                shell.openExternal(url).then();
            });
        }
    });
    contents.on('render-process-gone', (event, details) => {
        contents.reload();
        notifier.notify({
            appID: "evolve-electron",
            title: "错误",
            message: "渲染进程崩溃了，已尝试刷新页面\n错误代码：" + details.exitCode + "；原因：" + details.reason,
            icon: path.join(megaEvolvePath,"evolved-withBackground.ico"),
            sound: false,
            wait: false,
            timeout: 5
        });
    });
})

function setMainMenu() {
    const template = [
        {
            label: '文件',
            submenu: [
                {
                    label: "选择版本",
                    submenu: [
                        {
                            label: "离线超进化版 from 销锋镝铸",
                            sublabel: "无需网络",
                            type: "radio",
                            checked: (store.get("gameSource")??"inside")==="inside",
                            click() {
                                store.set("gameSource","inside");
                                gameWindow.loadFile(path.join(megaEvolvePath,'index.html')).then();
                            }
                        },
                        {
                            label: "在线超进化版 from 销锋镝铸",
                            sublabel: "https://xiaofengdizhu.github.io/MegaEvolve/",
                            type: "radio",
                            checked: store.get("gameSource")==="xiaofengdizhu",
                            click() {
                                store.set("gameSource","xiaofengdizhu");
                                gameWindow.loadURL("https://xiaofengdizhu.github.io/MegaEvolve/").then();
                            }
                        },
                        {
                            label: "在线原版 by pmotschmann",
                            sublabel: "https://pmotschmann.github.io/Evolve/",
                            type: "radio",
                            checked: store.get("gameSource")==="pmotschmann",
                            click() {
                                store.set("gameSource","pmotschmann");
                                gameWindow.loadURL("https://pmotschmann.github.io/Evolve/").then();
                            }
                        },
                        {
                            label: "在线锅巴汉化版 from g8hh",
                            sublabel: "https://g8hh.github.io/evolve/",
                            type: "radio",
                            checked: store.get("gameSource")==="g8hh",
                            click() {
                                store.set("gameSource","g8hh");
                                gameWindow.loadURL("https://g8hh.github.io/evolve/").then();
                            }
                        }
                    ]
                },
                {label: "关于", role: 'about'},
                {label: "退出", role: 'quit'}
            ]
        },
        {
            label: '选项',
            submenu: [
                {
                    label: "窗口主题",
                    submenu: [
                        {
                            label: "跟随系统",
                            type: "radio",
                            checked: (store.get("mainWindow.theme") ?? "system") === "system",
                            click() {
                                nativeTheme.themeSource = "system";
                                BrowserWindow.getAllWindows().forEach((win) => {
                                    win.setIcon(path.join(megaEvolvePath,'evolved'+(nativeTheme.shouldUseDarkColors?"-light":"")+'.ico'));
                                    win.setBackgroundColor(nativeTheme.shouldUseDarkColors?"#292a2d":"#ffffff");
                                });
                                store.set("mainWindow.theme", "system");
                            }
                        },
                        {
                            label: "浅色",
                            type: "radio",
                            checked: store.get("mainWindow.theme") === "light",
                            click() {
                                nativeTheme.themeSource = "light";
                                BrowserWindow.getAllWindows().forEach((win) => {
                                    win.setIcon(path.join(megaEvolvePath,'evolved.ico'));
                                    win.setBackgroundColor("#ffffff");
                                });
                                store.set("mainWindow.theme", "light");
                            }
                        },
                        {
                            label: "深色",
                            type: "radio",
                            checked: store.get("mainWindow.theme") === "dark",
                            click() {
                                nativeTheme.themeSource = "dark";
                                BrowserWindow.getAllWindows().forEach((win) => {
                                    win.setIcon(path.join(megaEvolvePath,'evolved-light.ico'));
                                    win.setBackgroundColor("#292a2d");
                                });
                                store.set("mainWindow.theme", "dark");
                            }
                        }
                    ]
                },
                {type: 'separator'},
                {
                    label: "保持系统活动状态",
                    type: "checkbox",
                    checked: store.get("powerSaveBlocker")??true,
                    click() {
                        if(store.get("powerSaveBlocker")??true){
                            powerSaveBlocker.stop(powerSaveBlockerID);
                            store.set("powerSaveBlocker",false);
                        }else{
                            powerSaveBlockerID=powerSaveBlocker.start("prevent-app-suspension");
                            store.set("powerSaveBlocker",true);
                        }
                    }
                },
                {
                    label: "不限制网页后台",
                    type: "checkbox",
                    checked: store.get("stopBackgroundThrottling")??true,
                    click() {
                        if(store.get("stopBackgroundThrottling")??true){
                            gameWindowWebContents.backgroundThrottling = true;
                            store.set("stopBackgroundThrottling",false);
                        }else{
                            gameWindowWebContents.backgroundThrottling = false;
                            store.set("stopBackgroundThrottling",true);
                        }
                    }
                },
                {
                    label: "离屏渲染模式",
                    sublabel: "自动重启后生效",
                    type: "checkbox",
                    checked: store.get("offscreen")??false,
                    click() {
                        if(store.get("offscreen")??false){
                            store.set("offscreen",false);
                            app.relaunch();
                            app.exit();
                        }else{
                            store.set("offscreen",true);
                            app.relaunch();
                            app.exit();
                        }
                    }
                },
                {
                    label: "禁用硬件加速",
                    sublabel: "自动重启后生效",
                    type: "checkbox",
                    checked: store.get("disableHardwareAcceleration")??false,
                    click() {
                        if(store.get("disableHardwareAcceleration")??false){
                            store.set("disableHardwareAcceleration",false);
                            app.relaunch();
                            app.exit();
                        }else{
                            store.set("disableHardwareAcceleration",true);
                            app.relaunch();
                            app.exit();
                        }
                    }
                },
                {type: 'separator'},
                {label: "刷新", role: 'reload'},
                {label: "清除缓存并刷新", role: 'forceReload'},
                {label: "开发者工具",sublabel: "当前窗口", role: 'toggleDevTools'},
                {
                    label: "开发者工具",
                    sublabel: "游戏窗口",
                    click() {
                        gameWindowWebContents.openDevTools({mode:"detach"});
                    }
                },
                {type: 'separator'},
                {label: "重置缩放", role: 'resetZoom'},
                {label: "放大", role: 'zoomIn'},
                {label: "缩小", role: 'zoomOut'},
                {label: "全屏", role: 'togglefullscreen'},
                {
                    label: "隐藏/显示菜单栏",
                    click() {
                        let focusedWindow = BrowserWindow.getFocusedWindow();
                        if(focusedWindow.autoHideMenuBar){
                            if(focusedWindow.id===mainWindowID){
                                store.set("mainWindow.autoHideMenuBar", false);
                            }
                            focusedWindow.menuBarVisible = true;
                            focusedWindow.autoHideMenuBar = false;
                        }else{
                            if(focusedWindow.id===mainWindowID){
                                store.set("mainWindow.autoHideMenuBar", true);
                            }
                            focusedWindow.menuBarVisible = false;
                            focusedWindow.autoHideMenuBar = true;
                            notifier.notify({
                                appID: "evolve-electron",
                                title: "提示",
                                message: "按键盘上的Alt显示菜单栏",
                                icon: path.join(megaEvolvePath,"evolved-withBackground.ico"),
                                sound: false,
                                wait: false,
                                timeout: 5
                            });
                        }
                    }
                },
                {type: 'separator'},
                {
                    label: "页面内搜索",
                    accelerator:"CommandOrControl+F",
                    click(){
                        let focusedWindow = BrowserWindow.getFocusedWindow();
                        if(focusedWindow.title!=="页面内查找"){
                            prompt({
                                title: '页面内查找',
                                label: '',
                                type: 'input',
                                value:store.get("mainWindow.search")??"",
                                buttonLabels:{ok:"查找", cancel:"取消"},
                                alwaysOnTop:true
                            },focusedWindow).then(text => {
                                if (text) {
                                    store.set("mainWindow.search", text);
                                    focusedWindow.webContents.findInPage(text);
                                }
                            });
                        }
                    }
                }
            ]
        },
        {
            label: '脚本',
            submenu: [
                {
                    label: "脚本设置",
                    sublabel: "篡改猴",
                    click() {
                        if(!tampermonkeyWindowOpened){
                            tampermonkeyWindowOpened = true;
                            tampermonkeyWindow = new BrowserWindow(
                                {
                                    title:"篡改猴",
                                    parent:mainWindow,
                                    width:1080,
                                    height:800,
                                    autoHideMenuBar: true,
                                    backgroundColor: nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"#292a2d":"#ffffff"
                                });
                            tampermonkeyWindow.loadURL("chrome-extension://dhdgffkkebhmkfjojejmpbldmpobfkfo/options.html");
                            tampermonkeyWindow.on("close",() => {
                                tampermonkeyWindowOpened = false;
                            });
                        }else{
                            tampermonkeyWindow.moveTop();
                            tampermonkeyWindow.center();
                        }
                    }
                },
                {
                    label: "下载超进化脚本",
                    id: "openMegaEvolveScriptsWebsite",
                    click() {
                        shell.openExternal("https://github.com/XiaofengdiZhu/evolve-electron/tree/main/tampermonkeyScripts").then();
                    }
                }
            ]
        },
        {
            label: "关于",
            submenu:[
                {
                    label:"立即检测更新",
                    click(){
                        checkUpdate();
                    }
                },
                {
                    label: "自动检测更新",
                    type: "checkbox",
                    checked: store.get("openAutoUpdate")??true,
                    click() {
                        if(store.get("openAutoUpdate")??true){
                            store.set("openAutoUpdate",false);
                        }else{
                            store.set("openAutoUpdate",true);
                        }
                    }
                },
                {type: 'separator'},
                {
                    label:"官网",
                    click(){
                        shell.openExternal("https://github.com/XiaofengdiZhu/evolve-electron").then();
                    }
                },
                {
                    label: "软件信息",
                    role: 'about'
                }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function checkUpdate() {
    axios.get("https://api.github.com/repos/XiaofengdiZhu/evolve-electron/releases/latest",{
        timeout:10000,
        responseType: "json"
    }).then((response) => {
        if(response.status === 200) {
            let data = response.data;
            if(data.tag_name === app.getVersion()){
                notifier.notify({
                        appID: "evolve-electron",
                        title: "检测更新成功",
                        message: "无新版本",
                        icon: path.join(megaEvolvePath,"evolved-withBackground.ico"),
                        sound: false,
                        wait: false,
                        timeout: 5
                    });
            }else {
                dialog.showMessageBox({
                    type: "question",
                    cancelId: 1,
                    buttons: ["是", "否"],
                    message: "检测到新版本" + data.tag_name + "，是否下载？"
                }).then((response) => {
                    if (response.response === 0) {
                        let url;
                        for(let asset of data["assets"]){
                            if(asset["name"].endsWith(".exe")){
                                url = asset["browser_download_url"];
                                break;
                            }
                        }
                        if(url){
                            shell.openExternal(url).then();
                        }
                    }
                });
            }
        }else{
            checkUpdateFailed();
        }
    }).catch((error) => {
        checkUpdateFailed();
    });
}

function checkUpdateFailed(){
    notifier.notify({
            appID: "evolve-electron",
            title: "检测更新失败",
            message: "您可以点击此处前往Github Release页面主动检查是否有新版本，当前版本为"+ app.getVersion(),
            icon: path.join(megaEvolvePath,"evolved-withBackground.ico"),
            sound: false,
            wait: false,
            actions: ["前往Github Release"],
            timeout: 5
        },
        function (error, response, metadata) {
            if((metadata && metadata.action==="buttonClicked") || (response===undefined && error == null)){
                shell.openExternal("https://github.com/XiaofengdiZhu/evolve-electron/releases/latest").then();
            }
        });
}

function updateStartMenuIcon() {
    if (process.platform==="win32") {
        const toastActivatorClsid = "eb1fdd5b-8f70-4b5a-b230-998a2dc19303";

        const appID = "evolve-electron";
        app.setAppUserModelId(appID);

        const appLocation = process.execPath;
        const appData = app.getPath("appData");

        // continue if not in dev mode / running portable app
        if (__dirname.includes("app.asar") && !appLocation.startsWith(path.join(appData, "..", "Local", "Temp"))) {
            // shortcutPath can be anywhere inside AppData\Roaming\Microsoft\Windows\Start Menu\Programs\
            const shortcutPath = path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "evolve-electron.lnk");
            // check if shortcut doesn't exist -> create it, if it exists and invalid -> update it
            try {
                const shortcutDetails = shell.readShortcutLink(shortcutPath); // throws error if it doesn't exist yet
                // validate shortcutDetails
                if (
                    shortcutDetails.target !== appLocation ||
                    shortcutDetails.appUserModelId !== appID ||
                    shortcutDetails.toastActivatorClsid !== toastActivatorClsid
                ) {
                    throw "needUpdate";
                }
                // if the execution got to this line, the shortcut exists and is valid
            } catch (error) { // if not valid -> Register shortcut
                shell.writeShortcutLink(
                    shortcutPath,
                    error === "needUpdate" ? "update" : "create",
                    {
                        target: appLocation,
                        cwd: path.dirname(appLocation),
                        description: "an Electron app that you can play Evolve in it.\n一个用于玩Evolve的Electron套壳软件",
                        appUserModelId: appID,
                        toastActivatorClsid
                    }
                );
            }
        }
    }
}