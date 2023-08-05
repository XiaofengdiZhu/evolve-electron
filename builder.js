"use strict"

const builder = require("electron-builder")
const {FuseVersion, FuseV1Options, flipFuses} = require("@electron/fuses");
const path = require("path");
const Platform = builder.Platform

// Let's get that intellisense working
/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
const options = {
    "appId": "xfdz.evolve-electron",
    "copyright": "Copyright © 2023 销锋镝铸",
    // "store” | “normal” | "maximum". - For testing builds, use 'store' to reduce build time significantly.
    compression: "store",
    removePackageScripts: true,
    nodeGypRebuild: false,
    buildDependenciesFromSource: false,
    files: [
        "index.html",
        "ga4mp.js",
        "main.js",
        "gamePreload.js",
        "monitor/**",
        "electron-prompt/**"
    ],
    extraResources:[
        "MegaEvolve/**",
        "extensions/**"
    ],

    win: {
        "publish": [
            {
                "provider": "github",
                "owner": "XiaofengdiZhu",
                "repo": "evolve-electron"
            }
        ],
        "target": [
            {
                "target": "nsis",
                "arch": [
                    "x64"
                ]
            }
        ]
    },
    nsis: {
        "oneClick": false,
        "perMachine": false,
        "allowToChangeInstallationDirectory": true,
        "uninstallDisplayName": "${name}",
        "runAfterFinish": false
    },
    afterPack: async (context) => {
        if (context.electronPlatformName !== 'darwin' || context.arch === builder.Arch.universal) {
            await addElectronFuses(context)
        }
    }
};
async function addElectronFuses(context) {
    const { appOutDir, packager: { appInfo }, electronPlatformName, arch } = context
    const ext = {
        darwin: '.app',
        win32: '.exe',
        linux: [''],
    }[electronPlatformName];

    const electronBinaryPath = path.join(appOutDir, `${appInfo.productFilename}${ext}`);
    console.log('Flipping fuses for: ', electronBinaryPath)

    await flipFuses(electronBinaryPath, {
        version: FuseVersion.V1,
        resetAdHocDarwinSignature: electronPlatformName === 'darwin' && arch === builder.Arch.arm64, // necessary for building on Apple Silicon
        [FuseV1Options.RunAsNode]: false,
        [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
        [FuseV1Options.EnableNodeCliInspectArguments]: false,
        [FuseV1Options.OnlyLoadAppFromAsar]: true,
    });
};
// Promise is returned
builder.build({
    targets: Platform.WINDOWS.createTarget(),
    config: options
})
    .then((result) => {
        console.log("done:"+result[1])
    })
    .catch((error) => {
        console.error(error)
    })
