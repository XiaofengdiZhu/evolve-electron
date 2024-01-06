// ==UserScript==
// @name         配合离屏模式
// @version      1.0 for 超进化 20231113
// @author       销锋镝铸
// @downloadURL  https://github.com/XiaofengdiZhu/evolve-electron/raw/main/tampermonkeyScripts/配合离屏模式.js
// @updateURL    https://github.com/XiaofengdiZhu/evolve-electron/raw/main/tampermonkeyScripts/Meta/配合离屏模式.meta.js
// @match        http://localhost:4400/
// @match        https://xiaofengdizhu.github.io/MegaEvolve/
// @match        https://xiaofengdizhu.github.io/MegaEvolve/index.html
// @match        file:///*/MegaEvolve/index.html
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    if(window.electron) {
        window.electron.getGameDaysHandler(()=>window.evolve.global.stats.days);
        window.electron.stopOrContinueHandler(()=>{
            let newPause = !window.evolve.global.settings.pause;
            window.evolve.global.settings.pause=newPause;
            if(!newPause)window.evolve.gameLoop('start');
            return newPause;
        });
    }
})();