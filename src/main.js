const osc = require('osc');
const net = require('net')
const lib = require('./mainFunctions');
const { EmberClient } = require('emberplus-connection');
const ElectronPreferences = require('electron-preferences');
const contextMenu = require('electron-context-menu');
const electron = require('electron');
const { ipcMain } = require('electron');
const nativeTheme = electron.nativeTheme;
const { app, BrowserWindow } = require('electron');
const mainFunctions = require('./mainFunctions');
const { dialog } = require('electron');
const { send } = require('process');
const appVersion = app.getVersion();
const fs = require('fs');
const defaultDir = app.getPath('documents') + '/MCxOSCnext';
if (!fs.existsSync(defaultDir)) {
  fs.mkdirSync(defaultDir)
};
const log = require('electron-log');
const { fail } = require('assert');



const stream = []
let directions = [];
let oUDPport;
let gateDelayIN = [];
let gateDelayOUT = [];



let timestamp = [];
let OSCin = [];
let OSCout = [];
let OSCrate = 25;

let EmberIn = [];
let EmberOut = [];
let EmberRate = 8;

let ro = [];





//#Time Section#//
let date_ob = new Date();
let date = lib.IntTwoChars(date_ob.getDate());
let month = lib.IntTwoChars(date_ob.getMonth() + 1);
let year = date_ob.getFullYear();
let hours = lib.IntTwoChars(date_ob.getHours());
let minutes = lib.IntTwoChars(date_ob.getMinutes());
let seconds = lib.IntTwoChars(date_ob.getSeconds());
const datePath = `autosave_${hours}-${minutes}-${seconds}_${date}-${month}-${year}`;
log.info("datePath : ", datePath)
//#End of Time Section#//

