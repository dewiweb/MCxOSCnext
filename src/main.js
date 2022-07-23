const osc = require('osc');
const eServerIP = "";
const eServerPort = "";
const lib = require('./mainFunctions');
const { EmberClient } = require('emberplus-connection');
const electron = require('electron');
const { ipcMain } = require('electron');
const nativeTheme = electron.nativeTheme;
nativeTheme.themeSource = 'dark';
const { app, BrowserWindow } = require('electron');
const mainFunctions = require('./mainFunctions');
const { dialog } = require('electron');
const fs = require('fs');
const defaultDir = app.getPath('documents') + '/MCxOSCnext';
if (!fs.existsSync(defaultDir)) {
  fs.mkdirSync(defaultDir)
}
let recOptions = {
  filters: [
    { name: 'Session file', extensions: ['session'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  title: "Save your session in a *.session file",
  defaultPath: defaultDir + '/MySession.session',
}
let openOptions = {
  filters: [
    { name: 'Session file', extensions: ['session'] },
    { name: 'All Files', extensions: ['*'] }
  ],
  properties: ['openFile', 'multiSelections'],
  title: "Choose a *.session file",
  defaultPath: defaultDir,
}

const ElectronPreferences = require('electron-preferences');
const { send } = require('process');

const appVersion = app.getVersion()



//#Time Section#//
let date_ob = new Date();
let date = lib.IntTwoChars(date_ob.getDate());
let month = lib.IntTwoChars(date_ob.getMonth() + 1);
let year = date_ob.getFullYear();
let hours = lib.IntTwoChars(date_ob.getHours());
let minutes = lib.IntTwoChars(date_ob.getMinutes());
let seconds = lib.IntTwoChars(date_ob.getSeconds());
const datePath = `autosave_${hours}-${minutes}-${seconds}_${month}-${date}-${year}`;
console.log("datePath : ", datePath)
//#End of Time Section#//

//#Options Section//
const autoSave = true
const launchLastFile = true
autoSaveFilepath = defaultDir + "/" + datePath + ".session"
console.log("autoSaveFilepath: ", autoSaveFilepath)
//#End of Options Section//






function createWindow() {

  let win = new BrowserWindow({
    width: 1366,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,

    },
    icon: `${__dirname}/assets/icons/64x64.png`
  })
  win.setMenu(null);
  win.loadFile('src/index.html')
  win.webContents.openDevTools()


  ipcMain.on('sendAutoSave', function (event, content) {
    let autoSave = (preferences.value('save_settings.autoSave'))[1]
    console.log("autoSave :", autoSave)
    if (autoSave !== undefined) {
      fs.writeFile(autoSaveFilepath, content, (err) => {
        if (err) {
          console.log('an error ocurred with file creation ' + err.message);
        }
        console.log('WE CREATED YOUR FILE SUCCESFULLY');

        //win.webContents.send('sendFilename', filename);
      });
    };
    win = null;
    if (process.platform !== 'darwin') {
      app.quit();
    }
  })


  //#Preferences Window#//
  const preferences = new ElectronPreferences({
    // Override default preference BrowserWindow values
    browserWindowOpts: {
      title: 'preferences',
      icon: `${__dirname}/assets/icons/64x64.png`
    },

    // Create an optional menu bar
    //menu: Menu.buildFromTemplate(/* ... */),

    // Provide a custom CSS file, relative to your appPath.
    css: './src/style.css',

    // Preference file path
    dataStore: defaultDir + '/config.json', // defaults to <userData>/preferences.json

    // Preference default values
    //defs : fs.readFileSync(dataStore, 'utf-8'),
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

    // Preference sections visible to the UI
    sections: [
      {
        id: 'network_settings',
        label: 'Network Settings',
        /**
         * See the list of available icons below.
         */
        icon: 'preferences',
        form: {
          groups: [
            {
              /**
               * Group heading is optional.
               */
              label: 'Ember+ Provider',
              fields: [
                {
                  label: 'Ip Address:Port ',
                  key: 'ember_provider',
                  type: 'text',
                  help: 'example: 192.168.100.36:9000'
                }
              ],
            },
            {
              /**
               * Group heading is optional.
               */
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
                  //help: 'The location where your files *.session will be stored.',
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
                  //help: 'Choose a default file launched at startup',
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
                  //defaultPath: defaultDir, 
                },
                {
                  label: '',
                  key: 'autoLoad',
                  type: 'checkbox',
                  options: [
                    { label: 'Load this file at startup', value: 'on' },
                  ],
                  //help: 'Select one or more foods that you like.',
                },
                {
                  label: '',
                  key: 'autoSave',
                  type: 'checkbox',
                  options: [
                    { label: 'Save current config before close', value: 'autoSave' },
                  ],
                  //help: 'Select one or more foods that you like.',
                }     
              ]
            }
          ]
        }
      },
      {
        id: 'others_settings',
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
    ]
  });

  // Show the preferences window on demand.
  //preferences.show();

  // Get a value from the preferences data store
  //const name = preferences.value('about.name');
  const oUDPport = preferences.value('network_settings.osc_receiver_port');
  const eServerIP = ((preferences.value('network_settings.ember_provider')).split(":"))[0];
  const eServerPort = Number(((preferences.value('network_settings.ember_provider')).split(":"))[1]);
  const oServerIP = ((preferences.value('network_settings.osc_server')).split(":"))[0];
  const oServerPort = Number(((preferences.value('network_settings.osc_server')).split(":"))[1]);

  // Save a value within the preferences data store
  //preferences.value('about.name', 'Einstein');

  // Subscribing to preference changes.
  preferences.on('save', (preferences) => {
    console.log(`Preferences were saved.`, JSON.stringify(preferences, null, 4));
  });

  // Using a button field with `channel: 'reset'`
  preferences.on('click', (key) => {
    if (key === 'resetButton') {
      resetApp();
    }
  });

  //#End of Preferences#//



  //---Menu interactions Section---//

  ipcMain.on('sendSaveAs', function (event, content) {
    //console.log(content);
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
      })
    })
  })

  ipcMain.on('sendSave', function (event, content, rSfilename) {
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
    })
  })

  ipcMain.on('openFile', (event) => {
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
        if(autoGo !== undefined){
          win.webContents.send("autoGo")
        }
      })
  })

  //---End of Menu Interactions Section---//
  /////////////////////////////////////////
  //---Network Settings Section---//
  //Initiating connection to Remote Ember+ provider
  c = new EmberClient(eServerIP, eServerPort);
  c.on('connected', (e) => {
    console.log("Ember+ Server ", eServerIP, ":", eServerPort, " connection ok");
    win.webContents.on('did-finish-load', () => {
    win.webContents.send('eServerOK', (preferences.value('network_settings.ember_provider')));
    })
  })
  c.on('disconnected', (e) => {
    console.log("Disconnected from Ember+ Server");
  })
  process.on('uncaughtException', (err) => {
    console.log(err);
    win.webContents.on('did-finish-load', () => {
    win.webContents.send('eServConnError');
    })
  });

  //Setting local OSC UDP Port
    console.log('Port de reception OSC:', oUDPport);
    oscCli = new osc.UDPPort({
      localAddress: "0.0.0.0",
      localPort: Number(oUDPport),
      metadata: true
    })
    oscCli.open()
    win.webContents.on('did-finish-load', () => {
    win.webContents.send('udpportOK', (preferences.value('network_settings.osc_receiver_port')));
    })
    
  // load auto-options on startup  
    win.webContents.on('did-finish-load', () => {
      let autoLoad = (preferences.value('save_settings.autoLoad'))[1]
      let default_file = preferences.value("save_settings.default_file")
      let autoGo = (preferences.value('other_settings.autoGo'))[0]
      if (autoLoad !== undefined){
        let content = fs.readFileSync(default_file, 'utf-8');
        let sendedContent = JSON.stringify(content);
        win.webContents.send("sendFileContent", sendedContent)
        win.webContents.send('sendFilename', default_file)
        if(autoGo !== undefined){
          win.webContents.send("autoGo")
        }
      };
    })

