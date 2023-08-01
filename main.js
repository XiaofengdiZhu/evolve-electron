const {
    app,
    BrowserWindow,
    powerSaveBlocker,
    shell,
    Menu,
    MenuItem,
    dialog,
    Notification,
    nativeTheme,
    session,
    crashReporter
} = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const prompt = require('./electron-prompt/index.js');
const { v4: uuidv4 } = require('uuid');
const log = require('electron-log');
const { autoUpdater } = require("electron-updater");
const ga4mp = require("./ga4mp.js");
const {ElectronChromeExtensions} = require("electron-chrome-extensions");
crashReporter.start({ uploadToServer: false });
if (require('electron-squirrel-startup')) return app.quit();

const store = new Store();
let userDataPath = app.getPath("userData");
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.catchErrors();
let ga4;

let mainWindow,mainWindowID,mainWindowWebContents,tampermonkeyWindow,tampermonkeyWindowOpened=false;
const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        icon: __dirname + '/MegaEvolve/evolved'+(nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"-light":"")+'.ico',
        title: 'evolve-electron by 销锋镝铸',
        width: store.get("mainWindow.bounds.width") ?? 1080,
        height: store.get("mainWindow.bounds.height") ?? 800,
        x: store.get("mainWindow.bounds.x") ?? undefined,
        y: store.get("mainWindow.bounds.y") ?? undefined,
        autoHideMenuBar: store.get("mainWindow.autoHideMenuBar") ?? false,
        backgroundColor: nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"#292a2d":"#ffffff"
        /*webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }*/
    });
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
    autoUpdater.on('update-available',(info)=>{
        new Notification({
            title: "evolve-electron",
            body: "新版本"+info.version+"可用，正在自动下载",
            icon: __dirname + '/MegaEvolve/evolved-withBackground.ico',
            timeoutType: "default"
        }).show();
    });
    autoUpdater.on('error', (err) => {
        new Notification({
            title: "evolve-electron",
            body: "自动更新出错："+err.message,
            icon: __dirname + '/MegaEvolve/evolved-withBackground.ico',
            timeoutType: "default"
        }).show();
    });
    autoUpdater.on('update-downloaded', (info) => {
        new Notification({
            title: "evolve-electron",
            body: "已下载新版本"+info.version+"，将在下次打开时自动安装",
            icon: __dirname + '/MegaEvolve/evolved-withBackground.ico',
            timeoutType: "default"
        }).show();
    });
    mainWindowWebContents = mainWindow.webContents;
    if(store.get("stopBackgroundThrottling")??true)mainWindowWebContents.backgroundThrottling = false;
    session.defaultSession.loadExtension(path.join(__dirname.split("app.asar")[0], 'extensions', 'dhdgffkkebhmkfjojejmpbldmpobfkfo'), {allowFileAccess: true}).then(()=>{
        switch(store.get("gameSource")){
            case "inside":
                mainWindow.loadFile('MegaEvolve/index.html').then(firstLoadPage);
                break;
            case "xiaofengdizhu":
                mainWindow.loadURL("https://xiaofengdizhu.github.io/MegaEvolve/").then(firstLoadPage);
                break;
            case "pmotschmann":
                mainWindow.loadURL("https://pmotschmann.github.io/Evolve/").then(firstLoadPage);
                break;
            case "g8hh":
                mainWindow.loadURL("https://g8hh.github.io/evolve/").then(firstLoadPage);
                break;
            default:
                mainWindow.loadFile('MegaEvolve/index.html').then(firstLoadPage);
        }
    });
}