//#Options Section//
let recOptions;
let openOptions;


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
    win.on("ready-to-show", () => {
      win.webContents.openDevTools({ mode: 'detach' });
//    });

//  win.webContents.on('did-finish-load', () => {
    win.webContents.send('ready')
  })

  ipcMain.on('sendAutoSave', function (event, content) {
    let autoSave = (preferences.value('save_settings.autoSave'))[0]
//    win.webContents.on('did-finish-load', () => {
      win.webContents.send('loginfo', "autoSave :" + autoSave)
//    })
    if (autoSave !== undefined) {
      fs.writeFile(autoSaveFilepath, content, (err) => {
        if (err) {
//          win.webContents.on('did-finish-load', () => {
            win.webContents.send('loginfo', 'an error occurred with file creation ' + err.message);
//          })
        }
//        win.webContents.on('did-finish-load', () => {
          win.webContents.send('loginfo', 'WE CREATED YOUR FILE SUCCESFULLY');
//        })
      });
    };
    win = null;
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })

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
  //  win.webContents.on('did-finish-load', () => {
      win.webContents.send('loginfo', "autoSaveFilepath: " + autoSaveFilepath)
  //  })
  }
  optionsDef()

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
                },
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
                {
                  label: '',
                  key: 'OID_to_OSC',
                  type: 'checkbox',
                  options: [
                    { label: 'Send Lawo Access Channel OID Description Field', value: 'on' },
                  ],
                },
                {
                  label: 'destination:',
                  key: 'oid2osc',
                  type: 'text',
                },
                {
                  label: '',
                  key: 'change_oid_dest',
                  type: 'button',
                  buttonLabel: 'Apply',
                  help: 'example: 127.0.0.1:12001/_9/AccessChannelOID',
                  hideLabel: true,
                },
              ],
            },
          ],
        },
      },
    ],
    //debug:true
  });

  const oServerIP = ((preferences.value('network_settings.osc_server')).split(":"))[0];
  const oServerPort = Number(((preferences.value('network_settings.osc_server')).split(":"))[1]);

  preferences.on('save', (preferences) => {
  //  win.webContents.on('did-finish-load', () => {
      win.webContents.send('loginfo', "preferences:" + preferences);
//      console.log(`Preferences were saved.`, JSON.stringify(preferences, null, 4));
      win.webContents.send('loginfo', `Preferences were saved.` + JSON.stringify(preferences, null, 4));
  //  })
  });

  // load auto-options on startup  
  function loadPrefs() {
    let autoLoad = (preferences.value('save_settings.autoLoad'))[0]
  //  win.webContents.on('did-finish-load', () => {
      //      win.webContents.send('loginfo', "valeur autoload lue: " + autoLoad)
  //  })
    let default_file = preferences.value("save_settings.default_file")
    let autoGo = (preferences.value('other_settings.autoGo'))[0]
//    win.webContents.on('did-finish-load', () => {
      //      win.webContents.send('loginfo', "valeur autoGo lue: " + autoGo)
//    })
    if (autoLoad !== undefined) {
//      win.webContents.on('did-finish-load', () => {
        console.log("la fenetre est prete et peut recevoir les options")
        //        win.webContents.send('loginfo', "la fenetre est prete et peut recevoir les options")
        let content = fs.readFileSync(default_file, 'utf-8');
        let sendedContent = JSON.stringify(content);
        win.webContents.send("sendFileContent", sendedContent)
        win.webContents.send('sendFilename', default_file)
        if (autoGo !== undefined) {
          win.webContents.send("autoGo")
        }
//      });
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
        msg = error.message;
  //      win.webContents.on('did-finish-load', () => {
          win.webContents.send('resolveError', msg)
  //      })
        //      electron.dialog.showMessageBox({
        //        title: 'An error occurred',
        //        message: error.message,
        //        detail: error.stack,
        //        type: 'error',
        //        buttons: ['Ignore', 'Preferences', 'Exit'],
        //      })
        //        .then((result) => {
        //          if (result.response === 1) {
        //            win.webContents.send('resolveError')
        //          }
        //
        //          if (result.response === 2) {
        //            electron.app.quit();
        //          }
        //        });
      }
    })
  }
  logDefinition();

  contextMenu({
    window: win,
    labels: {
      copy: "📄 | Copy",
      paste: "📋 | Paste",
      cut: "✂ | Cut"
    },
    /* Context Menu Items */
    menu: (actions, params, win, dicSuggestion) => [
      /* System Buttons */
      actions.copy(),
      actions.cut(),
      actions.paste(),
    ]
  })


  ipcMain.on('sendSaveAs', (event, content) => {

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

  ipcMain.on('sendSave', (event, content, rSfilename) => {
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
    let status = net.createConnection(eServerPort, eServerIP)
    status.on("error", (e) => {
      win.webContents.send('eServConnError', "Ember+ server " + eAddress + " is unreachable, please verify preferences!");
    })
    eGet.on('connected', () => {
      console.log("emberGet ", eServerIP, ":", eServerPort, " connection ok");
//      win.webContents.on('did-finish-load', () => {
      win.webContents.send('eServerOK', eAddress);
      win.webContents.send('loginfo', "Connection to Ember+ Server  " + eServerIP + ":" + eServerPort + " OK");
//      })
    })
    eGet.on('disconnected', () => {
      win.webContents.send('eServDisconnected', eAddress);
      win.webContents.send('loginfo', "Disconnected from emberGet");
    })
  //  eGet.on('error', (e, err) => {
  //    console.log("478",e.message)
  //    win.webContents.send('eServConnError', "le serveur " + eAddress + " ne répond pas : " + err);
  //    //       win.webContents.send('loginfo', msg)
  //  });
  }
  emberGet();


  //  function emberInputListener(node, value, row) {
  //    direction = "ET";
  //    console.log("Value", value, "received from ember+ for row", row)
  //  }


  function oscListening() {
    oUDPport = preferences.value('network_settings.osc_receiver_port');
    console.log('Port de reception OSC:', oUDPport);
  //  win.webContents.on('did-finish-load', () => {
      win.webContents.send('loginfo', 'Port de reception OSC:' + oUDPport);
  //  })
    oscGet = new osc.UDPPort({
      localAddress: "127.0.0.1",
      localPort: Number(oUDPport),
      metadata: true
    })
    oscGet.open();
    oscGet.on('ready', function () {
//      win.webContents.on('did-finish-load', () => {
        win.webContents.send('udpportOK', (preferences.value('network_settings.osc_receiver_port')));
        win.webContents.send('oServerOK', (preferences.value('network_settings.osc_server')));
//      })
    })
  }
  oscListening();

  function oscToTable() {
    oscGet.on("message", (oscBundle) => {
      let oRaddr = JSON.stringify(oscBundle.address);
      let oRargs = mainFunctions.oscToEmber(oscBundle);

      win.webContents.send('oReceivedAddr', oRaddr, oRargs);
      //      win.webContents.send('loginfo', 'oscBundle : ' + oscBundle);
      //      win.webContents.send('loginfo', "OSC Address received" + oRaddr);
      //      win.webContents.send('loginfo', "oRargs: " + oRargs);
    })
  }
  oscToTable();

  async function main() {
    try {

      const eAddress = preferences.value('network_settings.ember_provider');
      const err = await eGet.connect()
      if (err) { // err = true when the first connection attempt fails (depending on timeout)
        win.webContents.send('loginfo', ' connection to emberGet unsuccessful->' + err);
        win.webContents.send('eServConnError', eAddress);
        win.webContents.send('resolveError', err);
        return
      }
      win.webContents.on('did-finish-load', () => {
      win.webContents.send('eServerOK', eAddress);
      })

      async function getUserLabels() {

        root = await (await eGet.getDirectory(eGet.tree)).response
        win.webContents.send('loginfo', "ROOT:" + root)

        let inputsUserLabels = [];
        let auxesUserLabels = [];
        let mastersUserLabels = [];
        let sumsUserLabels = [];
        let gpcsUserLabels = [];
        await mainFunctions.sleep(2000);
        for (i = 0x01; i < 0x0C1; i++) {
          try {
            //          await mainFunctions.sleep(2000);
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


      let OID_to_OSC = preferences.value('other_settings.OID_to_OSC');

      async function channelAccess(OID_to_OSC) {
      //  root = await (await eGet.getDirectory(eGet.tree)).response;
        

        if (OID_to_OSC[0] !== []) {
          let oid2osc = preferences.value('other_settings.oid2osc');
          let o2o_address = (oid2osc.toString()).split(':')[0];
          let o2o_port = (oid2osc.split(':')[1]).split('/')[0];
          let o2o_path = '/' + oid2osc.slice(oid2osc.indexOf('/') + 1);
          let init_oid2osc = ''
          try {
            await mainFunctions.sleep(2000);
            init_oid2osc = await eGet.getElementByPath('Console.AccessChannelOID');
            let init_emberValue = init_oid2osc.contents.value;
            let init_CA_OID = await eGet.getElementByPath(init_emberValue);
//            win.webContents.on('did-finish-load', () => {
            win.webContents.send('loginfo', "initial ChannelAccess name is: " + init_CA_OID.contents.description)
//            })
            oscGet.send({
              address: o2o_path,
              args: [
                {
                  type: "s",
                  value: init_CA_OID.contents.description,
                }
              ]
            }, o2o_address, Number(o2o_port));

            eGet.subscribe(init_oid2osc, () => {

              async function bip() {
                let emberValue = init_oid2osc.contents.value;
                let CA_OID = await eGet.getElementByPath(emberValue);
                win.webContents.send('loginfo', 'CA_OID changed: ' + CA_OID.contents.description);
                oscGet.send({
                  address: o2o_path,
                  args: [
                    {
                      type: "s",
                      value: CA_OID.contents.description,
                    }
                  ]
                }, o2o_address, Number(o2o_port));
              } bip()
            })
          }
          catch (e) {
            const message = await e.message
  //          win.webContents.on('did-finish-load', () => {
              win.webContents.send('loginfo', "oid2osc failed due to: " + message)
  //          })
          }
        }
      } channelAccess(OID_to_OSC);

      preferences.on('click', (key) => {
        if (key === 'change_oid_dest') {
          channelAccess(OID_to_OSC)
        }
      })
      //      async function expandtree() {
      //        let root = await (await eGet.getDirectory(eGet.tree)).response;
      //        try{
      //        //let first = await eGet.getElementByPath("_2._7._1._400016c0._400016c1")
      //        let second = await (await eGet.expand(root)).response;
      //        console.log("ENot:", second)
      //        }catch(e){
      //          throw Error(e)
      //        }
      //        //await (await this.getDirectory(node)).response;
      //        //let root = Object.values(eGet.tree);
      //        //let expanded_json = await(await eGet.expand(root)).response;
      //        //console.log("EXPANDED:",JSON.stringify(first))
      //      }
      //      expandtree()



      ipcMain.on('newConnection', async (event, ePath, oAddr, myRow, eVarType, sFactor, eMin, eMax, oMin, oMax, eVarCurve, direction, tableLength) => {
        console.log('loginfo', "epath in newconnectionM " + ePath);
        console.log("direction1", myRow, directions[myRow])
        console.log("oAddr received", oAddr)
        directions[myRow] = direction

        sFactor = Number(sFactor);
        
        let initialReq = await eGet.getElementByPath(ePath);
        let emberValue = initialReq.contents.value;
        console.log('689 initial value : ',initialReq.contents.value)
        event.sender.send('sendEmberValue', emberValue, myRow, 1, directions[myRow]);
        //        win.webContents.send('loginfo', "initialReq: " + initialReq);
        let state = ['first', myRow];
        console.log("state: ", JSON.stringify(state))
        console.log("epath",ePath)
        //try{
        eGet.subscribe(initialReq, () => {

          if (JSON.stringify(state) === JSON.stringify(['first', myRow])) {
            //            direction = "ET";
            console.log("direction2", myRow, directions[myRow])
            win.webContents.send('loginfo', "subscribed to " + ePath);
            emberValue = initialReq.contents.value;
            console.log('702 emberValue : ',emberValue)
            directions[myRow] = "-"
            event.sender.send('sendEmberValue', emberValue, myRow, 1, directions[myRow]);
            state = ["nonFirst", myRow];
            //            direction = ""
            ;
          } else {
            EmberIn[myRow] = Date.now();
            if (EmberOut[myRow]) {
              console.log("Ember in/out:", myRow, EmberIn[myRow] - EmberOut[myRow])
              console.log("directionsss", myRow, directions[myRow])
              if (EmberIn[myRow] - EmberOut[myRow] > EmberRate) {

                if (directions[myRow] !== "◄") {

                  //---Sending received values from Ember+ to OSC
                  directions[myRow] = "►"
                  //           console.log("direction set to E->O")

                  emberValue = initialReq.contents.value;
                  console.log('722 emberValue : ',emberValue)
                  event.sender.send('sendEmberValue', emberValue, myRow, 1, directions[myRow]);
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
                    win.webContents.send('loginfo', 'EMBER+ -lin-> OSC : ' + value);
                  }
                  else if (eVarType == "Integer" && eVarCurve == "log") {
                    //              console.log("values sended to maptoscale: ", Number(emberValue), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)])
                    let value = mainFunctions.mapToScale(Number(emberValue), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2, true);
                    //              console.log("value mapped:", value)
                    oscGet.send({
                      address: oAddr,
                      args: [
                        {
                          type: "f",
                          value: Number(value),
                        }
                      ]
                    }, oServerIP, oServerPort);
                    win.webContents.send('loginfo', 'EMBER+ -log-> OSC : ' + value);
                  }
                  else if (eVarType == "String") {
                    win.webContents.send('loginfo', "string reçu:" + emberValue)
                    oscGet.send({
                      address: oAddr,
                      args: [
                        {
                          type: "s",
                          value: emberValue.toString(),
                        }
                      ]
                    }, oServerIP, oServerPort);
                    win.webContents.send('loginfo', 'EMBER+ -string-> OSC : ' + emberValue);
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
                    win.webContents.send('loginfo', 'EMBER+ -bool-> OSC : ' + emberValue);
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
                    win.webContents.send('loginfo', 'EMBER+ -bool-> OSC : ' + emberValue);
                  }

                  //            direction = "ET";
                  if (gateDelayIN[myRow]) {
                    if (Object.values(gateDelayIN[myRow])[5][0] == myRow) {
                      //console.log(Object.values(gateDelayIN)[5][0])
                      console.log("gateDelayIn aborted")
                      clearTimeout(gateDelayIN[myRow])
                    }
                  };

                  gateDelayIN[myRow] =
                    (setTimeout(() => {
                      console.log("gateDelayIn launched")
                      directions[myRow] = "-";
                      event.sender.send('sendEmberValue', emberValue, myRow, 1, directions[myRow]);
                      win.webContents.send('loginfo', "waiting")
                    }, 500, myRow));
                  EmberOut[myRow] = Date.now()
                  console.log("default case0", myRow)
                }
                //else {
                //  // let emberValue = initialReq.contents.value;
                //  if (gateDelayIN) {
                //    if (Object.values(gateDelayIN)[5][0] == myRow) {
                //      //console.log(Object.values(gateDelayIN)[5][0])
                //      console.log("gateDelayIn aborted")
                //      clearTimeout(gateDelayIN)
                //    }
                //  };
                //
                //  gateDelayIN =
                //    (setTimeout(() => {
                //      console.log("gateDelayIn launched")
                //      directions[myRow] = "-";
                //      //   event.sender.send('sendEmberValue', emberValue, myRow, 1, directions[myRow]);
                //      win.webContents.send('loginfo', "waiting")
                //    }, 100, myRow));
                //  EmberOut[myRow] = Date.now()
                //  console.log("default case1", myRow)
                //}

              } else {
                console.log("else1", myRow)
                EmberOut[myRow] = Date.now();
                //  directions[myRow] = "-";
                console.log("Ember dropped")
              }
            } else {
              console.log("else2", myRow)
              EmberOut[myRow] = Date.now()
              //  directions[myRow] = "-";
            }
          } //let stringEpath = JSON.stringify(ePath);
        });
        win.webContents.send('noError',myRow)
    //  } catch (error) {
    //    msg = error.message;
    //    console.log('error msg',msg)
    //  win.webContents.send('loginfo', msg)
    //  win.webContents.send('errorOnEditedPath', myRow)
    //  //  throw Error(error);
    //    
    //  }
      
      });

      ipcMain.on("deleteConnection", async (event, ePath, oAddr, myRow, eVarType, sFactor) => {

        let req = await eGet.getElementByPath(ePath);
        eGet.unsubscribe(req);
        win.webContents.send('loginfo', 'unsuscribe to ' + ePath);
      })



      ipcMain.on('reSendOrArgs', async (event, rOrArgs, rEaddr, sFactor, eVarType, eMin, eMax, oMin, oMax, eVarCurve, myRow, direction, tableLength) => {
        if (!ro[myRow]) {
          ro[myRow] = 1;
        }
        console.log("ro[myRow]", ro)
        OSCin[myRow] = Date.now()
        directions[myRow] = direction
        if (OSCout[myRow]) {
          console.log("OSC in/out:", myRow, OSCin[myRow] - OSCout[myRow])
          if (OSCin[myRow] - OSCout[myRow] > OSCrate) {

            //        console.log("ro = ", ro)
            if (directions[myRow] !== "►") {
              directions[myRow] = "◄";
              win.webContents.send("updateDirection", myRow, directions[myRow])
              //          console.log("direction set to O->E")
              if (gateDelayOUT[myRow]) {
                if (Object.values(gateDelayOUT[myRow])[5][0] == myRow) {
                  //  console.log("gateDelayOUT: " , Object.values(gateDelayOUT))
                  clearTimeout(gateDelayOUT[myRow])
                }
              };
              let rereq = await eGet.getElementByPath(rEaddr);
              if (ro[myRow] == 1) {
                eGet.unsubscribe(rereq);
                state = ["first", myRow];
                win.webContents.send('loginfo', "eGet unsuscribe to " + rereq)
              }
              if (eVarType == "Integer" && eVarCurve == "lin") {
                let value = mainFunctions.mapToScale(Number(rOrArgs), [Number(oMin), Number(oMax)], [Number(eMin), Number(eMax)], 2);
                eGet.setValue((rereq), value.toFixed(0));
                win.webContents.send('loginfo', 'OSC -lin-> EMBER+ : ' + value.toFixed(0));
              } else if (eVarType == "Integer" && eVarCurve == "log") {
                let value = mainFunctions.mapToScale(Number(rOrArgs), [Number(oMin), Number(oMax)], [Number(eMin), Number(eMax)], 2, true, -1);
                //            console.log("values submitted to maptoscale: ", Number(rOrArgs), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)])
                //            console.log("remapped value: ", value)
                eGet.setValue((rereq), value.toFixed(0));
                win.webContents.send('loginfo', 'OSC -log-> EMBER+ : ' + value.toFixed(0));
              } else if (eVarType == "Boolean" && rOrArgs == "1") {
                eGet.setValue((rereq), true);
                win.webContents.send('loginfo', ("OSC -bool-> EMBER+", rOrArgs));
              } else if (eVarType == "Boolean" && rOrArgs == "0") {
                eGet.setValue((rereq), false);
                win.webContents.send('loginfo', ("OSC -bool-> EMBER+", rOrArgs));
              } else if (eVarType == "String"){
                eGet.setValue((rereq), rOrArgs.toString());
                win.webContents.send('loginfo', ("OSC -string-> EMBER+", rOrArgs));
              } else{
                eGet.setValue((rereq), rOrArgs);
                win.webContents.send('loginfo', ("OSC -string-> EMBER+", rOrArgs));

              }


              //win.webContents.send('loginfo',"eGet resubscribe to"+ rereq)
              gateDelayOUT[myRow] =
                (setTimeout(() => {
                  win.webContents.send('loginfo', "waiting")
                  win.webContents.send("resubscribe", myRow)
                  //              win.webContents.send('loginfo', "eGet resubscribe to" + rereq)
                  directions[myRow] = "-";
                  win.webContents.send("updateDirection", myRow, directions[myRow])
                  //              console.log("direction set to none")
                  ro[myRow] = null;
                  console.log("ro[myRow]", ro)
                }, 500, myRow));
              console.log("directionzzzz", myRow, directions[myRow])
            }
            //  else {
            //    gateDelayOUT =
            //      (setTimeout(() => {
            //        win.webContents.send('loginfo', "waiting")
            //        //  win.webContents.send("resubscribe", myRow)
            //        //              win.webContents.send('loginfo', "eGet resubscribe to" + rereq)
            //        directions[myRow] = "-";
            //        win.webContents.send("updateDirection", myRow, directions[myRow])
            //        //              console.log("direction set to none")
            //        ro[myRow] = null
            //        console.log("ro[myRow]", ro)
            //      }, 200, myRow));
            //    console.log("directionzzzz2", myRow, directions[myRow])
            //    win.webContents.send('loginfo', "can't use O->E actual direction is set to E->O")
            //  }
            //  console.log("direction3", myRow, directions[myRow])
            OSCout[myRow] = Date.now()
          } else {
            console.log("direction4", myRow, directions[myRow])
            OSCout[myRow] = Date.now();
            //    directions[myRow] = "-";
            console.log("OSC dropped")
          }
        } else {
          OSCout[myRow] = Date.now();
          console.log("direction5", myRow, directions[myRow])
        }
        console.log("ro[myRow]", ro)
      })

    } catch (error) {
      throw Error("965",error);
    }
  }
  main().catch(err => {
    msg = err.message;
  //  win.webContents.on('did-finish-load', () => {
      win.webContents.send('resolveError', msg)
  //  })
    console.error("973",msg)
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
      win.webContents.send('loginfo', "ember+ provider settings changed!")

      emberGet();
      main().catch(err => {
        msg = err.message;
  //      win.webContents.on('did-finish-load', () => {
          win.webContents.send('resolveError', err)
  //      })
        console.error(err)
      });
      //emberPost();

      //eGet.connect()
    }
    else if (key === 'applyButton') {
      win.webContents.send('loginfo', "listening port changed!")
      win.webContents.send('udpportOK', (preferences.value('network_settings.osc_receiver_port')));
      oscGet.close();
      oscListening();
      oscGet.on("error", function (error) {
        msg = error.message
        console.log("1033 An error occurred with OSC listening: ", error.message);
        win.webContents.send('udpportKO', msg)

        win.webContents.send('resolveError', msg)

      });

      //eGet.connect()
    }
  });

  oscGet.on("error", (error) => {

    msg = error.message;
//    win.webContents.on('did-finish-load', () => {
      console.log("1015 An error occurred with OSC listening: ", error.message);

      win.webContents.send('udpportKO', msg);
//      win.webContents.on('did-finish-load', () => {
        win.webContents.send('resolveError', msg);
//      })
      oscGet.close()
//    });
  });



  win.autoHideMenuBar = "true"
  win.menuBarVisible = "false"
//  win.webContents.on('did-finish-load', () => {
    console.log("appVersion :", appVersion);
    win.webContents.send('appVersion', app.getVersion());

    win.on('close', (e) => {
      if (win) {
        e.preventDefault();
        win.webContents.send('autoSave');
      }
    });

//  })
}

app.whenReady().then(createWindow)

app.on('activate', () => {
  if (win === null) {
    createWindow()
  }
})
