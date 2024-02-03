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
    MessageChannelMain,
    Tray,
    nativeImage
} = require('electron');

if (!app.requestSingleInstanceLock()) {
    app.quit();
    throw null;
}

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
let tray;
if(process.platform==="win32"){
    const WindowsToaster = notifier.WindowsToaster;
    notifier = new WindowsToaster({
        withFallback: false
    });
}
let pmotschmannEvolvePath = path.join(__dirname.split("app.asar")[0], "PmotschmannEvolve");
let mainWindow,mainWindowID,monitorWindowWebContents,gameWindow,gameWindowWebContents,tampermonkeyWindow,tampermonkeyWindowOpened=false,messageChannelInitiated=false,thisSession;
const createWindows = () => {
    let gameSource = store.get("gameSource")??"insidePmotschmann";
    mainWindow = new BrowserWindow({
        icon: path.join(__dirname, "evolved-withBackground.ico"),
        title: 'Evolve客户端',
        width: store.get("mainWindow.bounds.width") ?? 1080,
        height: store.get("mainWindow.bounds.height") ?? 800,
        x: store.get("mainWindow.bounds.x") ?? undefined,
        y: store.get("mainWindow.bounds.y") ?? undefined,
        autoHideMenuBar: store.get("mainWindow.autoHideMenuBar") ?? false,
        backgroundColor: nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"#292a2d":"#ffffff",
        webPreferences: {
            backgroundThrottling: !(store.get("stopBackgroundThrottling")??true),
            contextIsolation: true,
            session: thisSession
        }
    });
    updateStartMenuIcon();
    mainWindowID = mainWindow.id;
    setMainMenu();
    if (store.get('mainWindow.isMaximized')) mainWindow.maximize();
    mainWindow.on('minimize', () => {
        if(store.get("minimizedToTray")??false){
            tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "evolved-withBackground.ico")));
            tray.setToolTip('Evolve客户端');
            tray.on('double-click',() => {
                tray.destroy();
                mainWindow.show();
            });
            tray.setContextMenu(Menu.buildFromTemplate([
                {
                    label: 'Evolve客户端 ' + app.getVersion(),
                    enabled: false
                },
                {
                    label: '打开主窗口',
                    click(){
                        tray.destroy();
                        mainWindow.show();
                    }
                },
                {
                    label: '退出',
                    click(){
                        tray.destroy();
                        mainWindow.close();
                    }
                }
            ]));
            mainWindow.hide();
        }
    });
    mainWindow.on('closed', () => {
        BrowserWindow.getAllWindows().forEach(window => window.close());
        if(tray){
            tray.destroy();
        }
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
    gameWindow = mainWindow;
    gameWindowWebContents = gameWindow.webContents;
    monitorWindowWebContents = null;
    setupIpc();
    thisSession.loadExtension(path.join(__dirname.split("app.asar")[0], 'extensions', 'dhdgffkkebhmkfjojejmpbldmpobfkfo'), {allowFileAccess: true}).then(()=>{
        switch(store.get("gameSource")){
            case "insidePmotschmann":
                gameWindow.loadFile(path.join(pmotschmannEvolvePath,'index.html')).then(firstLoadPage);
                break;
            case "pmotschmann":
                gameWindow.loadURL("https://pmotschmann.github.io/Evolve/").then(firstLoadPage);
                break;
            case "g8hh":
                gameWindow.loadURL("https://g8hh.github.io/evolve/").then(firstLoadPage);
                break;
            default:
                gameWindow.loadFile(path.join(pmotschmannEvolvePath,'index.html')).then(firstLoadPage);
        }
    });
}

function firstLoadPage() {
    try {
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
    applicationName: "Evolve客户端",
    applicationVersion: app.getVersion(),
    credits: "An Electron app that you can play Evolve in it.\n一个用于玩Evolve的Electron套壳软件",
    iconPath: path.join(__dirname, "evolved-withBackground.ico")
});
app.enableSandbox();
let powerSaveBlockerID = null;
app.whenReady().then(() => {
    if(store.get("powerSaveBlocker")??true){
        powerSaveBlockerID=powerSaveBlocker.start('prevent-app-suspension');
    }
    thisSession = session.defaultSession;
    new ElectronChromeExtensions({
        session: thisSession,
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
                    icon: path.join(__dirname, "evolved-withBackground.ico"),
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
        if (str.endsWith("evolve/") || str.endsWith("evolve/index.html") || str.endsWith("evolve/no-style.html") || str.endsWith("evolve/wiki.html") || str.endsWith("options.html")) {

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
            appID: "Evolve客户端",
            title: "错误",
            message: "渲染进程崩溃了，已尝试刷新页面\n错误代码：" + details.exitCode + "；原因：" + details.reason,
            icon: path.join(__dirname, "evolved-withBackground.ico"),
            sound: false,
            wait: false,
            timeout: 5
        });
    });
})

app.on('second-instance', () => {
    if (mainWindow) {
        mainWindow.show();
        if(tray){
            tray.destroy();
        }
    }
});

