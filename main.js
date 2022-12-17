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
    session
} = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store');
const prompt = require('electron-prompt');

if (require('electron-squirrel-startup')) return app.quit();

const store = new Store();
let userDataPath = app.getPath("userData");

let mainWindow,mainWindowID,mainWindowWebContents;
const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        icon: __dirname + '/MegaEvolve/evolved'+(nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"-light":"")+'.ico',
        title: 'evolve-electron by 销锋镝铸',
        width: store.get("mainWindow.bounds.width") ?? 1000,
        height: store.get("mainWindow.bounds.height") ?? 800,
        x: store.get("mainWindow.bounds.x") ?? undefined,
        y: store.get("mainWindow.bounds.y") ?? undefined,
        autoHideMenuBar: store.get("mainWindow.autoHideMenuBar") ?? false
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
    mainWindowWebContents = mainWindow.webContents;
    if(store.get("stopBackgroundThrottling")??true)mainWindowWebContents.backgroundThrottling = false;
    mainWindowWebContents.on('dom-ready', () => {
        if (store.get("enableTampermonkeyScripts")) {
            executeTampermonkeyScriptList();
        }
    });
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
}

function firstLoadPage() {
    if (store.get("enableTampermonkeyScripts")) {
        LoadTampermonkeyScript(true, true);
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
    applicationVersion: "v"+app.getVersion(),
    copyright: "by 销锋镝铸",
    credits: "an Electron app that you can play Evolve in it.\n一个用于玩Evolve的Electron套壳软件",
    iconPath: __dirname + '/MegaEvolve/evolved.ico',
    website:"https://github.com/XiaofengdiZhu/MegaEvolve"
});