function firstLoadPage() {
    try {
        if(store.get("openAutoUpdate")??true){
            //autoUpdater.checkForUpdatesAndNotify().then();
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

nativeTheme.themeSource = store.get("mainWindow.theme") ?? "system";

app.setAboutPanelOptions({
    applicationName: app.name,
    applicationVersion: app.getVersion(),
    copyright: "by 销锋镝铸",
    credits: "an Electron app that you can play Evolve in it.\n一个用于玩Evolve的Electron套壳软件",
    iconPath: __dirname + '/MegaEvolve/evolved.ico',
    website:"https://github.com/XiaofengdiZhu/evolve-electron"
});
app.enableSandbox();
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
    createMainWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0)createMainWindow();
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
                    icon: __dirname + '/MegaEvolve/evolved'+(nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"-light":"")+'.ico',
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
                shell.openExternal(url);
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
                shell.openExternal(url);
            });
        }
    });
    contents.on('render-process-gone', (event, details) => {
        contents.reload();
        new Notification({
            title: "evolve-electron",
            body: "渲染进程崩溃了，已尝试刷新页面\n错误代码：" + details.exitCode + "；原因：" + details.reason,
            icon: __dirname + '/MegaEvolve/evolved-withBackground.ico',
            timeoutType: "default"
        }).show();
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
                                mainWindow.loadFile('MegaEvolve/index.html');
                            }
                        },
                        {
                            label: "在线超进化版 from 销锋镝铸",
                            sublabel: "https://xiaofengdizhu.github.io/MegaEvolve/",
                            type: "radio",
                            checked: store.get("gameSource")==="xiaofengdizhu",
                            click() {
                                store.set("gameSource","xiaofengdizhu");
                                mainWindow.loadURL("https://xiaofengdizhu.github.io/MegaEvolve/");
                            }
                        },
                        {
                            label: "在线原版 by pmotschmann",
                            sublabel: "https://pmotschmann.github.io/Evolve/",
                            type: "radio",
                            checked: store.get("gameSource")==="pmotschmann",
                            click() {
                                store.set("gameSource","pmotschmann");
                                mainWindow.loadURL("https://pmotschmann.github.io/Evolve/");
                            }
                        },
                        {
                            label: "在线锅巴汉化版 from g8hh",
                            sublabel: "https://g8hh.github.io/evolve/",
                            type: "radio",
                            checked: store.get("gameSource")==="g8hh",
                            click() {
                                store.set("gameSource","g8hh");
                                mainWindow.loadURL("https://g8hh.github.io/evolve/");
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
                                    win.setIcon(__dirname + '/MegaEvolve/evolved'+(nativeTheme.shouldUseDarkColors?"-light":"")+'.ico');
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
                                    win.setIcon(__dirname + '/MegaEvolve/evolved.ico');
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
                                    win.setIcon(__dirname + '/MegaEvolve/evolved-light.ico');
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
                            mainWindowWebContents.backgroundThrottling = true;
                            store.set("stopBackgroundThrottling",false);
                        }else{
                            mainWindowWebContents.backgroundThrottling = false;
                            store.set("stopBackgroundThrottling",true);
                        }
                    }
                },
                {type: 'separator'},
                {label: "刷新", role: 'reload'},
                {label: "清除缓存并刷新", role: 'forceReload'},
                {label: "开发者工具", role: 'toggleDevTools'},
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
                            new Notification({
                                title: "evolve-electron",
                                body: "按住alt显示菜单栏",
                                silent: true,
                                icon: __dirname + '/MegaEvolve/evolved-withBackground.ico',
                                timeoutType: "default"
                            }).show();
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
                        shell.openExternal("https://github.com/XiaofengdiZhu/evolve-electron/tree/main/tampermonkeyScripts");
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
                        /*autoUpdater.checkForUpdates().then((result)=>{
                            if(result){
                                dialog.showMessageBox({
                                    type:"question",
                                    cancelId:1,
                                    buttons:["是","否"],
                                    message: "检测到新版本"+result.updateInfo.version+"，是否前往下载？"
                                }).then((response)=>{
                                    if(response.response===0){
                                        shell.openExternal("https://github.com/XiaofengdiZhu/evolve-electron/releases");
                                    }
                                });
                            }else{
                                new Notification({
                                    title: "evolve-electron",
                                    body: "未检测到新版本或检测失败",
                                    silent: true,
                                    icon: __dirname + '/MegaEvolve/evolved-withBackground.ico',
                                    timeoutType: "default"
                                }).show();
                            }
                        });*/
                    }
                },
                {
                    label: "开启自动更新",
                    type: "checkbox",
                    checked: store.get("openAutoUpdate")??true,
                    click() {
                        if(store.get("openAutoUpdate")??true){
                            store.set("openAutoUpdate",false);
                        }else{
                            store.set("openAutoUpdate",true);
                            //autoUpdater.checkForUpdatesAndNotify().then();
                        }
                    }
                },
                {type: 'separator'},
                {
                    label:"Github",
                    click(){
                        shell.openExternal("https://github.com/XiaofengdiZhu/evolve-electron");
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