//Ember+ initial connection
  async function main() {

    //await c.connect()

    const err = await c.connect()
    if (err) { // err = true when the first connection attempt fails (depending on timeout)
      console.log('Initial connection unsuccessful', err);
      return
    }
    console.log("ember+ connection ok");
    root = await (await c.getDirectory(c.tree)).response
    let inputsUserLabels = [];
    let auxesUserLabels = [];
    let mastersUserLabels = [];
    let sumsUserLabels = [];
    let gpcsUserLabels = [];

    for (i = 0x01; i < 0x0C1; i++) {
      try {
        let req = await c.getElementByPath("_2._1._" + i.toString(16))
        inputsUserLabels.push(req.contents.description)
      } catch (e) {
        // exit the loop
        break;
      }
    };
    //console.log('inputsUserLabels: ', inputsUserLabels)
    win.webContents.send('inputsUserLabels', inputsUserLabels);

    for (i = 0x01; i < 0x0C1; i++) {
      try {
        let req = await c.getElementByPath("_2._5._" + i.toString(16))
        auxesUserLabels.push(req.contents.description)
      } catch (e) {
        // exit the loop
        break;
      }
    };
    //console.log('auxesUserLabels: ', auxesUserLabels)
    win.webContents.send('auxesUserLabels', auxesUserLabels);

    for (i = 0x01; i < 0x0C1; i++) {
      try {
        let req = await c.getElementByPath("_2._4._" + i.toString(16))
        sumsUserLabels.push(req.contents.description)
      } catch (e) {
        // exit the loop
        break;
      }
    };
    //console.log('sumsUserLabels: ', sumsUserLabels)
    win.webContents.send('sumsUserLabels', sumsUserLabels);

    for (i = 0x01; i < 0x0C1; i++) {
      try {
        let req = await c.getElementByPath("_2._6._" + i.toString(16))
        mastersUserLabels.push(req.contents.description)
      } catch (e) {
        // exit the loop
        break;
      }
    };
    //console.log('mastersUserLabels: ', mastersUserLabels)
    win.webContents.send('mastersUserLabels', mastersUserLabels);

    for (i = 0x01; i < 0x0C1; i++) {
      try {
        let req = await c.getElementByPath("_2._7._" + i.toString(16))
        gpcsUserLabels.push(req.contents.description)
      } catch (e) {
        // exit the loop
        break;
      }
    };
    //console.log('gpcsUserLabels: ', gpcsUserLabels)
    win.webContents.send('gpcsUserLabels', gpcsUserLabels);

    //Setting Remote OSC Server IP and Porto

    //      ipcMain.on('sendOSCserverIP', (event, oServerIP) => {
    console.log('IP du server OSC distant:', oServerIP);

    //        ipcMain.on('sendOSCserverPort', (event, oServerPort) => {
    console.log('Port du server OSC distant:', oServerPort);
    win.webContents.on('did-finish-load', () => {
    win.webContents.send('oServerOK', (preferences.value('network_settings.osc_server')));
    })

    //---End of Network Settings Section---//
    ////////////////////////////////////////
    //---Table Connections Interaction Section---//

    //Creating Ember+ subscription when connection "Go!" sends from Front-End
    ipcMain.on('newConnection', async function (event, ePath, oAddr, myRow, eVarType, sFactor, eMin, eMax, oMin, oMax, eVarCurve) {
      //console.log("sFactor", sFactor);
      sFactor = Number(sFactor);
      let req = await c.getElementByPath(ePath)
      c.subscribe(req, () => {
        let emberValue = req.contents.value;
        //console.log("emberValue", emberValue);

        event.sender.send('sendEmberValue', emberValue, myRow, 1);
        let stringEpath = JSON.stringify(ePath);
        //console.log("ePath", ePath);

        console.log("suscribe to ", ePath);

        //Sending received values from Ember+ to OSC
        if (eVarType == "Integer" && eVarCurve == "lin") {
          let value = mainFunctions.mapToScale(Number(emberValue), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2)
          oscCli.send({
            address: oAddr,
            args: [
              {
                type: "f",
                value: Number(value),
              }
            ]
          }, oServerIP, oServerPort);
          console.log('EMBER+ -lin-> OSC : ', value)
        } else if (eVarType == "Integer" && eVarCurve == "log") {
          let value = mainFunctions.mapToScale(Number(emberValue), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2, true)
          oscCli.send({
            address: oAddr,
            args: [
              {
                type: "f",
                value: Number(value),
              }
            ]
          }, oServerIP, oServerPort);
          console.log('EMBER+ -log-> OSC : ', value)
        }
        else if (eVarType == "String") {

          oscCli.send({
            address: oAddr,
            args: [
              {
                type: "s",
                value: emberValue.toString(),
              }
            ]
          }, oServerIP, oServerPort);
          console.log('EMBER+ -string-> OSC : ', emberValue)
        }
        else if (eVarType == "Boolean" && emberValue == true) {

          oscCli.send({
            address: oAddr,
            args: [
              {
                type: "f",
                value: 1,
              }
            ]
          }, oServerIP, oServerPort);
          console.log('EMBER+ -bool-> OSC : ', emberValue)
        }
        else if (eVarType == "Boolean" && emberValue == false) {

          oscCli.send({
            address: oAddr,
            args: [
              {
                type: "f",
                value: 0,
              }
            ]
          }, oServerIP, oServerPort);
          console.log('EMBER+ -bool-> OSC : ', emberValue)
        }
      })

      //Sending received values from OSC to Ember+
      oscCli.on("message", (oscBundle) => {
        console.log('oscBundle : ', oscBundle);
        let oRaddr = JSON.stringify(oscBundle.address);
        console.log("Adresse osc received", oRaddr);
        let oRargs = mainFunctions.oscToEmber(oscBundle);
        console.log("oRargs", oRargs);
        win.webContents.send('oReceivedAddr', oRaddr, oRargs);
      })
    })
    ipcMain.on('reSendOrArgs', async function (event, rOrArgs, rEaddr, sFactor, eVarType, oMin, oMax, eMin, eMax, eVarCurve) {
      let rereq = await c.getElementByPath(rEaddr);
      if (eVarType == "Integer" && eVarCurve == "lin") {
        let value = mainFunctions.mapToScale(Number(rOrArgs), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2)
        c.setValue((rereq), value.toFixed(0));
        console.log('OSC -lin-> EMBER+ : ', value.toFixed(0));
      } else if (eVarType == "Integer" && eVarCurve == "log") {
        let value = mainFunctions.mapToScale(Number(rOrArgs), [Number(eMin), Number(eMax)], [Number(oMin), Number(oMax)], 2, true, -1)
        c.setValue((rereq), value.toFixed(0));
        console.log('OSC -log-> EMBER+ : ', value.toFixed(0));
      } else if (eVarType == "Boolean" && rOrArgs == "1") {
        c.setValue((rereq), true);
        console.log(("OSC -bool-> EMBER+", rOrArgs));
      } else if (eVarType == "Boolean" && rOrArgs == "0") {
        c.setValue((rereq), false);
        console.log(("OSC -bool-> EMBER+", rOrArgs));
      } else {
        c.setValue((rereq), rOrArgs);
        console.log(("OSC -string-> EMBER+", rOrArgs));
      }
    })
    ipcMain.on("deleteConnection", async function (event, ePath, oAddr, myRow, eVarType, sFactor) {
      let req = await c.getElementByPath(ePath)
      c.unsubscribe(req)
      console.log('unsuscribe to ', ePath);
    })
  }
  main()


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
