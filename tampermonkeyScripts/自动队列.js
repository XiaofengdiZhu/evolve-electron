// ==UserScript==
// @name         自动队列
// @version      1.0 for 超进化 20230716
// @author       销锋镝铸
// @downloadURL  https://github.com/XiaofengdiZhu/evolve-electron/raw/main/tampermonkeyScripts/自动队列.js
// @updateURL    https://github.com/XiaofengdiZhu/evolve-electron/raw/main/tampermonkeyScripts/Meta/自动队列.meta.js
// @match        http://localhost:4400/
// @match        https://xiaofengdizhu.github.io/MegaEvolve/
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const buildings = [{
        id: "world_collider", //世界对撞机
        action: "space",
        startCount: 10,
        speed: 1859,
        stopCount: 1859
    }, {
        id: "stargate", //星际之门
        action: "interstellar",
        startCount: 10,
        speed: 200,
        stopCount: 200
    }, {
        id: "stellar_engine", //恒星引擎
        action: "interstellar",
        startCount: 10,
        speed: 100,
        stopCount: 100
    }, {
        id: "space_elevator", //轨道电梯
        action: "interstellar",
        startCount: 5,
        speed: 100,
        stopCount: 100
    }, {
        id: "gravity_dome", //重力穹顶
        action: "interstellar",
        startCount: 1,
        speed: 100,
        stopCount: 100
    }, {
        id: "ascension_machine", //飞升装置
        action: "interstellar",
        startCount: 1,
        speed: 100,
        stopCount: 100
    }, {
        id: "thermal_collector", //集热器
        action: "interstellar",
        startCount: 1,
        speed: 67,
        stopCount: 67
    }];
    let completedBuilding=[];
    let intervalTimes = 0;
    let intervalId = window.setInterval(function() {
        //判断是否需要初始化
        if (++intervalTimes > 500) {
            var intervalId_temp = intervalId
            intervalTimes = 0;
            intervalId = window.setInterval(intervalId, 2000);
            clearInterval(intervalId_temp)
            return;
        }
        buildings.forEach((building,index) => {
            try {
                if(completedBuilding.indexOf(index)>-1)return;
                let temp = evolve.global[building.action][building.id];
                if (!temp) { return; }
                let nowCount = temp.count;
                if (nowCount < building.stopCount) {
                    if (nowCount > building.startCount) {
                        let element = window.evolve.virtualTree.find(el => el.id === building.action + "-" + building.id);
                        if (element) {
                            for (let i = 0; i < Math.min(building.speed, building.stopCount - nowCount - i); i++) {
                                element.action();
                            }
                        }
                    }
                } else {
                    completedBuilding.push(index);
                }
            } catch (error) {
                console.log(error);
            }
        });
        if (completedBuilding.length >= buildings.length) {
            clearInterval(intervalId);
        }
    }, 2000);
})();