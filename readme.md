# evlove-electron
## About 关于
As the name, this is an [Electron](https://www.electronjs.org/) app that you can play [Evolve](https://github.com/pmotschmann/Evolve) in it.
如题，这是一个用于玩[Evolve](https://github.com/pmotschmann/Evolve)的[Electron](https://www.electronjs.org/)套壳软件。

Because most modern web browsers limit the web games running in the background, so I decide to resolve it by myself. I choose making the web game running in [Electron](https://www.electronjs.org/) to improve the background performance.
因为绝大部分现代浏览器对后台运行网页游戏有限制，所以我决定自己动手解决此问题，选择了[Electron](https://www.electronjs.org/)套壳来提升后台能力。

## Fetchers 特色
* Full speed in background.即使在后台也全速运行。
* Support multiple game source and provide an inside [speed-up version](https://github.com/XiaofengdiZhu/MegaEvolve).支持多种游戏来源，并提供一个内置加速版本[超进化](https://github.com/XiaofengdiZhu/MegaEvolve)。
* Support scripts with some limitations.支持脚本（有限制）。
* Light and dark theme.亮色、暗色主题。

## Scripts 脚本
1. Click `脚本` button on the menubar, click `启用` button if this button is not checked, click `打开脚本文件夹` button.
点击菜单栏的`脚本`按钮, 如果`启用`按钮还没勾选那么请点击它, 点击`打开脚本文件夹`按钮
2. Put your Tampermonkey scripts to the opened folder, the scripts must have below codes at least(for example).
把你的Tampermonkey脚本放到打开的文件夹，脚本必须至少有以下代码（示例）：
```js
// @name         evolve历史数据统计
// @version      1.4.4.10
// @author       DSLM
```
3. If the script includes `// @require`, you must copy the required codes into this script, like what I did for the [evolve历史数据统计](https://github.com/XiaofengdiZhu/evolve-electron/blob/master/tampermonkeyScripts/历史数据统计.1.4.4.9.js#L19).
如果脚本中包含`// @require`，你必须复制它所require的代码到此脚本里，就像我为[evolve历史数据统计](https://github.com/XiaofengdiZhu/evolve-electron/blob/master/tampermonkeyScripts/历史数据统计.1.4.4.9.js#L19)做的一样。
4. Click `脚本` button on the menubar, click `重新加载并刷新` button, hover pointer on `脚本列表` then check your scripts.
点击菜单栏的`脚本`按钮，点击`重新加载并刷新`按钮，将鼠标移到`脚本列表`上，勾选你的脚本。
> **Attention 注意**  
> For now, this app can not update the latest adapted scripts for MegaEvolve, if someday you find out the adapted scripts works badly, please download the latest scripts from here:
> 目前这个软件无法自动更新超进化适配脚本，如果有一天你感觉脚本运行有问题，请从下面链接下载最新版脚本：  
> https://github.com/XiaofengdiZhu/evolve-electron/tree/main/tampermonkeyScripts

## Screenshot 截图
![screenshot 截图](screenshot.png)

## Build Commands 构建命令
1. Install dependencies. 安装依赖。
```
yarn install
```
2. Test is it ok. 测试能否正常运行。
```
yarn start
```
3. Build a installer. 构建一个安装程序。
```
node.exe builder.js
```

## Key codes 关键代码
This application use below codes to improve background performance:
这个软件使用以下代码来提升后台性能：
```js
//Prevent the application from being suspended. Keeps system active but allows screen to be turned off.
//阻止软件被暂停。保持系统活动状态，但允许屏幕关闭。 
powerSaveBlocker.start('prevent-app-suspension');
//Stop throttle animations and timers when the page becomes backgrounded.
//网页后台时不限制动画和计时器。
webContents.backgroundThrottling = false;
```