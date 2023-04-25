const osc = require("osc");
const net = require("net");
const lib = require("./mainFunctions");
const { EmberClient } = require("emberplus-connection");
const ElectronPreferences = require("electron-preferences");
const contextMenu = require("electron-context-menu");
const electron = require("electron");
const { ipcMain } = require("electron");
const nativeTheme = electron.nativeTheme;
const { app, BrowserWindow } = require("electron");
const mainFunctions = require("./mainFunctions");
const { dialog } = require("electron");
const { send } = require("process");
const appVersion = app.getVersion();
const fs = require("fs");
const defaultDir = app.getPath("documents") + "/MCxOSCnext";
if (!fs.existsSync(defaultDir)) {
  fs.mkdirSync(defaultDir);
}
const log = require("electron-log");
const { fail } = require("assert");

const stream = [];
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
let root;

//---Time Section---//
let date_ob = new Date();
let date = lib.IntTwoChars(date_ob.getDate());
let month = lib.IntTwoChars(date_ob.getMonth() + 1);
let year = date_ob.getFullYear();
let hours = lib.IntTwoChars(date_ob.getHours());
let minutes = lib.IntTwoChars(date_ob.getMinutes());
let seconds = lib.IntTwoChars(date_ob.getSeconds());
const datePath = `autosave_${hours}-${minutes}-${seconds}_${date}-${month}-${year}`;
log.info("datePath : ", datePath);
//---Options Section---//
let recOptions;
let openOptions;
//---------------------//
function createWindow() {
  let win = new BrowserWindow({
    width: 1200,
    height: 630,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: `${__dirname}/assets/icons/64x64.png`,
  });
  nativeTheme.themeSource = "dark";
  win.setMenu(null);
  win.loadFile("src/index.html");
  win.on("ready-to-show", () => {
    win.webContents.openDevTools({ mode: "detach" });
    win.webContents.send("ready");
  });
  ipcMain.on("sendAutoSave", function (event, content) {
    let autoSave = preferences.value("save_settings.autoSave")[0];
    win.webContents.send("loginfo", "autoSave :" + autoSave);
    if (autoSave !== undefined) {
      fs.writeFile(autoSaveFilepath, content, (err) => {
        if (err) {
          win.webContents.send(
            "loginfo",
            "an error occurred with file creation " + err.message
          );
          win.webContents.send("loginfo", "YOUR FILE WAS CREATED SUCCESFULLY");
        }
      });
    }
    win = null;
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
  function optionsDef() {
    recOptions = {
      filters: [
        { name: "Session file", extensions: ["session"] },
        { name: "All Files", extensions: ["*"] },
      ],
      title: "Save your session in a *.session file",
      defaultPath: defaultDir + "/MySession.session",
    };
    openOptions = {
      filters: [
        { name: "Session file", extensions: ["session"] },
        { name: "All Files", extensions: ["*"] },
      ],
      properties: ["openFile", "multiSelections"],
      title: "Choose a *.session file",
      defaultPath: defaultDir,
    };
    autoSaveFilepath = defaultDir + "/" + datePath + ".session";
    win.webContents.send("loginfo", "autoSaveFilepath: " + autoSaveFilepath);
  }
  optionsDef();

  //---Preferences Window#//
  const preferences = new ElectronPreferences({
    browserWindowOpts: {
      title: "preferences",
      icon: `${__dirname}/assets/icons/64x64.png`,
    },
    css: "./src/style.css",
    dataStore: defaultDir + "/config.json",
    defaults: {
      network_settings: {
        ember_provider: "192.168.100.36:9000",
        osc_server: "127.0.0.1:12000",
        osc_receiver_port: "9000",
        autoConnect: [""],
      },
      save_settings: {
        rec_dir: defaultDir,
        default_file: defaultDir + "/MySession.session",
        autoLoad: [],
        autoSave: [],
      },
      other_settings: {
        autoGo: [],
        //  emberpath_format: ['numbers']
      },
    },
    sections: [
      {
        id: "network_settings",
        label: "Network Settings",
        icon: "preferences",
        form: {
          groups: [
            {
              label: "Ember+ Provider",
              fields: [
                {
                  label: "Ip Address:Port ",
                  key: "ember_provider",
                  type: "text",
                },
                {
                  label: "",
                  key: "resetButton",
                  type: "button",
                  buttonLabel: "Apply",
                  help: "example: 192.168.100.36:9000",
                  hideLabel: true,
                },
              ],
            },
            {
              label: "OSC settings",
              fields: [
                {
                  label: "Send to Ip Address:Port ",
                  key: "osc_server",
                  type: "text",
                  help: "example: 127.0.0.1:12000",
                },
                {
                  label: "Receive on Port ",
                  key: "osc_receiver_port",
                  type: "number",
                },
                {
                  label: "",
                  key: "applyButton",
                  type: "button",
                  buttonLabel: "Apply",
                  hideLabel: true,
                },
              ],
            },
          ],
        },
      },
      {
        id: "save_settings",
        label: "Save settings",
        icon: "single-folded-content",
        form: {
          groups: [
            {
              label: "Save folder",
              fields: [
                {
                  label: "Select your preferred Save folder",
                  key: "rec_dir",
                  type: "directory",
                  multiSelections: false,
                  noResolveAliases: false,
                  treatPackageAsDirectory: false,
                  dontAddToRecent: true,
                },
                {
                  label: "Select a default file launched at startup",
                  buttonLabel: "Open",
                  key: "default_file",
                  type: "file",
                  filters: [
                    {
                      name: "session file",
                      extensions: ["session"],
                    },
                  ],
                  multiSelections: false, //Allow multiple paths to be selected
                  showHiddenFiles: false, //Show hidden files in dialog
                  noResolveAliases: false, //(macos) Disable the automatic alias (symlink) path resolution. Selected aliases will now return the alias path instead of their target path.
                  treatPackageAsDirectory: false, //(macos) Treat packages, such as .app folders, as a directory instead of a file.
                  dontAddToRecent: false, //(windows) Do not add the item being opened to the recent documents list.
                },
                {
                  label: "",
                  key: "autoLoad",
                  type: "checkbox",
                  options: [
                    { label: "Load this file at startup", value: "on" },
                  ],
                },
                {
                  label: "",
                  key: "autoSave",
                  type: "checkbox",
                  options: [
                    {
                      label: "Save current config before close",
                      value: "autoSave",
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      {
        id: "other_settings",
        label: "Other Settings",
        icon: "settings-gear-63",
        form: {
          groups: [
            {
              label: "Other Settings",
              fields: [
                {
                  label: "",
                  key: "autoGo",
                  type: "checkbox",
                  options: [
                    { label: "load table content on startup", value: "on" },
                  ],
                },
                {
                  label: "",
                  key: "OID_to_OSC",
                  type: "checkbox",
                  options: [
                    {
                      label: "Send Lawo Access Channel OID Description Field",
                      value: "on",
                    },
                  ],
                },
                {
                  label: "destination:",
                  key: "oid2osc",
                  type: "text",
                },
                {
                  label: "",
                  key: "change_oid_dest",
                  type: "button",
                  buttonLabel: "Apply",
                  help: "example: 127.0.0.1:12001/_9/AccessChannelOID",
                  hideLabel: true,
                },
                {
                  label: "emberpath format",
                  key: "emberpath_format",
                  type: "dropdown",
                  options: [
                    { label: "Numbers", value: "numbers" },
                    { label: "Properties", value: "properties" },
                  ],
                  help: "Choose a format for ember+ path",
                },
              ],
            },
          ],
        },
      },
    ],
    //debug:true
  });
  const oServerIP = preferences
    .value("network_settings.osc_server")
    .split(":")[0];
  const oServerPort = Number(
    preferences.value("network_settings.osc_server").split(":")[1]
  );
  const OID_to_OSC = preferences.value("other_settings.OID_to_OSC");
  preferences.on("save", (preferences) => {
    win.webContents.send("loginfo", "preferences:" + preferences);
    win.webContents.send(
      "loginfo",
      `Preferences were saved.` + JSON.stringify(preferences, null, 4)
    );
  });

  // load auto-options on startup
  function loadPrefs() {
    let autoLoad = preferences.value("save_settings.autoLoad")[0];
    let default_file = preferences.value("save_settings.default_file");
    let autoGo = preferences.value("other_settings.autoGo")[0];
    let embPathFormat = preferences.value("other_settings.emberpath_format");
    if (autoLoad !== undefined) {
      let content = fs.readFileSync(default_file, "utf-8");
      let sendedContent = JSON.stringify(content);
      win.webContents.send("sendFileContent", sendedContent);
      win.webContents.send("sendFilename", default_file);
      if (autoGo !== undefined) {
        win.webContents.send("autoGo");
      }
    }
    win.webContents.send("emberpathFormat", embPathFormat);
  }
  loadPrefs();

  function logDefinition() {
    console.log = log.log;
    Object.assign(console, log.functions);
    log.transports.console.format = "{h}:{i}:{s} / {text}";
    log.errorHandler.startCatching({
      showDialog: false,
      onError(error) {
        msg = error.message;
        win.webContents.send("resolveError", msg);
      },
    });
  }
  logDefinition();

  contextMenu({
    window: win,
    labels: {
      copy: "📷 | Copy",
      paste: "📋 | Paste",
      cut: "✂ | Cut",
    },
    /* Context Menu Items */
    menu: (actions, params, win, dicSuggestion) => [
      /* System Buttons */
      actions.copy(),
      actions.cut(),
      actions.paste(),
    ],
  });
  //---MENU OPERATIONS---//
  ipcMain.on("sendSaveAs", (event, content) => {
    filename = dialog.showSaveDialog(null, recOptions, {}).then((result) => {
      filename = result.filePath;
      fs.writeFile(filename, content, (err) => {
        if (err) {
          win.webContents.send(
            "loginfo",
            "an error ocurred with file creation " + err.message
          );
        }
        win.webContents.send(
          "loginfo",
          "Your file was created successfully : " + filename
        );
        win.webContents.send("sendFilename", filename);
      });
    });
  });
  ipcMain.on("sendSave", (event, content, rSfilename) => {
    fs.writeFile(rSfilename, content, (err) => {
      if (err) {
        win.webContents.send(
          "loginfo",
          "an error ocurred with file creation " + err.message
        );
      }
      win.webContents.send(
        "loginfo",
        "Your file was saved successfully : " + rSfilename
      );
    });
  });
  ipcMain.on("openFile", () => {
    filename = dialog.showOpenDialog(null, openOptions, {}).then((result) => {
      filename = result.filePaths;
      let file = filename[0];
      let content = fs.readFileSync(file, "utf-8");
      let sendedContent = JSON.stringify(content);
      win.webContents.send("sendFileContent", sendedContent);
      win.webContents.send("sendFilename", file);
      let autoGo = preferences.value("other_settings.autoGo")[0];
      if (autoGo !== undefined) {
        win.webContents.send("autoGo");
      }
    });
  });

  //---Network Settings Section---//
  //---Initiating Ember and OSC---//
  function emberGet() {
    const eAddress = preferences.value("network_settings.ember_provider");
    const eServerIP = preferences
      .value("network_settings.ember_provider")
      .split(":")[0];
    const eServerPort = Number(
      preferences.value("network_settings.ember_provider").split(":")[1]
    );
    eGet = new EmberClient(eServerIP, eServerPort, 10000, true, 5000);
    let status = net.createConnection(eServerPort, eServerIP);
    status.on("error", (e) => {
      win.webContents.send(
        "eServConnError",
        "Ember+ server " +
          eAddress +
          " is unreachable, please verify preferences!"
      );
    });
    eGet.on("connected", () => {
      console.log(
        "🚀 : file: main.js:495 : eGet.on : eServerPort:",
        eServerPort
      );
      console.log("🚀 : file: main.js:495 : eGet.on : eServerIP:", eServerIP);
      //      win.webContents.on('did-finish-load', () => {
      win.webContents.send("eServerOK", eAddress);
      win.webContents.send(
        "loginfo",
        "Connection to Ember+ Server  " + eServerIP + ":" + eServerPort + " OK"
      );
      //      })
    });
    eGet.on("disconnected", () => {
      win.webContents.send("eServDisconnected", eAddress);
      win.webContents.send("loginfo", "Disconnected from emberGet");
    });
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
    oUDPport = preferences.value("network_settings.osc_receiver_port");
    console.log("🚀 : file: main.js:523 : oscListening : oUDPport:", oUDPport);
    //  win.webContents.on('did-finish-load', () => {
    win.webContents.send("loginfo", "Port de reception OSC:" + oUDPport);
    //  })
    oscGet = new osc.UDPPort({
      localAddress: "127.0.0.1",
      localPort: Number(oUDPport),
      metadata: true,
    });
    oscGet.open();
    oscGet.on("ready", function () {
      //      win.webContents.on('did-finish-load', () => {
      win.webContents.send(
        "udpportOK",
        preferences.value("network_settings.osc_receiver_port")
      );
      win.webContents.send(
        "oServerOK",
        preferences.value("network_settings.osc_server")
      );
      //      })
    });
  }
  oscListening();

  function oscToTable() {
    oscGet.on("message", (oscBundle) => {
      let oRaddr = JSON.stringify(oscBundle.address);
      let oRargs = mainFunctions.oscToEmber(oscBundle);

      win.webContents.send("oReceivedAddr", oRaddr, oRargs);
      //      win.webContents.send('loginfo', 'oscBundle : ' + oscBundle);
      //      win.webContents.send('loginfo', "OSC Address received" + oRaddr);
      //      win.webContents.send('loginfo', "oRargs: " + oRargs);
    });
  }
  oscToTable();

  win.webContents.on("did-finish-load", () => {
    async function main() {
      try {
        const eAddress = preferences.value("network_settings.ember_provider");
        const err = await eGet.connect();
        if (err) {
          // err = true when the first connection attempt fails (depending on timeout)
          win.webContents.send(
            "loginfo",
            " connection to emberGet unsuccessful->" + err
          );
          win.webContents.send("eServConnError", eAddress);
          win.webContents.send("resolveError", err);
          return;
        }
        win.webContents.on("did-finish-load", () => {
          win.webContents.send("eServerOK", eAddress);
        });
        root = await (await eGet.getDirectory(eGet.tree)).response;
        first_branch = eGet.tree.flat(0);
        //first_br_list = [];
        //for (i = 0; i < first_branch.length; i++) {
        //  first_br_list.push(first_branch[i].number);
        //}
        win.webContents.send("embertree", first_branch);

        async function channelAccess(OID_to_OSC) {
          if (OID_to_OSC[0]) {
            let oid2osc = preferences.value("other_settings.oid2osc");
            let o2o_address = oid2osc.toString().split(":")[0];
            let o2o_port = oid2osc.split(":")[1].split("/")[0];
            let o2o_path = "/" + oid2osc.slice(oid2osc.indexOf("/") + 1);
            let init_oid2osc = "";
            try {
              await mainFunctions.sleep(2000);
              init_oid2osc = await eGet.getElementByPath(
                "Console.AccessChannelOID"
              );
              let init_emberValue = init_oid2osc.contents.value;
              let init_CA_OID = await eGet.getElementByPath(init_emberValue);
              //            win.webContents.on('did-finish-load', () => {
              win.webContents.send(
                "loginfo",
                "initial ChannelAccess name is: " +
                  init_CA_OID.contents.description
              );
              //            })
              oscGet.send(
                {
                  address: o2o_path,
                  args: [
                    {
                      type: "s",
                      value: init_CA_OID.contents.description,
                    },
                  ],
                },
                o2o_address,
                Number(o2o_port)
              );
              eGet.subscribe(init_oid2osc, () => {
                async function bip() {
                  let emberValue = init_oid2osc.contents.value;
                  let CA_OID = await eGet.getElementByPath(emberValue);
                  win.webContents.send(
                    "loginfo",
                    "CA_OID changed: " + CA_OID.contents.description
                  );
                  oscGet.send(
                    {
                      address: o2o_path,
                      args: [
                        {
                          type: "s",
                          value: CA_OID.contents.description,
                        },
                      ],
                    },
                    o2o_address,
                    Number(o2o_port)
                  );
                }
                bip();
              });
            } catch (e) {
              const message = await e.message;
              //          win.webContents.on('did-finish-load', () => {
              win.webContents.send(
                "loginfo",
                "oid2osc failed due to: " + message
              );
              //          })
            }
          }
        }
        channelAccess(OID_to_OSC);

        preferences.on("click", (key) => {
          if (key === "change_oid_dest") {
            channelAccess(OID_to_OSC);
          }
        });

        ipcMain.on(
          "newConnection",
          async (
            event,
            ePath,
            oAddr,
            myRow,
            eVarType,
            sFactor,
            eMin,
            eMax,
            oMin,
            oMax,
            eVarCurve,
            direction,
            tableLength
          ) => {
            directions[myRow] = direction;

            sFactor = Number(sFactor);
            let initialReq = await eGet.getElementByPath(ePath);
            console.log(
              "🚀 : file: main.js:783 : main : initialReq:",
              initialReq
            );
            let parameter_type = initialReq.contents.parameterType;
            let contents_type = initialReq.contents.type;
            let contents = initialReq.contents;
            let emberValue = initialReq.contents.value;
            if (contents_type == "PARAMETER") {
              if (parameter_type == "ENUM") {
                win.webContents.send("choosen_type", 4, myRow);
                let enumList = initialReq.contents.enumeration.split("\n");
                enum_length = enumList.length;
              } else if (parameter_type == "INTEGER") {
                win.webContents.send("choosen_type", 2, myRow);
                if (typeof initialReq.contents.maximum !== "undefined") {
                  if (initialReq.contents.maximum !== eMax) {
                    eMax = initialReq.contents.maximum;
                  }
                } else {
                  eMax = 128;
                }
                if (typeof initialReq.contents.minimum !== "undefined") {
                  if (initialReq.contents.minimum !== eMin) {
                    eMin = initialReq.contents.minimum;
                  }
                } else {
                  eMin = 0;
                }
                if (typeof initialReq.contents.factor !== "undefined") {
                  if (Number(initialReq.contents.factor) !== sFactor) {
                    sFactor = initialReq.contents.factor;
                  }
                } else {
                  sFactor = 1;
                }
              } else if (parameter_type == "BOOLEAN") {
                let bool_description = initialReq.contents.description;
                win.webContents.send("choosen_type", 1, myRow);
                win.webContents.send(
                  "loginfo",
                  "parameter : " + bool_description
                );
              } else if (parameter_type == "STRING") {
                win.webContents.send("choosen_type", 0, myRow);
              }
            } else if (contents_type == "MATRIX") {
              let mtx_t_count = initialReq.contents.targetCount;
              let mtx_s_count = initialReq.contents.sourceCount;
              let mtx_description = initialReq.contents.description;
              win.webContents.send(
                "loginfo",
                "WARNING! : You're trying to connect to a Matrix object(" +
                  mtx_description +
                  " : " +
                  mtx_s_count +
                  " Ins X " +
                  mtx_t_count +
                  " Outs), but it's not yet implemented"
              );
              win.webContents.send("choosen_type", 5, myRow);
              win.webContents.send("errorOnEditedPath", myRow);
            } else if (contents_type == "NODE") {
              let node_description = initialReq.contents.description;
              let getDir = await (await eGet.getDirectory(initialReq)).response;
              console.log("🚀 : file: main.js:864 : main : getDir:", getDir);
              nodeChildren = Object.keys(initialReq.children);
              for (i = 0; i < nodeChildren.length; i++) {
                newreq = await eGet.getElementByPath(
                  ePath + "." + nodeChildren[i]
                );
              }
              win.webContents.send(
                "loginfo",
                "WARNING! : You're trying to connect to a NODE ( " +
                  node_description +
                  " with children numbered " +
                  nodeChildren +
                  "), not a PARAMETER"
              );
              win.webContents.send("choosen_type", 6, myRow);
              win.webContents.send("errorOnEditedPath", myRow);
            } else if (contents_type == "FUNCTION") {
              let fct_description = initialReq.contents.description;
              if (!initialReq.contents.args) {
                let function_cb = await (
                  await eGet.invoke(initialReq)
                ).response;
                console.log(
                  "🚀 : file: main.js:727 : main : function_cb.result[0]:",
                  function_cb
                );
                win.webContents.send(
                  "loginfo",
                  "🚀 : file: main.js:724 : main : function_cb:" +
                    JSON.stringify(function_cb.result)
                );
              } else {
                console.log(
                  "🚀 : file: main.js:720 : main : initialReq.contents.args:",
                  initialReq.contents.args
                );
              }
              win.webContents.send(
                "loginfo",
                "WARNING! : You're trying to connect to a FUNCTION ( " +
                  fct_description +
                  " ), not a PARAMETER"
              );
              win.webContents.send("choosen_type", 7, myRow);
              win.webContents.send("errorOnEditedPath", myRow);
            }

            event.sender.send(
              "sendEmberValue",
              emberValue,
              myRow,
              1,
              directions[myRow],
              eMax,
              eMin,
              sFactor,
              oMax,
              oMin
            );
            let state = ["first", myRow];
            try {
              eGet.subscribe(initialReq, () => {
                if (
                  JSON.stringify(state) === JSON.stringify(["first", myRow])
                ) {
                  //            direction = "ET";
                  win.webContents.send("loginfo", "subscribed to " + ePath);
                  win.webContents.send("loginfo", contents);
                  emberValue = initialReq.contents.value;
                  directions[myRow] = "-";
                  event.sender.send(
                    "sendEmberValue",
                    emberValue,
                    myRow,
                    1,
                    directions[myRow],
                    eMax,
                    eMin,
                    sFactor,
                    oMax,
                    oMin
                  );
                  state = ["nonFirst", myRow];
                  //            direction = ""
                } else {
                  EmberIn[myRow] = Date.now();
                  if (EmberOut[myRow]) {
                    let emb_io_delay = EmberIn[myRow] - EmberOut[myRow];
                    if (EmberIn[myRow] - EmberOut[myRow] > EmberRate) {
                      if (directions[myRow] !== "◄") {
                        directions[myRow] = "►";
                        emberValue = initialReq.contents.value;
                        event.sender.send(
                          "sendEmberValue",
                          emberValue,
                          myRow,
                          1,
                          directions[myRow],
                          eMax,
                          eMin,
                          sFactor,
                          oMax,
                          oMin
                        );
                        if (eVarType == "Integer" && eVarCurve == "lin") {
                          let value = mainFunctions.mapToScale(
                            Number(emberValue),
                            [Number(eMin), Number(eMax)],
                            [Number(oMin), Number(oMax)],
                            2
                          );
                          oscGet.send(
                            {
                              address: oAddr,
                              args: [
                                {
                                  type: "f",
                                  value: Number(value),
                                },
                              ],
                            },
                            oServerIP,
                            oServerPort
                          );
                          win.webContents.send(
                            "loginfo",
                            "EMBER+ -lin-> OSC : " + value
                          );
                        } else if (
                          eVarType == "Integer" &&
                          eVarCurve == "log"
                        ) {
                          let value = mainFunctions.mapToScale(
                            Number(emberValue),
                            [Number(eMin), Number(eMax)],
                            [Number(oMin), Number(oMax)],
                            2,
                            true
                          );
                          oscGet.send(
                            {
                              address: oAddr,
                              args: [
                                {
                                  type: "f",
                                  value: Number(value),
                                },
                              ],
                            },
                            oServerIP,
                            oServerPort
                          );
                          win.webContents.send(
                            "loginfo",
                            "EMBER+ -log-> OSC : " + value
                          );
                        } else if (eVarType == "Real" || eVarType == "Enum") {
                          oscGet.send(
                            {
                              address: oAddr,
                              args: [
                                {
                                  type: "f",
                                  value: Number(emberValue),
                                },
                              ],
                            },
                            oServerIP,
                            oServerPort
                          );
                          win.webContents.send(
                            "loginfo",
                            "EMBER+ -Real-> OSC : " + emberValue
                          );
                        } else if (eVarType == "String") {
                          win.webContents.send(
                            "loginfo",
                            "string reçu:" + emberValue
                          );
                          oscGet.send(
                            {
                              address: oAddr,
                              args: [
                                {
                                  type: "s",
                                  value: emberValue.toString(),
                                },
                              ],
                            },
                            oServerIP,
                            oServerPort
                          );
                          win.webContents.send(
                            "loginfo",
                            "EMBER+ -string-> OSC : " + emberValue
                          );
                        } else if (
                          eVarType == "Boolean" &&
                          emberValue == true
                        ) {
                          oscGet.send(
                            {
                              address: oAddr,
                              args: [
                                {
                                  type: "T",
                                  value: 1,
                                },
                              ],
                            },
                            oServerIP,
                            oServerPort
                          );
                          win.webContents.send(
                            "loginfo",
                            "EMBER+ -bool-> OSC : " + emberValue
                          );
                        } else if (
                          eVarType == "Boolean" &&
                          emberValue == false
                        ) {
                          oscGet.send(
                            {
                              address: oAddr,
                              args: [
                                {
                                  type: "F",
                                  value: 0,
                                },
                              ],
                            },
                            oServerIP,
                            oServerPort
                          );
                          win.webContents.send(
                            "loginfo",
                            "EMBER+ -bool-> OSC : " + emberValue
                          );
                        }

                        //            direction = "ET";
                        if (gateDelayIN[myRow]) {
                          if (
                            Object.values(gateDelayIN[myRow])[5][0] == myRow
                          ) {
                            clearTimeout(gateDelayIN[myRow]);
                          }
                        }

                        gateDelayIN[myRow] = setTimeout(
                          () => {
                            directions[myRow] = "-";
                            event.sender.send(
                              "sendEmberValue",
                              emberValue,
                              myRow,
                              1,
                              directions[myRow],
                              eMax,
                              eMin,
                              sFactor,
                              oMax,
                              oMin
                            );
                            win.webContents.send("loginfo", "waiting");
                          },
                          500,
                          myRow
                        );
                        EmberOut[myRow] = Date.now();
                      }
                    } else {
                      EmberOut[myRow] = Date.now();
                    }
                  } else {
                    EmberOut[myRow] = Date.now();
                  }
                }
              });
              win.webContents.send("noError", myRow);
            } catch (error) {
              msg = error.message;
              console.log("🚀 : file: main.js:1058 : main : msg:", msg);
              win.webContents.send("loginfo", msg);
            }
          }
        );

        ipcMain.on("mtx_connect", async (event, mtx_path, check_t, check_s) => {
          console.log(
            "🚀 : file: main.js:990 : ipcMain.on : mtx_path:",
            mtx_path
          );
          let mtx = await eGet.getElementByPath(mtx_path);
          await eGet.matrixSetConnection(mtx, check_t, check_s);
        });

        ipcMain.on(
          "deleteConnection",
          async (event, ePath, oAddr, myRow, eVarType, sFactor) => {
            let req = await eGet.getElementByPath(ePath);
            eGet.unsubscribe(req);
            win.webContents.send("loginfo", "unsuscribe to " + ePath);
          }
        );

        ipcMain.on(
          "reSendOrArgs",
          async (
            event,
            rOrArgs,
            rEaddr,
            sFactor,
            eVarType,
            eMin,
            eMax,
            oMin,
            oMax,
            eVarCurve,
            myRow,
            direction,
            tableLength
          ) => {
            if (!ro[myRow]) {
              ro[myRow] = 1;
            }
            OSCin[myRow] = Date.now();
            directions[myRow] = direction;
            if (OSCout[myRow]) {
              let osc_io_delay = OSCin[myRow] - OSCout[myRow];
              if (osc_io_delay > OSCrate) {
                if (directions[myRow] !== "►") {
                  directions[myRow] = "◄";
                  win.webContents.send(
                    "updateDirection",
                    myRow,
                    directions[myRow]
                  );
                  console.log("direction set to O->E");
                  if (gateDelayOUT[myRow]) {
                    if (Object.values(gateDelayOUT[myRow])[5][0] == myRow) {
                      clearTimeout(gateDelayOUT[myRow]);
                    }
                  }
                  let rereq = await eGet.getElementByPath(rEaddr);
                  if (ro[myRow] == 1) {
                    eGet.unsubscribe(rereq);
                    state = ["first", myRow];
                    win.webContents.send(
                      "loginfo",
                      "eGet unsuscribe to " + rereq
                    );
                  }
                  if (eVarType == "Integer" && eVarCurve == "lin") {
                    let value = mainFunctions.mapToScale(
                      Number(rOrArgs),
                      [Number(oMin), Number(oMax)],
                      [Number(eMin), Number(eMax)],
                      2
                    );
                    eGet.setValue(rereq, Number(value.toFixed(0)));
                    win.webContents.send(
                      "loginfo",
                      "OSC -lin-> EMBER+ : " + value.toFixed(0)
                    );
                  } else if (eVarType == "Integer" && eVarCurve == "log") {
                    let value = mainFunctions.mapToScale(
                      Number(rOrArgs),
                      [Number(oMin), Number(oMax)],
                      [Number(eMin), Number(eMax)],
                      2,
                      true,
                      -1
                    );
                    eGet.setValue(rereq, Number(value.toFixed(0)));
                    win.webContents.send(
                      "loginfo",
                      "OSC -log-> EMBER+ : " + value.toFixed(0)
                    );
                  } else if (eVarType == "Boolean" && rOrArgs == "1") {
                    eGet.setValue(rereq, true);
                    win.webContents.send(
                      "loginfo",
                      ("OSC -bool-> EMBER+", rOrArgs)
                    );
                  } else if (eVarType == "Boolean" && rOrArgs == "0") {
                    eGet.setValue(rereq, false);
                    win.webContents.send(
                      "loginfo",
                      ("OSC -bool-> EMBER+", rOrArgs)
                    );
                  } else if (eVarType == "String") {
                    eGet.setValue(rereq, rOrArgs.toString());
                    win.webContents.send(
                      "loginfo",
                      ("OSC -string-> EMBER+", rOrArgs)
                    );
                  } else {
                    eGet.setValue(rereq, rOrArgs);
                    win.webContents.send(
                      "loginfo",
                      ("OSC -string-> EMBER+", rOrArgs)
                    );
                  }
                  gateDelayOUT[myRow] = setTimeout(
                    () => {
                      win.webContents.send("loginfo", "waiting");
                      win.webContents.send("resubscribe", myRow);
                      directions[myRow] = "-";
                      win.webContents.send(
                        "updateDirection",
                        myRow,
                        directions[myRow]
                      );
                      ro[myRow] = null;
                    },
                    500,
                    myRow
                  );
                }
                OSCout[myRow] = Date.now();
              } else {
                OSCout[myRow] = Date.now();
              }
            } else {
              OSCout[myRow] = Date.now();
            }
          }
        );

        ipcMain.on("expandNode", async (event, parentPath, currOpt_class) => {
          console.log("🚀 : file: main.js:1173 : parentPath,:", parentPath);
          console.log(
            "🚀 : file: main.js:1173 : currOpt_class:",
            currOpt_class
          );
          if (currOpt_class == "NODE") {
            let childrenArray = [];
            let expandReq = await eGet.getElementByPath(parentPath.toString());
            console.log("🚀 : file: main.js:1178 : == : expandReq:", expandReq);
            let getDir = await eGet.getDirectory(expandReq);
            try {
              let getDirResponse = await getDir.response;
            } catch (error) {
              console.log("🚀 : file: main.js:1183 : == : error:", error);
            }
            let nodeChildren = Object.keys(expandReq.children);
            console.log(
              "🚀 : file: main.js:1187 : == : nodeChildren:",
              nodeChildren
            );

            for (i = 0; i < nodeChildren.length; i++) {
              let numb_of_child = nodeChildren[i];
              console.log(
                "🚀 : file: main.js:1154 : == : ipcMain.on : numb_of_child:",
                numb_of_child
              );
              let path_of_child =
                parentPath.toString() + "." + numb_of_child.toString();
              console.log(
                "🚀 : file: main.js:1154 : == : ipcMain.on : path_of_child:",
                path_of_child
              );
              let newChild = await eGet.getElementByPath(path_of_child);
              console.log(
                "🚀 : file: main.js:1113 : == : ipcMain.on : newChild:",
                newChild
              );
              contents = newChild.contents;
              console.log(
                "🚀 : file: main.js:1193 : == : newChild.contents:",
                newChild.contents
              );
              number = newChild.number;
              if (newChild.parent.path) {
                parentPath = newChild.parent.path;
              } else if (newChild.parent.number) {
                parentPath = newChild.parent.number.toString();
              }
              console.log(
                "🚀 : file: main.js:1195 : == : newChild.number:",
                newChild.number
              );
              base_path = { contents, number, parentPath };
              childrenArray.push(base_path);
            }
            console.log(
              "🚀 : file: main.js:1204 : == : childrenArray:",
              childrenArray
            );
            win.webContents.send("expandedNode", parentPath, childrenArray);
            win.webContents.send("expandedElement", expandReq, false);
          } else if (currOpt_class == "MATRIX") {
            let mtx_Array = [];
            let expandReq = await eGet.getElementByPath(parentPath.toString());
            let getDir = await (await eGet.getDirectory(expandReq)).response;
            let mtx_conn_content = Object.values(getDir.contents.connections);
            let mtx_conn_id = Object.keys(getDir.contents.connections);

            for (i = 0; i < mtx_conn_id.length; i++) {
              //TODO:do something to create a matrix table
            }
            contents = getDir.contents;
            number = getDir.number;
            parentPath = getDir.parent.path;
            base_path = { contents, number, parentPath };
            win.webContents.send("expandedElement", base_path, true);
          } else {
            let expandReq = await eGet.getElementByPath(parentPath.toString());
            contents = expandReq.contents;
            number = expandReq.number;
            parentPath = expandReq.parent.path;
            base_path = { contents, number, parentPath };
            win.webContents.send("expandedElement", base_path, true);
          }
        });
      } catch (error) {
        msg = error.message;
        console.log("🚀 : file: main.js:1423 : main : msg:", msg);
        throw Error(error);
      }
    }
    main().catch((err) => {
      msg = err.message;
      win.webContents.send("resolveError", msg);
      console.error("1029", msg);
    });
  });

  preferences.on("click", (key) => {
    if (key === "resetButton") {
      //    win.webContents.send("loginfo", "ember+ provider settings changed!");
      //
      //    emberGet();
      //    main().catch((err) => {
      //      msg = err.message;
      //      win.webContents.send("resolveError", err);
      //      console.error(err);
      //    });
      app.relaunch();
      app.quit();
    } else if (key === "applyButton") {
      win.webContents.send("loginfo", "listening port changed!");
      win.webContents.send(
        "udpportOK",
        preferences.value("network_settings.osc_receiver_port")
      );
      oscGet.close();
      oscListening();
      oscGet.on("error", function (error) {
        msg = error.message;
        win.webContents.send("udpportKO", msg);
        win.webContents.send("resolveError", msg);
      });
    }
  });
  oscGet.on("error", (error) => {
    msg = error.message;
    win.webContents.send("udpportKO", msg);
    win.webContents.send("resolveError", msg);
    oscGet.close();
  });
  win.autoHideMenuBar = "true";
  win.menuBarVisible = "false";
  win.webContents.send("appVersion", app.getVersion());
  win.on("close", (e) => {
    if (win) {
      e.preventDefault();
      win.webContents.send("autoSave");
    }
  });
}
app.whenReady().then(createWindow);
app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});