function setMainMenu() {
    const template = [
        {
            label: '选择版本',
            submenu: [
                {
                    label: "离线原版 by pmotschmann",
                    sublabel: "无需网络",
                    type: "radio",
                    checked: (store.get("gameSource")??"insidePmotschmann")==="insidePmotschmann",
                    click() {
                        let gameSource = store.get("gameSource")??"insidePmotschmann";
                        if(gameSource!=="insidePmotschmann"){
                            store.set("gameSource","insidePmotschmann");
                            gameWindow.loadFile(path.join(pmotschmannEvolvePath,'index.html')).then();
                        }
                    }
                },
                {
                    label: "在线原版 by pmotschmann",
                    sublabel: "https://pmotschmann.github.io/Evolve/",
                    type: "radio",
                    checked: store.get("gameSource")==="pmotschmann",
                    click() {
                        let gameSource = store.get("gameSource")??"insidePmotschmann";
                        if(gameSource!=="pmotschmann"){
                            store.set("gameSource","pmotschmann");
                            gameWindow.loadURL("https://pmotschmann.github.io/Evolve/").then();
                        }
                    }
                },
                {
                    label: "在线锅巴汉化版 from g8hh",
                    sublabel: "https://g8hh.github.io/evolve/",
                    type: "radio",
                    checked: store.get("gameSource")==="g8hh",
                    click() {
                        let gameSource = store.get("gameSource")??"insidePmotschmann";
                        if(gameSource!=="g8hh"){
                            store.set("gameSource","g8hh");
                            gameWindow.loadURL("https://g8hh.github.io/evolve/").then();
                        }
                    }
                },
                {type: 'separator'},
                {
                    label: "打开离线文件夹",
                    click() {
                        shell.openExternal(pmotschmannEvolvePath).then();
                    }
                }
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
                                    win.setBackgroundColor("#292a2d");
                                });
                                store.set("mainWindow.theme", "dark");
                            }
                        }
                    ]
                },
                {
                    label: "隐藏/显示菜单栏",
                    checked: store.get("mainWindow.autoHideMenuBar")??false,
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
                                appID: "Evolve客户端",
                                title: "提示",
                                message: "按键盘上的Alt显示菜单栏",
                                icon: path.join(__dirname, "evolved-withBackground.ico"),
                                sound: false,
                                wait: false,
                                timeout: 5
                            });
                        }
                    }
                },
                {
                    label: "最小化到托盘",
                    type: "checkbox",
                    checked: store.get("minimizedToTray")??false,
                    click() {
                        if(store.get("minimizedToTray")??false){
                            store.set("minimizedToTray",false);
                        }else{
                            store.set("minimizedToTray",true);
                        }
                    }
                },
                {
                    label: "开机自启",
                    type: "checkbox",
                    checked: store.get("openAtLogin")??false,
                    click() {
                        if(app.isPackaged){
                            if(store.get("openAtLogin")??false){
                                store.set("openAtLogin",false);
                                app.setLoginItemSettings({openAtLogin:false});
                            }else{
                                store.set("openAtLogin",true);
                                app.setLoginItemSettings({openAtLogin:true});
                            }
                        }
                    }
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
                    label: "不限制后台运行",
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
                }
            ]
        },{
            label: "页面",
            submenu: [
                {label: "刷新", role: 'reload'},
                {label: "清除缓存并刷新", role: 'forceReload'},
                {label: "开发者工具", role: 'toggleDevTools'},
                {type: 'separator'},
                {label: "重置缩放", role: 'resetZoom'},
                {label: "放大", role: 'zoomIn'},
                {label: "缩小", role: 'zoomOut'},
                {label: "全屏", role: 'togglefullscreen'},
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
            click() {
                if (!tampermonkeyWindowOpened) {
                    tampermonkeyWindowOpened = true;
                    tampermonkeyWindow = new BrowserWindow(
                        {
                            title: "篡改猴",
                            parent: mainWindow,
                            width: 1080,
                            height: 800,
                            autoHideMenuBar: true,
                            backgroundColor: nativeTheme.themeSource === "dark" || (nativeTheme.themeSource === "system" && nativeTheme.shouldUseDarkColors) ? "#292a2d" : "#ffffff",
                            webPreferences: {
                                session: thisSession
                            }
                        });
                    tampermonkeyWindow.loadURL("chrome-extension://dhdgffkkebhmkfjojejmpbldmpobfkfo/options.html").then();
                    tampermonkeyWindow.on("close", () => {
                        tampermonkeyWindowOpened = false;
                    });
                } else {
                    tampermonkeyWindow.moveTop();
                    tampermonkeyWindow.center();
                }
            }
        },
        {
            label: "关于",
            role: 'about'
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function updateStartMenuIcon() {
    if (process.platform==="win32") {
        const toastActivatorClsid = "eb1fdd5b-8f70-4b5a-b230-998a2dc19303";

        const appID = "evolve-client";
        app.setAppUserModelId(appID);

        const appLocation = process.execPath;
        const appData = app.getPath("appData");

        // continue if not in dev mode / running portable app
        if (__dirname.includes("app.asar") && !appLocation.startsWith(path.join(appData, "..", "Local", "Temp"))) {
            // shortcutPath can be anywhere inside AppData\Roaming\Microsoft\Windows\Start Menu\Programs\
            const shortcutPath = path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "Evolve客户端.lnk");
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
                        description: "An Electron app that you can play Evolve in it.\n一个用于玩Evolve的Electron套壳软件",
                        appUserModelId: appID,
                        toastActivatorClsid
                    }
                );
            }
        }
    }
}