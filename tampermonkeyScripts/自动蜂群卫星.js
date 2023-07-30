// ==UserScript==
// @name         自动蜂群卫星
// @version      1.0 for 超进化 20230716
// @author       销锋镝铸
// @downloadURL  https://github.com/XiaofengdiZhu/evolve-electron/raw/main/tampermonkeyScripts/自动蜂群卫星.js
// @updateURL    https://github.com/XiaofengdiZhu/evolve-electron/raw/main/tampermonkeyScripts/Meta/自动蜂群卫星.meta.js
// @match        http://localhost:4400/
// @match        https://xiaofengdizhu.github.io/MegaEvolve/
// @match        file:///*/MegaEvolve/index.html
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    let intervalTimes = 0;
    let intervalId = window.setInterval(function() {
        //判断是否需要初始化
        if (++intervalTimes > 100) {
            var intervalId_temp = intervalId;
            intervalTimes = 0;
            intervalId = window.setInterval(intervalId, 5000);
            clearInterval(intervalId_temp);
            return;
        }
        let swarm_satellite = window.evolve.global.space.swarm_satellite;
        if(swarm_satellite==null)return;
        let nowCount = swarm_satellite.count;
        let building = window.evolve.actions.space.spc_sun.swarm_satellite;
        while (building.cost.Money() < 600&&nowCount<8100) {
            building.action();
            nowCount++;
        }
        building = null;
        if(window.evolve.global.space.swarm_satellite.count>8000){
            clearInterval(intervalId);
            console.log("已建造8000个以上蜂群卫星")
        }
    }, 5000);
})();