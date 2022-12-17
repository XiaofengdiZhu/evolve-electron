const path = require("path");
module.exports = {
    "packagerConfig": {
        "appVersion": "1.0.0",
        "name": "evolve-electron",
        "appCopyright":"销锋镝铸",
        "icon": "MegaEvolve/evolved.ico",
        "win32metadata": {
            "ProductName": "evolve-electron",
            "CompanyName": "销锋镝铸",
            "FileDescription": "evolve-electron by 销锋镝铸"
        }
    },
    "makers": [
        {
            "name": "@electron-forge/maker-squirrel",
            "config": {
                "name": "evolve-electron",
                "iconUrl": path.join(__dirname, "MegaEvolve", "evolved.ico"),
                "setupIcon": path.join(__dirname, "MegaEvolve", "evolved.ico"),
                "skipUpdateIcon": true
            }
        },
        {
            "name": "@electron-forge/maker-zip",
            "platforms": [
                "darwin"
            ]
        },
        {
            "name": "@electron-forge/maker-deb",
            "config": {}
        },
        {
            "name": "@electron-forge/maker-rpm",
            "config": {}
        }
    ]
}