const osc = require('osc');
const lib = require('./mainFunctions');
const { EmberClient } = require('emberplus-connection');
const ElectronPreferences = require('electron-preferences');
const electron = require('electron');
const { ipcMain } = require('electron');
const nativeTheme = electron.nativeTheme;
const { app, BrowserWindow } = require('electron');
const mainFunctions = require('./mainFunctions');
const { dialog } = require('electron');
const { send } = require('process');
const appVersion = app.getVersion()
const fs = require('fs');
const defaultDir = app.getPath('documents') + '/MCxOSCnext';
if (!fs.existsSync(defaultDir)) {
  fs.mkdirSync(defaultDir)
};
const log = require('electron-log');



const stream = []
let direction = "";

let gateDelayIN ="";
let gateDelayOUT="";







//#Time Section#//
let date_ob = new Date();
let date = lib.IntTwoChars(date_ob.getDate());
let month = lib.IntTwoChars(date_ob.getMonth() + 1);
let year = date_ob.getFullYear();
let hours = lib.IntTwoChars(date_ob.getHours());
let minutes = lib.IntTwoChars(date_ob.getMinutes());
let seconds = lib.IntTwoChars(date_ob.getSeconds());
const datePath = `autosave_${hours}-${minutes}-${seconds}_${month}-${date}-${year}`;
log.info("datePath : ", datePath)
//#End of Time Section#//

//#Options Section//
let recOptions;
let openOptions;

