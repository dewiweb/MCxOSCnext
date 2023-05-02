const { ipcRenderer } = require("electron");
const mainFunctions = require("./mainFunctions");
const preferences = ipcRenderer.sendSync("getPreferences");
//const Tabulator = require("tabulator-tables");
const { TreeView, TreeNode, TreeUtil, TreeConfig } = require("./tree");
const log = require("electron-log");
const { prettyPrintJson } = require("pretty-print-json");
const osc = require("osc/src/osc-transports");
function logDefinition() {
  console.log = log.log;
  Object.assign(console, log.functions);
  log.transports.console.format = "{h}:{i}:{s} / {text}";
}
logDefinition();

log.transports.div = log.transports.console;

function scrollToBottom() {
  document.getElementById("logging").scrollTop =
    document.getElementById("logging").scrollHeight;
}
//---VARIABLES declaration--//
//const oscAddr = new Array("/Channels");
//let rInputsUserLabels = [];
//let rAuxesUserLabels = [];
//let rMastersUserLabels = [];
//let rSumsUserLabels = [];
//let rGpcsUserLabels = [];
let racine = new TreeNode("tree");
let tree = new TreeView(racine);
let nodes = [];
let tableData = [
  {
    id: "1",
    path: "boo",
    go_x: '<button type="button" class="btn-click">Click here</button>',
  },
];
let stringPath;
let stringPathFormat = "STRING";
let parameter_content = "";
const autoSave = null;
const embPathFormat = null;
let innerPath = undefined;
let stream_direction;

//---Listen to the `preferencesUpdated` event to be notified when preferences are changed.---//

ipcRenderer.on("preferencesUpdated", (e, preferences) => {
  logRenderer("Preferences were updated" + preferences);
});
ipcRenderer.on("emberpathFormat", (e, embPathFormat) => {
  console.log(
    "🚀 : file: renderer.js:36 : ipcRenderer.on : embPathFormat:",
    embPathFormat
  );
});

//---Interactions with Back-End---//

ipcRenderer.on("resubscribe", (event, myRow) => {
  let table = document.getElementById("tableOfConnection");
  table.rows[myRow].cells[5].firstElementChild.click();
});

ipcRenderer.on("udpportOK", (event, uPort) => {
  let add2 = document.getElementById("add2");
  add2.removeChild(add2.firstChild);
  add2.textContent = "Listening on port : " + uPort;
  let dot2 = document.getElementById("dot2");
  dot2.style.color = "green";
  dot2.classList.remove("blink");
  add2.style.color = "green";
  add2.classList.remove("blink");
});

ipcRenderer.on("udpportKO", (event, msg) => {
  let add2 = document.getElementById("add2");
  add2.removeChild(add2.firstChild);
  add2.textContent = "An Error ocurred :" + msg;
  let dot2 = document.getElementById("dot2");
  dot2.style.color = "red";
  dot2.classList.add("blink");
  add2.style.color = "red";
  add2.classList.add("blink");
});

ipcRenderer.on("oServerOK", (event, oAddress) => {
  let add3 = document.getElementById("add3");
  add3.removeChild(add3.firstChild);
  add3.textContent = "Connected to " + oAddress;
  let dot3 = document.getElementById("dot3");
  dot3.style.color = "green";
  dot3.classList.remove("blink");
  add3.style.color = "green";
  add3.classList.remove("blink");
});

ipcRenderer.on("eServerOK", (event, eAddress) => {
  let add1 = document.getElementById("add1");
  if (add1.firstChild) {
    add1.removeChild(add1.firstChild);
  }
  add1.textContent = "Connected to " + eAddress;
  let dot1 = document.getElementById("dot1");
  dot1.style.color = "green";
  dot1.classList.remove("blink");
  add1.style.color = "green";
  add1.classList.remove("blink");
});

ipcRenderer.on("eServConnError", function (event, msg) {
  logRenderer(msg);
  let add1Error = document.getElementById("add1");
  let dot1Error = document.getElementById("dot1");
  add1Error.innerHTML = "Verify Ember+ Provider Address in preferences!";
  dot1Error.style.color = "red";
  dot1Error.classList.add("blink");
  add1Error.style.color = "red";
  add1Error.classList.add("blink");
});

ipcRenderer.on("eServDisconnected", function (event, eAddress) {
  logRenderer("erreur de connection ember+");
  let add1Error = document.getElementById("add1");
  let dot1Error = document.getElementById("dot1");
  add1Error.innerHTML = eAddress + "is disconnected!";
  dot1Error.style.color = "red";
  dot1Error.classList.add("blink");
  dot1Error.classList.add("blink");
  add1Error.style.color = "red";
  add1Error.classList.add("blink");
});

ipcRenderer.on("resolveError", (e, msg) => {
  if (("error-msg: ", msg)) {
    console.log("🚀 : file: renderer.js:132 : ipcRenderer.on : msg:", msg);
    let date = new Date();
    date =
      date.getHours() +
      ":" +
      (date.getMinutes() < 10 ? "0" : "") +
      date.getMinutes() +
      ":" +
      (date.getSeconds() < 10 ? "0" : "") +
      date.getSeconds() +
      "-->";
    console.log("🚀 : file: renderer.js:142 : ipcRenderer.on : date:", date);
    document
      .getElementById("logging")
      .insertAdjacentHTML("beforeend", date + msg + "<br>");
    scrollToBottom();
    ipcRenderer.send("showPreferences");
  }
});

ipcRenderer.on("errorOnEditedPath", (e, myRow) => {
  let table = document.getElementById("tableOfConnection");
  let epath = table.rows[myRow].cells[0];
  epath.style.color = "red";
});

ipcRenderer.on("noError", (e, myRow) => {
  let table = document.getElementById("tableOfConnection");
  let epath = table.rows[myRow].cells[0];
  epath.style.color = "";
});

ipcRenderer.on("loginfo", (e, msg) => {
  let date = new Date();
  date =
    date.getHours() +
    ":" +
    (date.getMinutes() < 10 ? "0" : "") +
    date.getMinutes() +
    ":" +
    (date.getSeconds() < 10 ? "0" : "") +
    date.getSeconds() +
    "-->";
  if (document.getElementById("logging")) {
    document
      .getElementById("logging")
      .insertAdjacentHTML("beforeend", date + JSON.stringify(msg) + "<br>");
    scrollToBottom();
  }
});

ipcRenderer.on("embertree", (event, root) => {
  let nodeType = "NODE";
  for (i = 0; i < root.length; i++) {
    nodes[root[i].number.toString()] = new TreeNode(
      root[i].number.toString() + " - " + root[i].contents.description,
      {
        icon: TreeUtil.default_parent_icon,
      }
    );
    racine.addChild(nodes[root[i].number.toString()]);
    tree.reload();
    nodes[root[i].number.toString()].on("select", (e) => {
      let path = getNodePathToRoot(e);
      stringPath = "";
      if (stringPathFormat == "NUMBER") {
        path.forEach(function (node) {
          stringPath +=
            node.getUserObject().split("-")[0].replace(/\D+/g, "") + ".";
        });
        stringPath = stringPath.substring(1, stringPath.length - 1);
      } else {
        path.forEach(function (node) {
          stringPath += node.getUserObject().split("- ")[1] + ".";
        });
        stringPath = stringPath.substring(10, stringPath.length - 1);
      }
      console.log(
        "🚀 : file: renderer.js:103 : path.forEach : stringPath:",
        stringPath
      );
    });

    nodes[root[i].number.toString()].on("click", (e) => {
      parentPath = e.srcElement.innerText.split("-")[0].replace(/\D+/g, "");
      ipcRenderer.send("expandNode", parentPath, nodeType);
    });
  }
});