let powerSaveBlockerID = null;
app.whenReady().then(() => {
    if(store.get("powerSaveBlocker")??true){
        powerSaveBlockerID=powerSaveBlocker.start('prevent-app-suspension');
    }

    let scriptsFolderPath = path.join(userDataPath, "tampermonkeyScripts\\");
    fs.access(scriptsFolderPath, fs.constants.W_OK, (err) => {
        if (err) {
            fs.cp(path.join(__dirname, 'tampermonkeyScripts\\'), scriptsFolderPath, {recursive: true}, (err) => {
                console.log(err);
            });
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

app.on('web-contents-created', (event, contents) => {
    contents.setWindowOpenHandler(({url,features}) => {
        if (url.toLowerCase().endsWith("evolve/wiki.html")) {
            return {
                action: "allow",
                overrideBrowserWindowOptions:{
                    icon: __dirname + '/MegaEvolve/evolved'+(nativeTheme.themeSource==="dark"||(nativeTheme.themeSource==="system"&&nativeTheme.shouldUseDarkColors)?"-light":"")+'.ico',
                    width:1080,
                    height:800,
                    autoHideMenuBar: true
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
        url = url.toLowerCase();
        if (url.endsWith("evolve/") || url.endsWith("evolve/index.html") || url.endsWith("evolve/wiki.html")) {

        } else {
            event.preventDefault();
            setImmediate(() => {
                shell.openExternal(url);
            });
        }
    });
    contents.on('render-process-gone', (event, details) => {
        dialog.showErrorBox(contents.getTitle(),"渲染进程崩溃了，已尝试刷新页面\n错误代码：" + details.exitCode + "\n原因：" + details.reason);
        contents.reload();
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
                                mainWindow.loadFile('evolve/index.html');
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
            ]
        },
        {
            label: '脚本',
            submenu: [
                {
                    label: "启用",
                    type: 'checkbox',
                    checked: store.get("enableTampermonkeyScripts") ?? false,
                    click() {
                        let appMenu = Menu.getApplicationMenu();
                        if (store.get("enableTampermonkeyScripts")) {
                            store.set("enableTampermonkeyScripts", false);
                            appMenu.getMenuItemById("reloadScripts").enabled = false;
                            appMenu.getMenuItemById("openScriptsFolder").enabled = false;
                            appMenu.getMenuItemById("scriptsList").enabled = false;
                            dialog.showMessageBox({message: "脚本功能已关闭，重启生效"});
                        } else {
                            store.set("enableTampermonkeyScripts", true);
                            appMenu.getMenuItemById("reloadScripts").enabled = true;
                            appMenu.getMenuItemById("openScriptsFolder").enabled = true;
                            appMenu.getMenuItemById("scriptsList").enabled = true;
                            new Notification({
                                title: "evolve-electron",
                                body: "脚本功能已打开",
                                silent: true,
                                icon: __dirname + '/MegaEvolve/evolved-withBackground.ico',
                                timeoutType: "default"
                            }).show();
                            LoadTampermonkeyScript(false, true);
                        }
                    }
                }, {
                    label: "重新加载并刷新",
                    id: "reloadScripts",
                    enabled: store.get("enableTampermonkeyScripts") ?? false,
                    click() {
                        LoadTampermonkeyScript(true, false);
                        mainWindow.webContents.reload();
                    }
                }, {
                    label: "打开脚本文件夹",
                    id: "openScriptsFolder",
                    enabled: store.get("enableTampermonkeyScripts") ?? false,
                    click() {
                        shell.openPath(path.join(userDataPath, 'tampermonkeyScripts'));
                    }
                }, {
                    label: "脚本列表",
                    id: 'scriptsList',
                    enabled: store.get("enableTampermonkeyScripts") ?? false,
                    submenu: []
                }
            ]
        },
        {
            label: "关于",
            submenu:[
                {
                    label:"Github",
                    click(){
                        shell.openExternal("https://github.com/XiaofengdiZhu/MegaEvolve");
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

let loadedTampermonkeyScript = false;
let tampermonkeyScriptList = [];
let tempScriptList = [];

function LoadTampermonkeyScript(force = false, exeImme = false) {
    if (loadedTampermonkeyScript && !force) {
        return;
    }
    tempScriptList = [];
    fs.readdir(path.join(userDataPath, 'tampermonkeyScripts'), (error, files) => {
        if (error) {
            console.log(error);
        } else {
            let regexp = /\/\/ @(\S*)\s*(.*)/i;
            let scriptsListSubmenu = Menu.getApplicationMenu().getMenuItemById("scriptsList").submenu;
            files.forEach(file => {
                let data = fs.readFileSync(path.join(userDataPath, 'tampermonkeyScripts', file));
                let infos = {};
                data.toString('utf8').split('\n').filter((line) => line.startsWith('// @')).forEach((info) => {
                    let result = info.replace(regexp, "$1《》$2").split("《》");
                    switch (result[0]) {
                        case "name":
                            infos["name"] = result[1].trim();
                            break;
                        case "version":
                            infos["version"] = "v" + result[1].trim();
                            break;
                        case "author":
                            infos["author"] = result[1].trim();
                            break;
                    }
                });
                if (infos.name) {
                    let fullName = infos.name + "by" + infos.author;
                    let sameItem = tampermonkeyScriptList.some((item) => {
                        return item.file === file && item.fullName === fullName
                    });
                    tempScriptList.push({"file": file, "fullName": fullName});
                    if (!sameItem) {
                        scriptsListSubmenu.append(new MenuItem({
                            label: infos.name + " by " + infos.author,
                            sublabel: infos.version,
                            id: fullName,
                            type: 'checkbox',
                            checked: store.get("tampermonkeyScripts."+infos.name + "by" + infos.author) ?? false,
                            click() {
                                if (store.get("tampermonkeyScripts."+fullName)) {
                                    store.set("tampermonkeyScripts."+fullName, false);
                                } else {
                                    store.set("tampermonkeyScripts."+fullName, true);
                                    fs.readFile(path.join(userDataPath, 'tampermonkeyScripts', file), (error, data2) => {
                                        if (error) {
                                            console.log(error);
                                        } else {
                                            mainWindow.webContents.executeJavaScript(data2);
                                        }
                                    });
                                }
                            }
                        }));
                        if (exeImme && store.get("tampermonkeyScripts."+fullName)) {
                            mainWindow.webContents.executeJavaScript(data);
                        }
                    }
                    data = null;
                }

            });
            tampermonkeyScriptList.forEach((loadedItem) => {
                if (!tempScriptList.some((tempItem) => {
                    return loadedItem.file === tempItem.file && loadedItem.file === tempItem.file;
                })) {
                    let menu = Menu.getApplicationMenu().getMenuItemById(loadedItem.fullName);
                    menu.enabled = false;
                    menu.sublabel = "失效";
                }
            });
            tampermonkeyScriptList = JSON.parse(JSON.stringify(tempScriptList));
        }
    });
    loadedTampermonkeyScript = true;
}

function executeTampermonkeyScriptList() {
    tampermonkeyScriptList.forEach(item => {
        if (item.fullName) {
            fs.readFile(path.join(userDataPath, 'tampermonkeyScripts', item.file), (error, data) => {
                if (error) {
                    console.log(error);
                    let menu = Menu.getApplicationMenu().getMenuItemById(item.fullName);
                    menu.enabled = false;
                    menu.sublabel = "失效";
                } else {
                    if (store.get("tampermonkeyScripts."+item.fullName)) {
                        mainWindow.webContents.executeJavaScript(data);
                    }
                    data = null;
                }
            });
        }
    });
}