function optionsDef() {
  recOptions = {
    filters: [
      { name: 'Session file', extensions: ['session'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    title: "Save your session in a *.session file",
    defaultPath: defaultDir + '/MySession.session',
  }
  openOptions = {
    filters: [
      { name: 'Session file', extensions: ['session'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections'],
    title: "Choose a *.session file",
    defaultPath: defaultDir,
  }
  autoSaveFilepath = defaultDir + "/" + datePath + ".session"
  console.log("autoSaveFilepath: ", autoSaveFilepath)
}
optionsDef()
//#End of Options Section//
function createWindow() {

  let win = new BrowserWindow({
    width: 1200,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,

    },
    icon: `${__dirname}/assets/icons/64x64.png`
  })
  nativeTheme.themeSource = 'dark';
  win.setMenu(null);
  win.loadFile('src/index.html')
  win.webContents.openDevTools({ mode: 'detach' });

  win.webContents.on('did-finish-load', () => {
    win.webContents.send('ready')
  })

  ipcMain.on('sendAutoSave', function (event, content) {
    let autoSave = (preferences.value('save_settings.autoSave'))[1]
    console.log("autoSave :", autoSave)
    if (autoSave !== undefined) {
      fs.writeFile(autoSaveFilepath, content, (err) => {
        if (err) {
          console.log('an error occurred with file creation ' + err.message);
        }
        console.log('WE CREATED YOUR FILE SUCCESFULLY');
      });
    };
    win = null;
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })

  //---Preferences Window#//
  const preferences = new ElectronPreferences({
    browserWindowOpts: {
      title: 'preferences',
      icon: `${__dirname}/assets/icons/64x64.png`
    },
    css: './src/style.css',
    dataStore: defaultDir + '/config.json',
    defaults: {
      "network_settings": {
        "ember_provider": "192.168.100.36:9000",
        "osc_server": "127.0.0.1:12000",
        "osc_receiver_port": "9000",
        "autoConnect": [
          ""
        ],
      },
      "save_settings": {
        "rec_dir": defaultDir,
        "default_file": defaultDir + "/MySession.session",
        "autoLoad": [
        ],
        "autoSave": [
        ],
      },
      "other_settings": {
        "autoGo": [
        ]
      }
    },
    sections: [
      {
        id: 'network_settings',
        label: 'Network Settings',
        icon: 'preferences',
        form: {
          groups: [
            {
              label: 'Ember+ Provider',
              fields: [
                {
                  label: 'Ip Address:Port ',
                  key: 'ember_provider',
                  type: 'text',
                },
                {
                  label: '',
                  key: 'resetButton',
                  type: 'button',
                  buttonLabel: 'Apply',
                  help: 'example: 192.168.100.36:9000',
                  hideLabel: true,
                },
              ],
            },
            {
              label: 'OSC settings',
              fields: [
                {
                  label: 'Send to Ip Address:Port ',
                  key: 'osc_server',
                  type: 'text',
                  help: 'example: 127.0.0.1:12000'
                },
                {
                  label: 'Receive on Port ',
                  key: 'osc_receiver_port',
                  type: 'number'
                },
                {
                  label: '',
                  key: 'applyButton',
                  type: 'button',
                  buttonLabel: 'Apply',
                  hideLabel: true,
                },
              ]
            },
          ],
        },
      },
      {
        id: 'save_settings',
        label: 'Save settings',
        icon: 'single-folded-content',
        form: {
          groups: [
            {
              label: 'Save folder',
              fields: [
                {
                  label: 'Select your preferred Save folder',
                  key: 'rec_dir',
                  type: 'directory',
                  multiSelections: false,
                  noResolveAliases: false,
                  treatPackageAsDirectory: false,
                  dontAddToRecent: true,
                },
                {
                  label: 'Select a default file launched at startup',
                  buttonLabel: 'Open',
                  key: 'default_file',
                  type: 'file',
                  filters: [
                    {
                      name: 'session file',
                      extensions: ['session'],
                    }
                  ],
                  multiSelections: false, //Allow multiple paths to be selected
                  showHiddenFiles: false, //Show hidden files in dialog
                  noResolveAliases: false, //(macos) Disable the automatic alias (symlink) path resolution. Selected aliases will now return the alias path instead of their target path.
                  treatPackageAsDirectory: false, //(macos) Treat packages, such as .app folders, as a directory instead of a file.
                  dontAddToRecent: false, //(windows) Do not add the item being opened to the recent documents list. 
                },
                {
                  label: '',
                  key: 'autoLoad',
                  type: 'checkbox',
                  options: [
                    { label: 'Load this file at startup', value: 'on' },
                  ],
                },
                {
                  label: '',
                  key: 'autoSave',
                  type: 'checkbox',
                  options: [
                    { label: 'Save current config before close', value: 'autoSave' },
                  ],
                }
              ]
            }
          ]
        }
      },
      {
        id: 'other_settings',
        label: 'Other Settings',
        icon: 'settings-gear-63',
        form: {
          groups: [
            {
              label: 'Other Settings',
              fields: [

                {
                  label: '',
                  key: 'autoGo',
                  type: 'checkbox',
                  options: [
                    { label: 'load table content on startup', value: 'on' },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
    debug:true
  });

  const oServerIP = ((preferences.value('network_settings.osc_server')).split(":"))[0];
  const oServerPort = Number(((preferences.value('network_settings.osc_server')).split(":"))[1]);

  preferences.on('save', (preferences) => {
    console.log("preferences:", preferences);
    console.log(`Preferences were saved.`, JSON.stringify(preferences, null, 4));
  });

  // load auto-options on startup  
  function loadPrefs() {
    let autoLoad = (preferences.value('save_settings.autoLoad'))[0]
    console.log("valeur autoload lue", autoLoad)
    let default_file = preferences.value("save_settings.default_file")
    let autoGo = (preferences.value('other_settings.autoGo'))[0]
    console.log("valeur autoGo lue", autoGo)
    if (autoLoad !== undefined) {
      win.webContents.on('did-finish-load', () => {
        console.log("la fenetre est prete et peut recevoir les options")
        let content = fs.readFileSync(default_file, 'utf-8');
        let sendedContent = JSON.stringify(content);
        win.webContents.send("sendFileContent", sendedContent)
        win.webContents.send('sendFilename', default_file)
        if (autoGo !== undefined) {
          win.webContents.send("autoGo")
        }
      });
    }
  }
  loadPrefs()

  function logDefinition() {
    console.log = log.log;
    Object.assign(console, log.functions);
    log.transports.console.format = '{h}:{i}:{s} / {text}';
    log.catchErrors({
      showDialog: false,
      onError(error) {
        electron.dialog.showMessageBox({
          title: 'An error occurred',
          message: error.message,
          detail: error.stack,
          type: 'error',
          buttons: ['Ignore', 'Preferences', 'Exit'],
        })
          .then((result) => {
            if (result.response === 1) {
              win.webContents.send('resolveError')
            }
          
            if (result.response === 2) {
              electron.app.quit();
            }
          });
      }
    })
  }
  logDefinition();

  ipcMain.on('sendSaveAs', (content) => {
    filename = dialog.showSaveDialog(null, recOptions, {}
    ).then(result => {
      filename = result.filePath;
      if (filename === undefined) {
        console.log('the user clicked the btn but didn\'t created a file');
      }
      fs.writeFile(filename, content, (err) => {
        if (err) {
          console.log('an error ocurred with file creation ' + err.message);
        }
        console.log('WE CREATED YOUR FILE SUCCESFULLY');
        win.webContents.send('sendFilename', filename);
      });
    });
  })

  ipcMain.on('sendSave', (content, rSfilename) => {
    //console.log("sendsave filepath", rSfilename);
    //console.log("sendsave content", content);
    if (rSfilename === undefined) {
      console.log('the user clicked the btn but didn\'t created a file');
    }
    fs.writeFile(rSfilename, content, (err) => {
      if (err) {
        console.log('an error ocurred with file creation ' + err.message);
      }
      console.log('WE CREATED YOUR FILE SUCCESFULLY');
      //win.webContents.send('sendFilename', filename);
    });
  })

  ipcMain.on('openFile', () => {
    filename = dialog.showOpenDialog(null, openOptions, {})
      .then(result => {
        filename = result.filePaths;
        //console.log(filename);
        let file = filename[0];
        //console.log(file);
        let content = fs.readFileSync(file, 'utf-8');
        //console.log(content);
        let sendedContent = JSON.stringify(content);
        //console.log('sendedContent:', sendedContent);
        win.webContents.send("sendFileContent", sendedContent)
        win.webContents.send('sendFilename', file)
        let autoGo = (preferences.value("other_settings.autoGo"))[0]
        if (autoGo !== undefined) {
          win.webContents.send("autoGo")
        }
      })
  })

  //---Network Settings Section---//
  //---Initiating Ember and OSC---//
  function emberGet() {
    const eAddress = preferences.value('network_settings.ember_provider')
    const eServerIP = ((preferences.value('network_settings.ember_provider')).split(":"))[0];
    const eServerPort = Number(((preferences.value('network_settings.ember_provider')).split(":"))[1]);
    eGet = new EmberClient(eServerIP, eServerPort);
    eGet.on('connected', () => {
      console.log("emberGet ", eServerIP, ":", eServerPort, " connection ok");
      win.webContents.on('did-finish-load', () => {
        win.webContents.send('eServerOK', eAddress);
      })
    })
    eGet.on('disconnected', () => {
      console.log("Disconnected from emberGet");
      win.webContents.send('eServDisconnected', eAddress);
    })
    eGet.on('uncaughtException', (e) => {
      console.log(e);
      //win.webContents.on('did-finish-load', () => {
      win.webContents.send('eServConnError', eAddress);
      // })
    });
  }
  emberGet();

//  function emberInputListener(node, value, row) {
//    direction = "ET";
//    console.log("Value", value, "received from ember+ for row", row)
//  }


  function oscListening() {
    const oUDPport = preferences.value('network_settings.osc_receiver_port');
    console.log('Port de reception OSC:', oUDPport);
    oscGet = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: Number(oUDPport),
      metadata: true
    })
    oscGet.open();
    oscGet.on('ready', function () {
      win.webContents.on('did-finish-load', () => {
        win.webContents.send('udpportOK', (preferences.value('network_settings.osc_receiver_port')));
        win.webContents.send('oServerOK', (preferences.value('network_settings.osc_server')));
      })
    })
  }
  oscListening();

  function oscToTable() {
    oscGet.on("message", (oscBundle) => {
      console.log('oscBundle : ', oscBundle);
      let oRaddr = JSON.stringify(oscBundle.address);
      console.log("OSC Address received", oRaddr);
      let oRargs = mainFunctions.oscToEmber(oscBundle);
      console.log("oRargs", oRargs);
      win.webContents.send('oReceivedAddr', oRaddr, oRargs);
    })
  }
  oscToTable();

  async function main() {
    try {

      const eAddress = preferences.value('network_settings.ember_provider');
      const err = await eGet.connect()
      if (err) { // err = true when the first connection attempt fails (depending on timeout)
        console.log(' connection to emberGet unsuccessful->', err);
        win.webContents.send('eServConnError', eAddress);
        win.webContents.send('resolveError');
          return
      }
      win.webContents.send('eServerOK', eAddress);
      

      async function getUserLabels() {
        root = await (await eGet.getDirectory(eGet.tree)).response
        let inputsUserLabels = [];
        let auxesUserLabels = [];
        let mastersUserLabels = [];
        let sumsUserLabels = [];
        let gpcsUserLabels = [];
        for (i = 0x01; i < 0x0C1; i++) {
          try {
            let req = await eGet.getElementByPath("_2._1._" + i.toString(16))
            inputsUserLabels.push(req.contents.description)
          } catch (e) {
            // exit the loop
            break;
          }
        };
        win.webContents.send('inputsUserLabels', inputsUserLabels);
        for (i = 0x01; i < 0x0C1; i++) {
          try {
            let req = await eGet.getElementByPath("_2._5._" + i.toString(16))
            auxesUserLabels.push(req.contents.description)
          } catch (e) {
            // exit the loop
            break;
          }
        };
        win.webContents.send('auxesUserLabels', auxesUserLabels);
        for (i = 0x01; i < 0x0C1; i++) {
          try {
            let req = await eGet.getElementByPath("_2._4._" + i.toString(16))
            sumsUserLabels.push(req.contents.description)
          } catch (e) {
            // exit the loop
            break;
          }
        };
        win.webContents.send('sumsUserLabels', sumsUserLabels);
        for (i = 0x01; i < 0x0C1; i++) {
          try {
            let req = await eGet.getElementByPath("_2._6._" + i.toString(16))
            mastersUserLabels.push(req.contents.description)
          } catch (e) {
            // exit the loop
            break;
          }
        };
        win.webContents.send('mastersUserLabels', mastersUserLabels);
        for (i = 0x01; i < 0x0C1; i++) {
          try {
            let req = await eGet.getElementByPath("_2._7._" + i.toString(16))
            gpcsUserLabels.push(req.contents.description)
          } catch (e) {
            // exit the loop
            break;
          }
        };
        win.webContents.send('gpcsUserLabels', gpcsUserLabels);
      };
      getUserLabels()

      ipcMain.on('newConnection', async (event, ePath, oAddr, myRow, eVarType, sFactor, eMin, eMax, oMin, oMax, eVarCurve) => {
        console.log("epath in newconnectionM ", ePath);
        sFactor = Number(sFactor);
        
        let initialReq = await eGet.getElementByPath(ePath);
        let state = "first";
        eGet.subscribe(initialReq, () => {

          if (state == "first") {
            direction = "ET";
            console.log("subscribed to ", ePath);
            let emberValue = initialReq.contents.value;
            event.sender.send('sendEmberValue', emberValue, myRow, 1);
            state = "nonFirst";

            ;
          } else {
            //---Sending received values from Ember+ to OSC
            direction = "EO"
            let emberValue = initialReq.contents.value;
            //emberInputListener(initialReq, emberValue, myRow);
            if (eVarType == "Integer" && eVarCurve == "lin") {
              let value = mainFunctions.mapToScale(Number(emberValue), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2);
              oscGet.send({
                address: oAddr,
                args: [
                  {
                    type: "f",
                    value: Number(value),
                  }
                ]
              }, oServerIP, oServerPort);
              console.log('EMBER+ -lin-> OSC : ', value);
            }
            else if (eVarType == "Integer" && eVarCurve == "log") {
              let value = mainFunctions.mapToScale(Number(emberValue), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2, true);
              oscGet.send({
                address: oAddr,
                args: [
                  {
                    type: "f",
                    value: Number(value),
                  }
                ]
              }, oServerIP, oServerPort);
              console.log('EMBER+ -log-> OSC : ', value);
            }
            else if (eVarType == "String") {
              oscGet.send({
                address: oAddr,
                args: [
                  {
                    type: "s",
                    value: emberValue.toString(),
                  }
                ]
              }, oServerIP, oServerPort);
              console.log('EMBER+ -string-> OSC : ', emberValue);
            }
            else if (eVarType == "Boolean" && emberValue == true) {
              oscGet.send({
                address: oAddr,
                args: [
                  {
                    type: "f",
                    value: 1,
                  }
                ]
              }, oServerIP, oServerPort);
              console.log('EMBER+ -bool-> OSC : ', emberValue);
            }
            else if (eVarType == "Boolean" && emberValue == false) {
              oscGet.send({
                address: oAddr,
                args: [
                  {
                    type: "f",
                    value: 0,
                  }
                ]
              }, oServerIP, oServerPort);
              console.log('EMBER+ -bool-> OSC : ', emberValue);
            }
            direction= "ET";
            if(gateDelayIN){
              clearTimeout(gateDelayIN)
            };

            gateDelayIN =
          (setTimeout(()=>{
            event.sender.send('sendEmberValue', emberValue, myRow, 1);
            console.log("libere")
            direction = "";
          },100));

          } //let stringEpath = JSON.stringify(ePath);
        });
      });

      ipcMain.on("deleteConnection", async (event, ePath, oAddr, myRow, eVarType, sFactor) => {
        let req = await eGet.getElementByPath(ePath);
        eGet.unsubscribe(req);
        console.log('unsuscribe to ', ePath);
      })

      ipcMain.on('reSendOrArgs', async (event, rOrArgs, rEaddr, sFactor, eVarType, eMin, eMax, oMin, oMax, eVarCurve) => {
        if (direction !== "ET") {
          direction = "OE";
          if(gateDelayOUT){
            clearTimeout(gateDelayOUT)
          };
          let rereq = await eGet.getElementByPath(rEaddr);
          //eGet.unsubscribe(rereq);
          console.log("eGet unsuscribe to ", rereq)
          if (eVarType == "Integer" && eVarCurve == "lin") {
            let value = mainFunctions.mapToScale(Number(rOrArgs), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2);
            eGet.setValue((rereq), value.toFixed(0));
            console.log('OSC -lin-> EMBER+ : ', value.toFixed(0));
          } else if (eVarType == "Integer" && eVarCurve == "log") {
            let value = mainFunctions.mapToScale(Number(rOrArgs), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2, true, -1);
            eGet.setValue((rereq), value.toFixed(0));
            console.log('OSC -log-> EMBER+ : ', value.toFixed(0));
          } else if (eVarType == "Boolean" && rOrArgs == "1") {
            eGet.setValue((rereq), true);
            console.log(("OSC -bool-> EMBER+", rOrArgs));
          } else if (eVarType == "Boolean" && rOrArgs == "0") {
            eGet.setValue((rereq), false);
            console.log(("OSC -bool-> EMBER+", rOrArgs));
          } else {
            eGet.setValue((rereq), rOrArgs);
            console.log(("OSC -string-> EMBER+", rOrArgs));
          }

          //eGet.subscribe(rereq);
          console.log("eGet resubscribe to", rereq)
          gateDelayOUT =
          (setTimeout(()=>{
            console.log("delivre")
            direction = "";
          },100));
        } else {
          console.log("E-->O")
        }
      })

    } catch (error) {
      throw Error(error);
    }
  }
  main().catch(err => {
    win.webContents.send('resolveError')
    console.error(err)
  });



  //  main().log.catchErrors({
  //    showDialog: false,
  //    onError(error, versions, submitIssue) {
  //      electron.dialog.showMessageBox({
  //        title: 'An error occurred',
  //        message: error.message,
  //        detail: error.stack,
  //        type: 'error',
  //        buttons: ['Ignore', 'Report', 'Exit'],
  //      })
  //    }
  //  });

  // Using a button field with `channel: 'reset'`
  preferences.on('click', (key) => {
    if (key === 'resetButton') {
      console.log("lebouton reset a ete clicke")

      emberGet();
      main().catch(err => {
        win.webContents.send('resolveError')
        console.error(err)
      });
      //emberPost();

      //eGet.connect()
    }
  });

  oscGet.on("error", (error) => {

    msg = error.message;
    win.webContents.on('did-finish-load', () => {
      console.log("An error occurred with OSC listening: ", error.message);

      win.webContents.send('udpportKO', msg);
      oscGet.close()
    });
  });

  preferences.on('click', (key) => {
    if (key === 'applyButton') {
      console.log("lebouton apply a ete clicke")
      win.webContents.send('udpportOK', (preferences.value('network_settings.osc_receiver_port')));

      oscListening()
      oscGet.on("error", function (error) {
        msg = error.message
        console.log("An error occurred with OSC listening: ", error.message);
        win.webContents.send('udpportKO', msg)
        win.webContents.send('resolveError')
      });

      //eGet.connect()
    }
  });


  win.autoHideMenuBar = "true"
  win.menuBarVisible = "false"
  win.webContents.on('did-finish-load', () => {
    console.log("appVersion :", appVersion);
    win.webContents.send('appVersion', app.getVersion());

    win.on('close', (e) => {
      if (win) {
        e.preventDefault();
        win.webContents.send('autoSave');
      }
    });

  })
}

app.whenReady().then(createWindow)

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})