ipcRenderer.on("expandedNode", (event, parentPath, childrenArray) => {
  for (i = 0; i < childrenArray.length; i++) {
    let nodeText;
    if (childrenArray[i].contents.description !== undefined) {
      nodeText = childrenArray[i].contents.description;
    } else {
      nodeText = childrenArray[i].contents.identifier;
    }
    let nodeType = childrenArray[i].contents.type;
    if (!nodes[parentPath + "." + childrenArray[i].number.toString()]) {
      if (nodeType == "NODE") {
        nodes[parentPath + "." + childrenArray[i].number.toString()] =
          new TreeNode(childrenArray[i].number.toString() + " - " + nodeText, {
            icon: TreeUtil.default_parent_icon,
          });
      } else if (nodeType == "PARAMETER") {
        nodes[parentPath + "." + childrenArray[i].number.toString()] =
          new TreeNode(childrenArray[i].number.toString() + " - " + nodeText);
      } else if (nodeType == "MATRIX") {
        nodes[parentPath + "." + childrenArray[i].number.toString()] =
          new TreeNode(childrenArray[i].number.toString() + " - " + nodeText, {
            icon: TreeUtil.default_matrix_icon,
          });
      } else if (nodeType == "FUNCTION") {
        nodes[parentPath + "." + childrenArray[i].number.toString()] =
          new TreeNode(childrenArray[i].number.toString() + " - " + nodeText, {
            icon: TreeUtil.default_fx_icon,
          });
      }
      nodes[parentPath].addChild(
        nodes[parentPath + "." + childrenArray[i].number.toString()]
      );
      tree.reload();
      nodes[parentPath + "." + childrenArray[i].number.toString()].on(
        "select",
        (e) => {
          let path = getNodePathToRoot(e);
          stringPath = "";
          if (stringPathFormat == "NUMBER") {
            path.forEach(function (node) {
              stringPath +=
                node.getUserObject().split("-")[0].replace(/\D+/g, "") + ".";
            });
            stringPath = stringPath.substring(1, stringPath.length - 1);
          } else {
            path.forEach(function (node) {
              stringPath += node.getUserObject().split("- ")[1] + ".";
            });
            stringPath = stringPath.substring(10, stringPath.length - 1);
          }

          console.log(
            "🚀 : file: renderer.js:125 : path.forEach : stringPath:",
            stringPath
          );
        }
      );

      nodes[parentPath + "." + childrenArray[i].number.toString()].on(
        "click",
        (e) => {
          ipcRenderer.send(
            "expandNode",
            parentPath +
              "." +
              e.srcElement.innerText.split("-")[0].replace(/\D+/g, ""),
            nodeType
          );
        }
      );
    }
  }
});

ipcRenderer.on("expandedElement", (event, expandReq, Boolean) => {
  //console.log(
  //  "🚀 : file: renderer.js:303 : ipcRenderer.on : expandReq:",
  //  expandReq
  //);
  let leaf = document.getElementById("expandedElement");
  let sub_2_button = document.getElementById("suscribe_2");
  let matrixView = document.getElementById("central_view");
  matrixView.innerHTML = "";
  matrixView.style.width = "0%";
  matrixView.style.visibility = "hidden";
  if (Boolean == true) {
    innerPath = expandReq;
    parameter_content = expandReq;
    parameter_type = expandReq.contents.type;
    leaf.innerHTML = prettyPrintJson.toHtml(expandReq);

    if (parameter_type == "PARAMETER") {
      sub_2_button.style.visibility = "visible";
    } else if (parameter_type == "MATRIX") {
      console.log(
        "🚀 : file: renderer.js:321 : ipcRenderer.on : parameter_type:",
        parameter_type
      );
      let targets = expandReq.contents.targetCount;
      let sources = expandReq.contents.sourceCount;
      let connections = expandReq.contents.connections;
      let mtx_path = expandReq.parentPath + "." + expandReq.number.toString();
      createMatrixView(mtx_path, targets, sources, connections);
      sub_2_button.style.visibility = "hidden";
      matrixView.style.visibility = "visible";
      matrixView.style.width = "33%";
    } else if (parameter_type == "FUNCTION") {
      let func_args;
      let func_result;
      if (expandReq.contents.args) {
        func_args = expandReq.contents.args;
      }
      if (expandReq.contents.result) {
        func_result = expandReq.contents.result;
      }
      let func_path = expandReq.parentPath + "." + expandReq.number.toString();
      sub_2_button.style.visibility = "visible";
    } else {
      sub_2_button.style.visibility = "hidden";
    }
  } else {
    leaf.innerHTML = null;
    sub_2_button.style.visibility = "hidden";
  }
});

ipcRenderer.on("choosen_type", (e, response, myRow) => {
  let types = [
    "String",
    "BOOLEAN",
    "Integer",
    "Float",
    "Enum",
    "MATRIX",
    "NODE",
    "FUNCTION",
  ];
  let table = document.getElementById("tableOfConnection");
  let x = table.rows.length;
  if (!myRow) {
    console.log(
      "🚀 : file: renderer.js:197 : ipcRenderer.on : types[response]:",
      types[response]
    );
    table.rows[x - 1].cells[6].innerHTML = types[response];
    if (response > 1 && response < 5) {
      table.rows[
        x - 1
      ].cells[7].innerHTML = `<select onChange="changed(this.parentNode.parentNode.rowIndex)">
                                          <option value="log" selected >log</option>
                                          <option value="lin">lin</option>
                                          </select>`;
      table.rows[x - 1].cells[8].innerHTML =
        "0/" +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="0">`;
      table.rows[x - 1].cells[10].innerHTML =
        "1/" +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="1">`;
    } else if (response == 1) {
      console.log(
        "🚀 : file: renderer.js:230 : ipcRenderer.on : response:",
        response
      );
      table.rows[x - 1].cells[7].innerHTML = `<select>
                                          <option value="" selected class="without_icon"></option>
                                          </select>`;
      table.rows[x - 1].cells[8].innerHTML =
        `false/` +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="0">`;
      table.rows[x - 1].cells[10].innerHTML =
        `true/` +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="1">`;
    } else if (response == 0) {
      table.rows[x - 1].cells[7].innerHTML = `<select>
                                          <option value="" selected class="without_icon"></option>
                                          </select>`;
      table.rows[x - 1].cells[8].innerHTML =
        "/" +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="0">`;
      table.rows[x - 1].cells[10].innerHTML =
        "/" +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="1">`;
    }
  } else {
    console.log(
      "🚀 : file: renderer.js:234 : ipcRenderer.on : types[response]:",
      types[response]
    );
    table.rows[myRow].cells[6].innerHTML = types[response];
    str = table.rows[myRow].cells[6].innerHTML;
    table.rows[myRow].cells[6].innerHTML =
      str[0].toUpperCase() + str.substring(1).toLowerCase();
    if (response > 4) {
      table.rows[myRow].cells[6].style.color = "red";
      table.rows[myRow].cells[1].style.color = "red";
    }
  }
});

ipcRenderer.on("streamDirection", (e, direction) => {
  stream_direction = direction;
});

ipcRenderer.on(
  "sendEmberValue",
  (
    event,
    emberValue,
    whichRow,
    whichCell,
    direction,
    embmax,
    embmin,
    embfactor,
    oscmax,
    oscmin
  ) => {
    let table = document.getElementById("tableOfConnection");
    table.rows[whichRow].cells[whichCell].innerHTML = emberValue;
    table.rows[whichRow].cells[9].innerHTML = direction;
    table.rows[whichRow].cells[2].innerHTML = embfactor;
    table.rows[whichRow].cells[8].innerHTML =
      embmin +
      "/" +
      `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="` +
      Number(oscmin) +
      `">`;
    table.rows[whichRow].cells[10].innerHTML =
      embmax +
      "/" +
      `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="` +
      Number(oscmax) +
      `">`;
  }
);

ipcRenderer.on("oReceivedAddr", (e, oRaddr, oRargs) => {
  let osc_address;
  let blink2;
  let rEaddr2;
  let sFactor2;
  let eVarType2;
  let eMin2;
  let eMax2;
  let oMin2;
  let oMax2;
  let eVarCurve2;
  let dot2 = document.getElementById("dot2");
  dot2.classList.toggle("blink");
  filteR = oRaddr.toUpperCase();
  table = document.getElementById("tableOfConnection");
  tr = table.getElementsByTagName("tr");
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td")[4];
    if (td) {
      txtValue = JSON.stringify(td.textContent) || JSON.stringify(td.innerText);
      let p = td.parentNode;
      let myRow = p.rowIndex;
      if (txtValue.toUpperCase().indexOf(filteR) > -1) {
        if (isNaN(oRargs)) {
          table.rows[myRow].cells[3].innerHTML = oRargs;
        } else {
          table.rows[myRow].cells[3].innerHTML = oRargs.toFixed(2);
        }
        sFactor2 = table.rows[myRow].cells[2].innerHTML;
        rEaddr2 = table.rows[myRow].cells[0].innerHTML;
        eVarType2 = table.rows[myRow].cells[6].innerHTML;
        eMin2 = table.rows[myRow].cells[8].innerHTML
          .split("<")[0]
          .replace(/\//, "");
        eMax2 = table.rows[myRow].cells[10].innerHTML
          .split("<")[0]
          .replace(/\//, "");
        oMin2 = table.rows[myRow].cells[8].firstElementChild.value;
        if (typeof oMin2 === "undefined") {
          oMin2 = eMin2;
        }
        oMax2 = table.rows[myRow].cells[10].firstElementChild.value;
        if (typeof oMax2 === "undefined") {
          oMax2 = eMax2;
        }
        eVarCurve2 = table.rows[myRow].cells[7].firstElementChild.value;
        direction = table.rows[myRow].cells[9].innerHTML;
        //        let reSendOrArgs =
        //          (oRargs,
        //          rEaddr2,
        //          sFactor2,
        //          eVarType2,
        //          eMin2,
        //          eMax2,
        //          oMin2,
        //          oMax2,
        //          eVarCurve2,
        //          myRow,
        //          direction,
        //          table.rows.length);
        ipcRenderer.send(
          "reSendOrArgs",
          oRargs,
          rEaddr2,
          sFactor2,
          eVarType2,
          eMin2,
          eMax2,
          oMin2,
          oMax2,
          eVarCurve2,
          myRow,
          direction,
          table.rows.length
        );
      }
    }
  }
  setTimeout(() => {
    dot2.classList.remove("blink");
  }, 2000);
  osc_address = oRaddr;
});

ipcRenderer.on("updateDirection", (e, myRow, direction) => {
  let table = document.getElementById("tableOfConnection");
  table.rows[myRow].cells[9].innerHTML = direction;
});

ipcRenderer.on("sendFilename", (e, filename) => {
  let filePath = filename.toString();
  document.getElementById("filepath").innerHTML = filePath;
  filenameReplace = filename.replace(/\//g, ",");
  filenameSplit = filenameReplace.split(",");
  filenameSlice = filenameSplit.slice(-1)[0];
  document.title = "MCxOSC - " + filenameSlice;
});

ipcRenderer.on("sendFileContent", (e, content) => {
  let table = document.getElementById("tableOfConnection");
  deleteAllRows();

  let sendedJSON = JSON.parse(content);
  sendedJSON = sendedJSON.replace(/\\n/g, "");
  sendedJSON = JSON.parse(sendedJSON);
  sendedJSON.forEach((element) => {
    if (element.path) {
      let btnDel = document.createElement("BUTTON");
      let btnGo = document.createElement("BUTTON");
      btnDel.innerHTML = "X";
      btnDel.setAttribute("onClick", "SomeDeleteRowFunction(this)");
      btnGo.innerHTML = "Go!";
      btnGo.setAttribute("onClick", "sendConnection(this)");
      let row = table.insertRow(-1);
      row.style.fontSize = "smaller";
      let cell1 = row.insertCell(0);
      let cell2 = row.insertCell(1);
      let cell3 = row.insertCell(2);
      let cell4 = row.insertCell(3);
      let cell5 = row.insertCell(4);
      let cell6 = row.insertCell(5);
      let cell7 = row.insertCell(6);
      let cell8 = row.insertCell(7);
      let cell9 = row.insertCell(8);
      let cell10 = row.insertCell(9);
      let cell11 = row.insertCell(10);
      cell1.innerHTML = element.path;
      cell1.contentEditable = true;
      cell1.onblur = function () {
        changedPath(this.parentNode.rowIndex);
      };
      cell1.title = "click Go! button for changes to take effect";
      cell2.innerHTML = "----";
      cell3.innerHTML = element.factor;
      cell4.innerHTML = "----";
      cell5.innerHTML = element.address;
      cell5.contentEditable = true;
      cell5.onblur = function () {
        changed(this.parentNode.rowIndex);
      };
      cell6.appendChild(btnGo);
      cell6.appendChild(btnDel);
      cell7.innerHTML = element.type;

      if (element.math == "lin") {
        cell8.innerHTML =
          `<select onChange="changed(this.parentNode.parentNode.rowIndex)">
      <option value="` +
          element.math +
          `" selected >` +
          element.math +
          `</option>
      <option value="log">log</option>
      </select>`;
      } else if (element.math == "log") {
        cell8.innerHTML =
          `<select onChange="changed(this.parentNode.parentNode.rowIndex)">
      <option value="` +
          element.math +
          `" selected >` +
          element.math +
          `</option>
      <option value="lin">lin</option>
      </select>`;
      } else if (element.math == "") {
        cell8.innerHTML = `<select>
      <option value="" selected class="without_icon"></option>
      </select>`;
      }
      if (element.factor !== "") {
        cell9.innerHTML =
          element.min.split("/")[0] +
          "/" +
          `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value=` +
          (Number(element.min.split("/")[0]) / Number(element.factor)).toFixed(
            0
          ) +
          `>`;
        cell11.innerHTML =
          element.max.split("/")[0] +
          "/" +
          `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value=` +
          (Number(element.max.split("/")[0]) / Number(element.factor)).toFixed(
            0
          ) +
          `>`;
      } else {
        cell9.innerHTML =
          element.min.split("/")[0] +
          "/" +
          `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="0">`;
        cell11.innerHTML =
          element.max.split("/")[0] +
          "/" +
          `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="1">`;
      }
      cell10.innerHTML = "-";
      cell3.style.fontSize = "x-small";
      cell7.style.fontSize = "x-small";
      cell8.style.fontSize = "x-small";
      cell9.style.fontSize = "x-small";
      cell11.style.fontSize = "x-small";
    }
  });
});

ipcRenderer.on("autoSave", (e) => {
  table = document.getElementById("tableOfConnection");
  data = [];
  let headers = [];
  for (i = 0; i < table.rows[1].cells.length; i++) {
    headers[i] = table.rows[1].cells[i].innerHTML
      .toLowerCase()
      .replace(/ /gi, "");
  }
  // go through cells
  for (i = 2; i < table.rows.length; i++) {
    let tableRow = table.rows[i];
    let rowData = {};
    let x = [0, 2, 4, 6];
    x.forEach((item) => {
      rowData[headers[item]] = tableRow.cells[item].innerHTML;
    });
    if (tableRow.cells[7].firstElementChild) {
      let selected = tableRow.cells[7].firstElementChild.value;
      rowData[headers[7]] = selected;
    } else {
      rowData[headers[7]] = "";
    }
    let emin = tableRow.cells[8].innerHTML.split(`<`)[0];
    let omin = tableRow.cells[8].firstElementChild.value;
    let mins = (emin + omin).replace(/\s/g, "");
    rowData[headers[8]] = mins;
    let emax = tableRow.cells[10].innerHTML.split(`<`)[0];
    let omax = tableRow.cells[10].firstElementChild.value;
    let maxs = (emax + omax).replace(/\s/g, "");
    rowData[headers[10]] = maxs;
    data.push(rowData);
  }
  let content = JSON.stringify(data, null, 2);
  ipcRenderer.send("sendAutoSave", content, autoSave);
});

ipcRenderer.on("appVersion", (e, appVersion) => {
  document.getElementById("appVersion").innerHTML =
    document.getElementById("appVersion").innerHTML + appVersion;
  logRenderer("appVersion:" + appVersion);
});

ipcRenderer.on("autoGo", (e) => {
  sendAllConnections();
});

//-----------------------------------------//
function changed(myRow) {
  table = document.getElementById("tableOfConnection");
  line = table.rows[myRow];
  line.cells[4].innerHTML = line.cells[4].innerHTML.replace("&nbsp;", " ");
  console.log("there's a changed on line", myRow, line.cells[0].innerHTML);
  ipcRenderer.send(
    "reSendOrArgs",
    line.cells[3].innerHTML,
    line.cells[0].innerHTML,
    line.cells[2].innerHTML,
    line.cells[6].innerHTML,
    line.cells[8].innerHTML.split("<")[0].replace(/\//, ""),
    line.cells[10].innerHTML.split("<")[0].replace(/\//, ""),
    line.cells[8].firstElementChild.value,
    line.cells[10].firstElementChild.value,
    line.cells[7].firstElementChild.value,
    myRow,
    line.cells[9].innerHTML,
    table.rows.length
  );
}

function changedPath(myRow) {
  console.log("🚀 : file: renderer.js:545 : changedPath : myRow:", myRow);
  table = document.getElementById("tableOfConnection");
  line = table.rows[myRow];
  line.cells[0].innerHTML = line.cells[0].innerHTML.replace("&nbsp;", " ");
  let emberP = line.cells[0].innerHTML;
  if (emberP.indexOf("/") > -1) {
    if (emberP.charAt(0) == "/") {
      emberP = emberP.substring(1);
      emberP = emberP.replaceA(/\//g, ".");
    } else {
      emberP = emberP.replace(/\//g, ".");
    }
  }
  line.cells[0].innerHTML = emberP;
  ipcRenderer.send(
    "newConnection",
    line.cells[0].innerHTML,
    line.cells[4].innerHTML,
    myRow,
    line.cells[6].innerHTML,
    line.cells[2].innerHTML,
    line.cells[8].innerHTML.split("<")[0].replace(/\//, ""),
    line.cells[10].innerHTML.split("<")[0].replace(/\//, ""),
    line.cells[8].firstElementChild.value,
    line.cells[10].firstElementChild.value,
    line.cells[7].firstElementChild.value,
    line.cells[9].innerHTML,
    table.rows.length
  );
}

function logRenderer(msg) {
  let date = new Date();
  date =
    date.getHours() +
    ":" +
    (date.getMinutes() < 10 ? "0" : "") +
    date.getMinutes() +
    ":" +
    (date.getSeconds() < 10 ? "0" : "") +
    date.getSeconds() +
    "-->";
  document
    .getElementById("logging")
    .insertAdjacentHTML("beforeend", date + msg + "<br>");
  scrollToBottom();
}

function addGenBtns() {
  let table = document.getElementById("tableOfConnection");
  let btnSuscribeAll = document.createElement("BUTTON");
  let btnDeleteAll = document.createElement("BUTTON");
  btnDeleteAll.innerHTML = "&darr;X";
  btnDeleteAll.setAttribute("onClick", "deleteAllRows(this)"); //function not created yet
  btnSuscribeAll.innerHTML = "Go&darr;";
  btnSuscribeAll.setAttribute("onClick", "sendAllConnections(this)");
  table.rows[1].cells[5].appendChild(btnSuscribeAll);
  table.rows[1].cells[5].appendChild(btnDeleteAll);
}

function makeVisible(op) {
  document.getElementById(op).style.visibility = "visible";
}

function addemptyrow(event) {
  let btnDel = document.createElement("BUTTON");
  let btnGo = document.createElement("BUTTON");
  let emBerPath = "";
  let oscAddr = "";
  btnDel.innerHTML = "X";
  btnDel.setAttribute("onClick", "SomeDeleteRowFunction(this)");
  btnGo.innerHTML = "Go!";
  btnGo.setAttribute("onClick", "sendConnection(this)");
  let table = document.getElementById("tableOfConnection");
  let row = table.insertRow(-1);
  row.style.fontSize = "smaller";
  let cell1 = row.insertCell(0);
  let cell2 = row.insertCell(1);
  let cell3 = row.insertCell(2);
  let cell4 = row.insertCell(3);
  let cell5 = row.insertCell(4);
  let cell6 = row.insertCell(5);
  let cell7 = row.insertCell(6);
  let cell8 = row.insertCell(7);
  let cell9 = row.insertCell(8);
  let cell10 = row.insertCell(9);
  let cell11 = row.insertCell(10);
  cell1.innerHTML = emBerPath;
  cell1.contentEditable = true;
  cell1.onblur = function () {
    changedPath(this.parentNode.rowIndex);
  };
  cell1.title = "click Go! button for changes to take effect";
  cell2.innerHTML = "----";
  cell3.innerHTML = "";
  cell4.innerHTML = "----";
  cell5.innerHTML = "";
  cell5.contentEditable = true;
  cell5.onblur = function () {
    changed(this.parentNode.rowIndex);
  };
  cell6.appendChild(btnGo);
  cell6.appendChild(btnDel);
  cell7.innerHTML = "----";
  cell8.innerHTML = `<select><option value="" selected class="without-icon"></option></select>`;
  cell9.innerHTML =
    " /" +
    `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="">`;
  cell11.innerHTML =
    " /" +
    `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="">`;
  cell10.innerHTML = "-";
  cell3.style.fontSize = "x-small";
  cell7.style.fontSize = "x-small";
  cell8.style.fontSize = "x-small";
  cell9.style.fontSize = "x-small";
  cell11.style.fontSize = "x-small";
  if (table.rows.length == 3) {
    if (table.rows[1].cells[5].innerHTML == "") {
      addGenBtns();
    }
  }
  event.preventDefault();
}

function submitPath(event) {
  console.log(
    "🚀 : file: renderer.js:838 : submitPath : tree.getSelectedNodes():",
    tree.getSelectedNodes()
  );
  console.log("stringPath : line813 : ", stringPath);
  let thisType = innerPath.contents.type;
  if (thisType == "PARAMETER") {
    pathType = innerPath.contents.parameterType;
    eVarType = pathType[0].toUpperCase() + pathType.substring(1).toLowerCase();
    let eVarMin = "";
    let eVarMax = "";
    let eVarFactor = "";
    if (pathType == "INTEGER") {
      eVarCurve = "lin";
      eVarMin = innerPath.contents.minimum;
      eVarMax = innerPath.contents.maximum;
      if (innerPath.contents.format) {
        if (innerPath.contents.format.includes("dB") == true) {
          eVarCurve = "log";
        }
      }
      if (innerPath.contents.factor !== undefined) {
        eVarFactor = innerPath.contents.factor;
      } else {
        eVarFactor = 1;
      }
    } else if (pathType == "BOOLEAN") {
      eVarCurve = "";
      eVarMin = false;
      eVarMax = true;
    } else if (pathType == "ENUM" || pathType == "REAL") {
      eVarCurve = "lin";
      eVarMin = innerPath.contents.minimum;
      eVarMax = innerPath.contents.maximum;
      eVarFactor = 1;
    } else {
      eVarCurve = "";
      eVarMin = 0;
      eVarMax = 1;
    }
    let btnDel = document.createElement("BUTTON");
    let btnGo = document.createElement("BUTTON");
    let emBerPath = stringPath;
    let OSCpath = "/" + stringPath.replaceAll(".", "/").replaceAll(" ", "_");
    btnDel.innerHTML = "X";
    btnDel.setAttribute("onClick", "SomeDeleteRowFunction(this)");
    btnGo.innerHTML = "Go!";
    btnGo.setAttribute("onClick", "sendConnection(this)");
    let table = document.getElementById("tableOfConnection");
    let row = table.insertRow(-1);
    row.style.fontSize = "smaller";
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    let cell3 = row.insertCell(2);
    let cell4 = row.insertCell(3);
    let cell5 = row.insertCell(4);
    let cell6 = row.insertCell(5);
    let cell7 = row.insertCell(6);
    let cell8 = row.insertCell(7);
    let cell9 = row.insertCell(8);
    let cell10 = row.insertCell(9);
    let cell11 = row.insertCell(10);
    cell1.innerHTML = emBerPath;
    cell1.contentEditable = true;
    cell1.onblur = function () {
      changedPath(this.parentNode.rowIndex);
    };
    if (innerPath.contents.description !== undefined) {
      cell1.title = innerPath.contents.description;
    } else {
      cell1.title = innerPath.contents.identifier;
    }
    cell2.innerHTML = innerPath.contents.value;
    cell3.innerHTML = eVarFactor;
    cell4.innerHTML = "----";
    cell5.innerHTML = OSCpath;
    cell5.contentEditable = true;
    cell5.onblur = function () {
      changed(this.parentNode.rowIndex);
    };
    cell6.appendChild(btnGo);
    cell6.appendChild(btnDel);

    cell7.innerHTML = eVarType;
    if (eVarCurve == "lin") {
      cell8.innerHTML =
        `<select onChange="changed(this.parentNode.parentNode.rowIndex)">
      <option value="` +
        eVarCurve +
        `" selected >` +
        eVarCurve +
        `</option>
      <option value="log">log</option>
      </select>`;
    } else if (eVarCurve == "log") {
      cell8.innerHTML =
        `<select onChange="changed(this.parentNode.parentNode.rowIndex)">
      <option value="` +
        eVarCurve +
        `" selected >` +
        eVarCurve +
        `</option>
      <option value="lin">lin</option>
      </select>`;
    } else if (eVarCurve == "") {
      cell8.innerHTML = `<select>
  <option value="" selected class="without-icon"></option>
  </select>`;
    }
    if (eVarFactor !== "") {
      cell9.innerHTML =
        eVarMin +
        "/" +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value=` +
        (Number(eVarMin) / Number(eVarFactor)).toFixed(0) +
        `>`;
      cell11.innerHTML =
        eVarMax +
        "/" +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value=` +
        (Number(eVarMax) / Number(eVarFactor)).toFixed(0) +
        `>`;
    } else {
      cell9.innerHTML =
        eVarMin +
        "/" +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="0">`;
      cell11.innerHTML =
        eVarMax +
        "/" +
        `<input onChange="changed(this.parentNode.parentNode.rowIndex)" type="number" value="1">`;
    }
    cell10.innerHTML = "-";
    cell3.style.fontSize = "x-small";
    cell7.style.fontSize = "x-small";
    cell8.style.fontSize = "x-small";
    cell9.style.fontSize = "x-small";
    cell11.style.fontSize = "x-small";
    if (table.rows.length == 3) {
      if (table.rows[1].cells[5].innerHTML == "") {
        addGenBtns();
      }
    }
  } else if (thisType == "FUNCTION") {
    eVarType = thisType[0].toUpperCase() + thisType.substring(1).toLowerCase();
    console.log(
      "🚀 : file: renderer.js:995 : submitPath : eVarType:",
      eVarType
    );
    let OSCpath = "/" + stringPath.replaceAll(".", "/").replaceAll(" ", "_");
    let eVarMin = "0";
    let eVarMax = "1";
    let eVarFactor = "1";
    let eVarCurve = "invoke";
    let btnDel = document.createElement("BUTTON");
    let btnGo = document.createElement("BUTTON");
    btnDel.innerHTML = "X";
    btnDel.setAttribute("onClick", "SomeDeleteRowFunction(this)");
    btnGo.innerHTML = "Go!";
    btnGo.setAttribute("onClick", "sendConnection(this)");
    let table = document.getElementById("tableOfConnection");
    let row = table.insertRow(-1);
    row.style.fontSize = "smaller";
    let cell1 = row.insertCell(0);
    let cell2 = row.insertCell(1);
    let cell3 = row.insertCell(2);
    let cell4 = row.insertCell(3);
    let cell5 = row.insertCell(4);
    let cell6 = row.insertCell(5);
    let cell7 = row.insertCell(6);
    let cell8 = row.insertCell(7);
    let cell9 = row.insertCell(8);
    let cell10 = row.insertCell(9);
    let cell11 = row.insertCell(10);
    cell1.innerHTML = stringPath;
    cell1.contentEditable = true;
    cell1.onblur = function () {
      changedPath(this.parentNode.rowIndex);
    };
    cell2.innerHTML = "----";
    cell3.innerHTML = eVarFactor;
    cell4.innerHTML = "----";
    cell5.innerHTML = OSCpath;
    cell5.contentEditable = true;
    cell5.onblur = function () {
      changed(this.parentNode.rowIndex);
    };
    cell6.appendChild(btnGo);
    cell6.appendChild(btnDel);
    cell7.innerHTML = eVarType;
    cell8.innerHTML = `<select>
  <option value="" selected class="without-icon">invoke</option>
  </select>`;
    cell9.innerHTML = eVarMin + "/" + "<span>0</span>";
    cell10.innerHTML = "-";
    cell11.innerHTML = eVarMax + "/" + "<span>1</span>";
    cell3.style.fontSize = "x-small";
    cell7.style.fontSize = "x-small";
    cell8.style.fontSize = "x-small";
    cell9.style.fontSize = "x-small";
    cell11.style.fontSize = "x-small";
    if (table.rows.length == 3) {
      if (table.rows[1].cells[5].innerHTML == "") {
        addGenBtns();
      }
    }
  }
  // event.preventDefault();
}

function SomeDeleteRowFunction(o) {
  let table = document.getElementById("tableOfConnection");
  if (typeof o == "number") {
    let myRow = o;
    let ePath = table.rows[myRow].cells[0].innerHTML;
    let oAddr = table.rows[myRow].cells[4].innerHTML;
    let eVarFactor = table.rows[myRow].cells[2].innerHTML;
    let eVarType = table.rows[myRow].cells[6].innerHTML;
    ipcRenderer.send(
      "deleteConnection",
      ePath,
      oAddr,
      myRow,
      eVarType,
      eVarFactor
    );
    table.deleteRow(o);
    logRenderer("delete Row number: " + o);
  } else {
    let p = o.parentNode.parentNode;
    myRow = p.rowIndex;
    logRenderer(myRow);
    let ePath = table.rows[myRow].cells[0].innerHTML;
    let oAddr = table.rows[myRow].cells[4].innerHTML;
    let eVarFactor = table.rows[myRow].cells[2].innerHTML;
    let eVarType = table.rows[myRow].cells[6].innerHTML;
    ipcRenderer.send(
      "deleteConnection",
      ePath,
      oAddr,
      myRow,
      eVarType,
      eVarFactor
    );
    p.parentNode.removeChild(p);
    logRenderer("delete row number: " + myRow);
  }
}

function deleteAllRows(o) {
  const table = document.getElementById("tableOfConnection");
  let numOfConn = table.rows.length;
  for (x = numOfConn - 1; x > 1; x--) {
    setTimeout(() => {
      SomeDeleteRowFunction(table.rows.length - 1);
    }, x * 25);
  }
}

function sendConnection(o) {
  //  logRenderer("ooooo : "+ o)
  var table = document.getElementById("tableOfConnection");
  if (typeof o == "number") {
    myRow = o;
  } else {
    var p = o.parentNode.parentNode;
    myRow = p.rowIndex;
  }
  //  logRenderer("myrow : "+myRow);
  let ePath = table.rows[myRow].cells[0].innerHTML;
  let oAddr = table.rows[myRow].cells[4].innerHTML;
  console.log("🚀 : file: renderer.js:1184 : sendConnection : oAddr:", oAddr);
  let eVarFactor = table.rows[myRow].cells[2].innerHTML;
  let eVarType = table.rows[myRow].cells[6].innerHTML;
  let eMin = table.rows[myRow].cells[8].innerHTML
    .split(`<`)[0]
    .replace("/", "");
  console.log("emin new connection: ", eMin);
  let eMax = table.rows[myRow].cells[10].innerHTML
    .split(`<`)[0]
    .replace("/", "");
  let oMin = table.rows[myRow].cells[8].firstElementChild.value;
  if (typeof oMin === "undefined") {
    oMin2 = eMin;
  }
  oMax = table.rows[myRow].cells[10].firstElementChild.value;
  if (typeof oMax === "undefined") {
    oMax = eMax;
  }
  let eVarCurve = table.rows[myRow].cells[7].firstElementChild.value;
  let direction = table.rows[myRow].cells[9].innerHTML;
  //  logRenderer("Math innerhtml:"+ eVarCurve)
  //  logRenderer("epath in newconnectionR:"+ ePath)
  ipcRenderer.send(
    "newConnection",
    ePath,
    oAddr,
    myRow,
    eVarType,
    eVarFactor,
    eMin,
    eMax,
    oMin,
    oMax,
    eVarCurve,
    direction,
    table.rows.length
  );
}

function sendAllConnections() {
  var table = document.getElementById("tableOfConnection");
  for (i = 2; i < table.rows.length; i++) {
    (function (n) {
      setTimeout(() => {
        sendConnection(n);
      }, 25);
    })(i);
  }
}

//function selectedOption(slct) {
//  slct = document.getElementById(slct);
//  if (slct.options[slct.selectedIndex].title !== "") {
//    let details = slct.options[slct.selectedIndex].title;
//    let detailsArray = details.split("\n");
//    eVarType = detailsArray[0];
//    eVarMin = "false";
//    eVarMax = "true";
//    eVarFactor = "";
//    eVarCurve = "";
//    if (detailsArray[0] !== "Boolean") {
//      eVarMin = detailsArray[1].split(":")[1];
//      eVarMax = detailsArray[2].split(":")[1];
//      eVarFactor = detailsArray[3].split(":")[1];
//      eVarCurve = detailsArray[5].split(":")[1];
//    }
//    if (detailsArray[4] !== "-") {
//      eVarEnum = detailsArray[4];
//    } else {
//      eVarEnum = "";
//    }
//  }
//}

//---Menu Section---//

function saveAs(saveAsBtn) {
  table = document.getElementById("tableOfConnection");
  let data = [];
  let headers = [];
  for (i = 0; i < table.rows[1].cells.length; i++) {
    headers[i] = table.rows[1].cells[i].innerHTML
      .toLowerCase()
      .replace(/ /gi, "");
  }
  // go through cells
  for (i = 2; i < table.rows.length; i++) {
    let tableRow = table.rows[i];
    let rowData = {};
    let x = [0, 2, 4, 6];
    x.forEach((item) => {
      rowData[headers[item]] = tableRow.cells[item].innerHTML;
    });
    if (tableRow.cells[7].firstElementChild) {
      let selected = tableRow.cells[7].firstElementChild.value;
      rowData[headers[7]] = selected;
    } else {
      rowData[headers[7]] = "";
    }
    let emin = tableRow.cells[8].innerHTML.split(`<`)[0].replace("/", "");
    let omin = tableRow.cells[8].firstElementChild.value;
    let mins = (emin + "/" + omin).replace(/\s/g, "");
    rowData[headers[8]] = mins;
    let emax = tableRow.cells[10].innerHTML.split(`<`)[0].replace("/", "");
    let omax = tableRow.cells[10].firstElementChild.value;
    let maxs = (emax + "/" + omax).replace(/\s/g, "");
    rowData[headers[10]] = maxs;
    data.push(rowData);
  }
  let content = JSON.stringify(data, null, 2);
  logRenderer("contentsended:" + content);
  ipcRenderer.send("sendSaveAs", content);
}

function save(saveBtn) {
  table = document.getElementById("tableOfConnection");
  let data = [];
  let headers = [];
  for (i = 0; i < table.rows[1].cells.length; i++) {
    headers[i] = table.rows[1].cells[i].innerHTML
      .toLowerCase()
      .replace(/ /gi, "");
  }
  // go through cells
  for (i = 2; i < table.rows.length; i++) {
    let tableRow = table.rows[i];
    let rowData = {};
    let x = [0, 2, 4, 6];
    x.forEach((item) => {
      rowData[headers[item]] = tableRow.cells[item].innerHTML;
    });
    if (tableRow.cells[7].firstElementChild) {
      let selected = tableRow.cells[7].firstElementChild.value;
      rowData[headers[7]] = selected;
    } else {
      rowData[headers[7]] = "";
    }
    let emin = tableRow.cells[8].innerHTML.split(`<`)[0];
    let omin = tableRow.cells[8].firstElementChild.value;
    let mins = (emin + omin).replace(/\s/g, "");
    rowData[headers[8]] = mins;
    let emax = tableRow.cells[10].innerHTML.split(`<`)[0];
    let omax = tableRow.cells[10].firstElementChild.value;
    let maxs = (emax + omax).replace(/\s/g, "");
    rowData[headers[10]] = maxs;
    data.push(rowData);
  }
  let content = JSON.stringify(data, null, 2);
  let filename = document.getElementById("filepath").innerHTML;
  if (filename !== "") {
    ipcRenderer.send("sendSave", content, filename);
  } else {
    saveAs();
  }
}

function load(loadBtn) {
  ipcRenderer.send("openFile");
  let table = document.getElementById("tableOfConnection");
  let genBtn = table.rows[1].cells[5].innerHTML;
  if (genBtn == "") {
    addGenBtns();
  }
}

function prefs(preferencesBtn) {
  ipcRenderer.send("showPreferences");
}

function menu() {
  let menu = document.getElementById("menu").querySelectorAll(".button");
  let menuDiv = document.getElementById("menu");
  logRenderer("menubkgcolor" + menuDiv.style.backgroundColor);
  if (menuDiv.style.backgroundColor === "rgb(71, 73, 108)") {
    menuDiv.style.backgroundColor = "rgb(40, 44, 52)";
  } else {
    menuDiv.style.backgroundColor = "rgb(71, 73, 108)";
  }
  for (i = 1; i < menu.length; i++) {
    if (menu[i].style.display === "none") {
      menu[i].style.display = "flex";
    } else {
      menu[i].style.display = "none";
    }
  }
}

function viewlogs() {
  let logs = document.getElementById("logging");
  if (logs.style.visibility === "hidden") {
    logs.style.visibility = "visible";
    logs.style.maxHeight = "150px";
  } else {
    logs.style.visibility = "hidden";
    logs.style.maxHeight = "1px";
  }
  let clearlogs = document.getElementById("clearlogs");
  if (clearlogs.style.visibility === "hidden") {
    clearlogs.style.visibility = "visible";
    clearlogs.style.height = "20px";
  } else {
    clearlogs.style.visibility = "hidden";
    clearlogs.style.height = "1px";
  }
  let deploy = document.getElementById("viewlogs");
  if (deploy.innerHTML == "►") {
    deploy.innerHTML = "▼";
  } else {
    deploy.innerHTML = "►";
  }
}

function tableToJson(table) {
  let data = [];
  let headers = [];
  for (i = 0; i < table.rows[1].cells.length; i++) {
    headers[i] = table.rows[1].cells[i].innerHTML
      .toLowerCase()
      .replace(/ /gi, "");
  }
  // go through cells
  for (i = 2; i < table.rows.length; i++) {
    let tableRow = table.rows[i];
    let rowData = {};
    for (j = 0; j < tableRow.cells.length; j++) {
      rowData[headers[j]] = tableRow.cells[j].innerHTML;
    }
    data.push(rowData);
  }
  tableData = JSON.stringify(data, null, 2);
}

function clearLog() {
  document.getElementById("logging").innerHTML = '<div id="anchor"></div>';
}

//---tabulator---//
ipcRenderer.on("ready", (e) => {
  var treeContainer = document.getElementById("tree");
  //var l1 =

  tree.setContainer(treeContainer);
  tree.reload();
  //let tabul = document.getElementById('tabulator')
  ////let tabul = document.getElementById('tableOfConnection')
  //var mytable = new Tabulator(tabul,{
  //  reactiveData : true,
  //  data: tableData,
  //  layout: "fitColumns",
  //  columns:[
  //    {title: "Path", field:"path", editor:"input"},
  //    {title: "Ember+Value", field:"ember+value"},
  //    {title: "Factor", field:"factor"},
  //    {title: "OSCvalue", field:"oscValue"},
  //    {title: "Address", field:"address", editor:"input"},
  //    {title: "GO/X", field:"go_x",formatter: "html",},
  //    {title: "Type", field:"type", formatter: "html"},
  //    {title: "Math", field:"math", formatter: "html"},
  //    {title: "Min", field:"min", formatter: "html"},
  //    {title: "Direction", field:"direction", formatter: "html"},
  //    {title: "Max", field:"max", formatter: "html"},
  //
  //  ],
  //})
});

function reactivity_add() {
  tableData.push({
    go_x: '<button type="button" onclick="sendConnection(this)">GO!</button><button type="button" onclick="SomeDeleteRowFunction(this)">X</button>',
  });
}

function getNodePathToRoot(node) {
  let parentNode = node.parent;

  if (typeof parentNode === "undefined") {
    return [node];
  }

  return getNodePathToRoot(parentNode).concat([node]);
}

async function createMatrixView(mtx_path, targets, sources, connections) {
  await targets;
  await sources;
  await connections;
  let matrixView = document.createElement("table");
  matrixView.style.overflow = "auto";
  matrixView.style.tableLayout = "fixed";
  matrixView.style.width = "100%";
  matrixView.style.whiteSpace = "nowrap";
  matrixView.style.border = "1px";
  matrixView.id = "mtx_table";
  let headerRow = matrixView.insertRow(-1);
  let cross = document.createElement("th");
  cross.style.position = "sticky";
  cross.style.rotate = "-45deg";
  cross.style.top = "-5px";
  cross.style.left = "0px";
  cross.style.height = "30px";
  cross.style.width = "30px";
  cross.innerHTML = "&#x269E;";
  headerRow.appendChild(cross);
  let lastConnection =
    Object.keys(connections)[Object.keys(connections).length - 1];
  console.log("🚀 : file: renderer.js:1441 : lastConnection:", lastConnection);

  try {
    for (i = 0; i < lastConnection && i < 201; i++) {
      //   if (i.toString() in connections) {
      //    for (i in connections) {
      //      i = Number(i);
      //      if (i < 201) {
      console.log("🚀 : file: renderer.js:1442 : createMatrixView : i:", i);
      let horHeaderCell = document.createElement("th");
      horHeaderCell.innerHTML =
        '<span style="-webkit-transform: rotate(-90deg);display: inline-block;">' +
        "t-" +
        i.toString() +
        "</span>";
      //horHeaderCell.style.transform = "rotate(-45deg)";
      horHeaderCell.style.height = "20px";
      horHeaderCell.style.width = "20px";
      horHeaderCell.firstChild.style.color = "black";
      horHeaderCell.style.background = "grey";
      //horHeaderCell.style.borderRadius = "5px";
      //horHeaderCell.addEventListener("contextmenu", (e) => {
      //  e.preventDefault();
      //});
      headerRow.appendChild(horHeaderCell);
      //      }
    }
  } catch (error) {
    console.log(
      "🚀 : file: renderer.js:1457 : createMatrixView : error:",
      error
    );
  }
  try {
    for (j = 0; j < sources && j < 201; j++) {
      console.log("🚀 : file: renderer.js:1465 : createMatrixView : j:", j);
      let vertHeaderCell = document.createElement("th");
      let newRow = matrixView.insertRow(-1);
      vertHeaderCell.innerHTML = "s-" + j.toString();
      vertHeaderCell.style.width = "20px";
      vertHeaderCell.style.height = "20px";
      vertHeaderCell.style.color = "black";
      vertHeaderCell.style.background = "grey";
      newRow.appendChild(vertHeaderCell);
      newRow.firstChild.style.position = "sticky";
      newRow.firstChild.style.left = "0px";

      //let otherCell = document.createElement("td");
      //otherCell.style.width = "20px";
      //otherCell.innerHTML =
      //  "<input type='checkbox' style='width:100%;height:100%;z-index:-1;' unchecked >";
      try {
        for (k = 0; k < lastConnection && k < 201; k++) {
          //  if (k.toString() in connections) {
          //for (k in connections) {
          //  k = Number(k);
          //  if (k < 201) {
          console.log("🚀 : file: renderer.js:1477 : createMatrixView : k:", k);
          let otherCell = newRow.insertCell(k + 1);
          otherCell.style.width = "20px";
          //
          if (k in connections) {
            otherCell.innerHTML =
              "<input type='checkbox' style='width:100%;height:100%;z-index:-1;' unchecked >";
            ////
            //onclick = 'check_uncheck(this,`" +
            //  mtx_path +
            //  "`)'>";
            //otherCell.firstChild.style.zIndex = "-1";
            //newRow.appendChild(otherCell);
          }
        }
      } catch (error) {
        console.log(
          "🚀 : file: renderer.js:1500 : createMatrixView : error:",
          error
        );
      }
    }
  } catch (error) {
    console.log(
      "🚀 : file: renderer.js:1487 : createMatrixView : error:",
      error
    );
  }
  headerRow.style.position = "sticky";
  headerRow.style.top = "0px";
  try {
    for (t in connections) {
      console.log(
        "🚀 : file: renderer.js:1375 : createMatrixView : item:",
        connections[t]
      );
      if (connections[t].sources !== []) {
        for (s in connections[t].sources) {
          console.log(
            "🚀 : file: renderer.js:1381 : createMatrixView : s :",
            s
          );
          if (
            matrixView.rows[connections[t].sources[s] + 1] != undefined &&
            matrixView.rows[connections[t].sources[s] + 1].cells[
              connections[t].target + 1
            ] != undefined
          ) {
            let xcell =
              matrixView.rows[connections[t].sources[s] + 1].cells[
                connections[t].target + 1
              ];
            xcell.style.textAlign = "center";
            xcell.innerHTML =
              "<input type='checkbox' style='width:100%;height:100%;z-index=-1' checked >";
            //onclick = 'check_uncheck(this,`" +
            //  mtx_path +
            //  "`)'>";
          }
        }
      }
    }
  } catch (error) {
    console.log(
      "🚀 : file: renderer.js:1518 : createMatrixView : error:",
      error
    );
  }
  matrixView.onclick = function (event) {
    let clicked = event.target.closest("td");
    if (clicked.firstChild.checked) {
      let checkbox = clicked.firstChild;
      if (checkbox.checked == true) {
        checkbox.checked == false;
        check_uncheck(checkbox, mtx_path);
      } else {
        checkbox.checked == true;
        check_uncheck(checkbox, mtx_path);
      }
    }
  };
  let matrix_container = document.getElementById("central_view");
  try {
    matrix_container.appendChild(matrixView);
  } catch (error) {
    console.log(
      "🚀 : file: renderer.js:1544 : createMatrixView : error:",
      error
    );
  }
}

function check_uncheck(checkbox, mtx_path) {
  let m_table = document.getElementById("mtx_table");
  console.log("mtx-table-length: ", m_table.rows.length);
  let checkbox_cell = checkbox.parentNode.cellIndex;
  console.log(
    "🚀 : file: renderer.js:1486 : check_uncheck : checkbox_cell:",
    checkbox_cell
  );
  let checkbox_row = checkbox.parentNode.parentNode.rowIndex;
  console.log(
    "🚀 : file: renderer.js:1486 : check_uncheck : checkbox_row:",
    checkbox_row
  );
  console.log(
    "🚀 : file: renderer.js:1485 : check_uncheck : this:",
    checkbox.checked
  );
  let check_t = checkbox_cell - 1;
  let check_s = [];

  for (i = 1; i < m_table.rows.length; i++) {
    console.log("🚀 : file: renderer.js:1505 : check_uncheck : row:", i);
    if (m_table.rows[i].cells[checkbox_cell].firstChild.checked == true) {
      check_s.push(i - 1);
    }
  }
  console.log(
    "🚀 : file: renderer.js:1503 : check_uncheck : check_s :",
    check_s
  );
  ipcRenderer.send("mtx_connect", mtx_path, check_t, check_s);
}
