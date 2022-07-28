//const { ipcRenderer, remote } = require('electron');
const { ipcRenderer } = require('electron')
const preferences = ipcRenderer.sendSync('getPreferences');
const log = require('electron-log');
function logDefinition() {
  console.log = log.log;
  Object.assign(console, log.functions);
  log.transports.console.format = '{h}:{i}:{s} / {text}';
}
logDefinition();

log.transports.div = log.transports.console


const oscAddr = new Array("/Channels")

//---Interactions with Back-End---//
let rInputsUserLabels = [];
let rAuxesUserLabels = [];
let rMastersUserLabels = [];
let rSumsUserLabels = [];
let rGpcsUserLabels = [];
const autoSave = null;

// Display the preferences window
//ipcRenderer.send('showPreferences');

// Listen to the `preferencesUpdated` event to be notified when preferences are changed.
ipcRenderer.on('preferencesUpdated', (e, preferences) => {
  console.log('Preferences were updated', preferences);
});

// Instruct the preferences service to update the preferences object from within the renderer.
//ipcRenderer.sendSync('setPreferences', { ... });




ipcRenderer.on('inputsUserLabels', (event, inputsUserLabels) => {
  rInputsUserLabels = inputsUserLabels
})
ipcRenderer.on('auxesUserLabels', (event, auxesUserLabels) => {
  rAuxesUserLabels = auxesUserLabels
})
ipcRenderer.on('mastersUserLabels', (event, mastersUserLabels) => {
  rMastersUserLabels = mastersUserLabels
})
ipcRenderer.on('sumsUserLabels', (event, sumsUserLabels) => {
  rSumsUserLabels = sumsUserLabels
})
ipcRenderer.on('gpcsUserLabels', (event, gpcsUserLabels) => {
  rGpcsUserLabels = gpcsUserLabels
})

ipcRenderer.on('udpportOK', (event, uPort) => {
  let add2 = document.getElementById('add2');
  add2.removeChild(add2.firstChild);
  add2.textContent = "Listening on port : " + uPort;
  let dot2 = document.getElementById('dot2');
  dot2.style.color = "green";
  dot2.classList.remove('blink')
  add2.style.color = "green";
  add2.classList.remove('blink')
});


ipcRenderer.on('eServerOK', (event, eAddress) => {
  let add1 = document.getElementById('add1');
  if(add1.firstChild){
  add1.removeChild(add1.firstChild)};
  add1.textContent = "Connected to " + eAddress;
  let dot1 = document.getElementById('dot1');
  dot1.style.color = "green";
  dot1.classList.remove('blink')
  add1.style.color = "green";
  add1.classList.remove('blink')
})


ipcRenderer.on('oServerOK', (event, oAddress) => {
  let add3 = document.getElementById('add3');
  add3.removeChild(add3.firstChild);
  add3.textContent = "Connected to " + oAddress;
  let dot3 = document.getElementById("dot3");
  dot3.style.color = "green";
  dot3.classList.remove('blink')
  add3.style.color = "green";
  add3.classList.remove('blink')
})

ipcRenderer.on('udpportKO', (event, msg) => {
  let add2 = document.getElementById('add2');
  add2.removeChild(add2.firstChild);
  add2.textContent = "An Error ocurred :" + msg;
  let dot2 = document.getElementById('dot2');
  dot2.style.color = "red";
  dot2.classList.add('blink')
  add2.style.color = "red";
  add2.classList.add('blink')
});

ipcRenderer.on('eServConnError', function (event, eAddress) {
  console.log("erreur de connection ember+")
  let add1Error = document.getElementById("add1");
  let dot1Error = document.getElementById("dot1");
  add1Error.innerHTML = "Verify Ember+ Provider Address in preferences!";
  dot1Error.style.color = "red";
  dot1Error.classList.add('blink')
  add1Error.style.color = "red";
  add1Error.classList.add('blink')
})

ipcRenderer.on('eServDisconnected', function (event, eAddress) {
  console.log("erreur de connection ember+")
  let add1Error = document.getElementById("add1");
  let dot1Error = document.getElementById("dot1");
  add1Error.innerHTML = eAddress + "is disconnected!";
  dot1Error.style.color = "red";
  dot1Error.classList.add('blink')
  dot1Error.classList.add('blink')
  add1Error.style.color = "red";
  add1Error.classList.add('blink')
})

ipcRenderer.on('resolveError',(e)=>{
  ipcRenderer.send('showPreferences');
})

let stream_direction;
ipcRenderer.on('streamDirection',(e, direction)=>{
  stream_direction = direction
})

ipcRenderer.on('sendEmberValue', (event, emberValue, whichRow, whichCell) => {
  let table = document.getElementById("tableOfConnection");
  table.rows[whichRow].cells[whichCell].innerHTML = emberValue;
})

let osc_adress;
let blink2;
let rEaddr2; 
let sFactor2;
let eVarType2;
let eMin2;
let eMax2;
let oMin2;
let oMax2;
let eVarCurve2;
ipcRenderer.on('oReceivedAddr', (event, oRaddr, oRargs) => {
  dot2.classList.add("blink")
  if (osc_adress !== oRaddr){
  console.log("oRaddr",oRaddr);
  let dot2 = document.getElementById("dot2");
  dot2.classList.toggle('blink');
  filteR = oRaddr.toUpperCase();
  //console.log("Uppercase", filteR);
  table = document.getElementById("tableOfConnection");
  tr = table.getElementsByTagName("tr");
  for (i = 0; i < tr.length; i++) {
    td = tr[i].getElementsByTagName("td")[4];
    if (td) {
      txtValue = JSON.stringify(td.textContent) || JSON.stringify(td.innerText);
      //console.log("txtValue1", txtValue.toUpperCase());
      let p = td.parentNode;
      let myRow = p.rowIndex;
      if (txtValue.toUpperCase().indexOf(filteR) > -1) {
      //  console.log("OSC Address Received: ", filteR, "is present in table at Row: ", myRow);
        table.rows[myRow].cells[3].innerHTML = oRargs.toFixed(2);
        sFactor2 = table.rows[myRow].cells[2].innerHTML;
        rEaddr2 = table.rows[myRow].cells[0].innerHTML;
        eVarType2 = table.rows[myRow].cells[6].innerHTML;
        eMin2 = (Array.from((table.rows[myRow].cells[8].innerHTML).split("/")))[0];
        eMax2 = (Array.from((table.rows[myRow].cells[10].innerHTML).split("/")))[0];
        oMinArray2 = (Array.from((table.rows[myRow].cells[8].innerHTML).split("/")));
        if (typeof oMinArray2[1] === 'undefined') {
          oMin2 = eMin2
        }
        else {
          oMin2 = oMinArray2[1]
        }
          oMaxArray2 = (Array.from((table.rows[myRow].cells[10].innerHTML).split("/")));
        if (typeof oMaxArray2[1] === 'undefined') {
          oMax2 = eMax2
        }
        else {
          oMax2 = oMaxArray2[1]
        }
        let eVarCurve2 = table.rows[myRow].cells[7].innerHTML;
        ipcRenderer.send('reSendOrArgs', oRargs, rEaddr2, sFactor2, eVarType2, eMin2, eMax2, oMin2, oMax2, eVarCurve2);
      } 
      else {
      //  console.log("OSC Address received is Undefined");
      }
    }
    
  }
  
}else{
  ipcRenderer.send('reSendOrArgs', oRargs, rEaddr2, sFactor2, eVarType2, eMin2, eMax2, oMin2, oMax2, eVarCurve2);
}


    setTimeout(() => {
      dot2.classList.remove("blink")
      },2000);


  osc_adress = oRaddr
  console.log("osc_address",osc_adress)
})


ipcRenderer.on('sendFilename', (event, filename) => {
  let filePath = filename.toString();
  document.getElementById("filepath").innerHTML = filePath;
  filenameReplace = filename.replace(/\//g, ",");
  filenameSplit = filenameReplace.split(",");
  filenameSlice = filenameSplit.slice(-1)[0];
  document.title = "MCxOSC - " + filenameSlice;
})

ipcRenderer.on('sendFileContent', function (event, content) {
  let table = document.getElementById("tableOfConnection");
  deleteAllRows();

  let sendedJSON = JSON.parse(content);
  sendedJSON = sendedJSON.replace(/\\n/g, "");
  sendedJSON = JSON.parse(sendedJSON);
    sendedJSON.forEach(element => {
    if (element.path) {
      let btnDel = document.createElement("BUTTON");
      let btnGo = document.createElement("BUTTON");
      btnDel.innerHTML = "X";
      btnDel.setAttribute('onClick', 'SomeDeleteRowFunction(this)');
      btnGo.innerHTML = "Go!";
      btnGo.setAttribute('onClick', 'sendConnection(this)');
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
      cell2.innerHTML = "----";
      cell3.innerHTML = element.factor;
      cell4.innerHTML = "----";
      cell5.innerHTML = element.address;
      cell6.appendChild(btnGo);
      cell6.appendChild(btnDel);
      cell7.innerHTML = element.type;
      cell8.innerHTML = element.math;
      cell9.innerHTML = element.min;
      cell10.innerHTML = "";
      cell11.innerHTML = element.max;
      cell3.style.fontSize = 'x-small';
      cell9.style.fontSize = 'x-small';
      cell11.style.fontSize = 'x-small';
    }
  });
})

ipcRenderer.on('autoSave', function (event) {
  table = document.getElementById('tableOfConnection');
  data = [];
  let headers = [];
  for (i = 0; i < table.rows[1].cells.length; i++) {
    headers[i] = table.rows[1].cells[i].innerHTML.toLowerCase().replace(/ /gi, '');
  }
  // go through cells
  for (i = 2; i < table.rows.length; i++) {
    let tableRow = table.rows[i];
    let rowData = {};
    let x = [0, 2, 4, 6, 7, 8, 10];
    x.forEach(item => {
      rowData[headers[item]] = tableRow.cells[item].innerHTML;
    })
    data.push(rowData);
  }
//  data.unshift(sessionData)
  let content = JSON.stringify(data, null, 2);
  ipcRenderer.send('sendAutoSave', content, autoSave)
})







ipcRenderer.on('appVersion', function (event, appVersion) {
  document.getElementById("appVersion").innerHTML = document.getElementById("appVersion").innerHTML + appVersion;
  //document.getElementById("filepath").innerHTML = "none";
  console.log("appVersion:", appVersion);

})

ipcRenderer.on('autoGo', function(event){
  sendAllConnections()
})

//-----------------------------------------//

function addGenBtns() {
  let table = document.getElementById("tableOfConnection");
  let btnSuscribeAll = document.createElement("BUTTON");
  let btnDeleteAll = document.createElement("BUTTON");
  btnDeleteAll.innerHTML = "&darr;X"
  btnDeleteAll.setAttribute('onClick', 'deleteAllRows(this)'); //function not created yet
  btnSuscribeAll.innerHTML = "Go&darr;"
  btnSuscribeAll.setAttribute('onClick', 'sendAllConnections(this)');
  table.rows[1].cells[5].appendChild(btnSuscribeAll);
  table.rows[1].cells[5].appendChild(btnDeleteAll);
}

function makeVisible(op) {
  document.getElementById(op).style.visibility = "visible";
}


function setEuserLabel(typeOfChan) {
  let eUserLabel = document.getElementById("eUserLabel");
  eUserLabel.innerHTML = "";
  if (typeOfChan == "Inputs") {
    for (i = 0; i < rInputsUserLabels.length; i++) {
      let opt = rInputsUserLabels[i];
      eUserLabel.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
    }
  } else if (typeOfChan == "GP Channels") {
    for (i = 0; i < rGpcsUserLabels.length; i++) {
      let opt = rGpcsUserLabels[i];
      eUserLabel.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
    }
  } else if (typeOfChan == "Sums") {
    for (i = 0; i < rSumsUserLabels.length; i++) {
      let opt = rSumsUserLabels[i];
      eUserLabel.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
    }
  } else if (typeOfChan == "Auxes") {
    for (i = 0; i < rAuxesUserLabels.length; i++) {
      let opt = rAuxesUserLabels[i];
      eUserLabel.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
    }
  } else if (typeOfChan == "Masters") {
    for (i = 0; i < rMastersUserLabels.length; i++) {
      let opt = rMastersUserLabels[i];
      eUserLabel.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
    }
    //} else if (typeOfChan == "Groups") {
    //  for (i=0; i<rGroupsUserLabels.length;i++){
    //    let opt = gpcsUserLabel[i];
    //    eUserLabel.innerHTML += "<option value=\"" + opt + "\">" + opt + "</option>";
    //  }
  }
}


function submitEmberPath(event) {
  let btnDel = document.createElement("BUTTON");
  let btnGo = document.createElement("BUTTON");
  let switcher = document.getElementById("switcher");
  let oscAddr = document.getElementById("oscAddr").value;
  let slct0 = document.getElementById("slct0").value;
  //let chanNumbPrefix = document.getElementById("eChanNumbPrefix").value;
  //let chanNumb = document.getElementById("eChanNumb").value;
  let userLabel = document.getElementById("eUserLabel").value;
  let manualEmberPath = document.getElementById("manualEmberPath").value
  //let chanNumbNumb = Number(chanNumb);
  let slct1 = document.getElementById("slct1").value;
  let slct2 = document.getElementById("slct2").value;
  let slct3 = document.getElementById("slct3").value;
  let emBerPath = "";
  if (switcher.className == "toggle") {
    if (slct3 == "") {
      emBerPath = "Channels." + slct0 + "." + userLabel + "." + slct1 + "." + slct2;
    } else if (slct3 != "") {
      emBerPath = "Channels." + slct0 + "." + userLabel + "." + slct1 + "." + slct2 + "." + slct3;
    };
  } else {
    console.log("manualemberpath:",manualEmberPath);
    emBerPath = manualEmberPath;
    if(emBerPath.includes("/") === true){
      emBerPath = emBerPath.replaceAll("/",".");
      if(emBerPath.charAt(0) === "."){
        emBerPath = emBerPath.slice(1)
      }else{emBerPath = emBerPath}
    }else{emBerPath = emBerPath}
    console.log("newemberpath:",emBerPath);
    eVarType = "Integer";
    eVarFactor = 1;
    eVarMin = 0;
    eVarMax = 0
    eVarCurve = "lin"
  };
  btnDel.innerHTML = "X";
  btnDel.setAttribute('onClick', 'SomeDeleteRowFunction(this)');
  btnGo.innerHTML = "Go!";
  btnGo.setAttribute('onClick', 'sendConnection(this)');
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
  cell2.innerHTML = "----";
  cell3.innerHTML = eVarFactor;
  cell4.innerHTML = "----";
  cell5.innerHTML = oscAddr;
  cell6.appendChild(btnGo);
  cell6.appendChild(btnDel);
  cell7.innerHTML = eVarType;
  cell8.innerHTML = eVarCurve;
  if (eVarFactor !== "") {
    cell9.innerHTML = eVarMin + "/" + (Number(eVarMin) / Number(eVarFactor)).toFixed(0);
    cell11.innerHTML = eVarMax + "/" + (Number(eVarMax) / Number(eVarFactor)).toFixed(0);
  } else {
    cell9.innerHTML = eVarMin + "/" + 0;
    cell11.innerHTML = eVarMax + "/" + 1;
  }
  cell10.innerHTML = "";
  cell3.style.fontSize = 'x-small';
  cell7.style.fontSize = 'x-small';
  cell8.style.fontSize = 'x-small';
  cell9.style.fontSize = 'x-small';
  cell11.style.fontSize = 'x-small';
  if (table.rows.length == 3) {
    if (table.rows[1].cells[5].innerHTML == "") {
      addGenBtns();
    }
  };
  event.preventDefault();
}

function populate(s1, s2, s3, s4) {
  s1 = document.getElementById(s1);
  s2 = document.getElementById(s2);
  s3 = document.getElementById(s3);
  s2.innerHTML = "";
  if (s1.value == "Channel States") {
    var optionArray = ["|----||||||",
      "Stereo|Stereo|Boolean||||||||"];
  } else if (s1.value == "Mute" && s2.name != "slct3") {
    var optionArray = ["|----|||||", "Mute|Mute|Boolean||||||||"];
  } else if (s1.value == "Fader") {
    var optionArray = ["|----||||||",
      "Fader Level|Fader Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log"];
  } else if (s1.value == "Slider") {
    var optionArray = ["|----||||||",
      "Fader Position|Fader Position|Integer|\nmin:0|\nmax:100|\nfactor:1|\n-|\ncurve:lin"];
  } else if (s1.value == "Pan") {
    var optionArray = ["|----||||||",
      "Left-Right Panning|Left-Right Panning|Integer|\nmin:-20|\nmax:20|\nfactor:1|\n-|\ncurve:lin",
      "Front-Back Panning|Front-Back Panning|Integer|\nmin:-20|\nmax:20|\nfactor:1|\n-|\ncurve:lin",
      "Up-Down Panning|Up-Down Panning|Integer|\nmin:-20|\nmax:20|\nfactor:1|\n-|\ncurve:lin",
      "Pan Slope|Pan Slope|Integer|\nmin:-20|\nmax:20|\nfactor:1|\n-|\ncurve:lin",
      "LFE Level|LFE Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:lin",
      "Hyperpan Front Width|Hyperpan Front Width|Integer|\nmin:-100|\nmax:100|\nfactor:1|\n-|\ncurve:lin",
      "Hyperpan Back Width|Hyperpan Back Width|Integer|\nmin:-100|\nmax:100|\nfactor:1|\n-|\ncurve:lin",
      "Hyperpan Depth|Hyperpan Depth|Integer|\nmin:-100|\nmax:100|\nfactor:1|\n-|\ncurve:lin",
      "Hyperpan Turn|Hyperpan Turn|Integer|\nmin:-180|\nmax:180|\nfactor:1|\n-|\ncurve:lin",
      "Pan On|Pan On|Boolean|||||",
      "Pan Mode Center-Flat|Pan Mode Center-Flat|Boolean|||||",
      "Surround|Surround|Boolean|||||"
    ];
  } else if (s1.value == "Signal Processing") {
    console.log("signal proc")
    var optionArray = ["|----||||||",
      "Input Mixer|Input Mixer||||||",
      "Equalizer|Equalizer||||||",
      "Compressor|Compressor||||||"];
  } else if (s1.value == "Input Mixer") {
    let optionArray = ["|----||||||",
      "Input Gain|Input Gain|Integer|\nmin:-4096|\nmax:2560|\nfactor:32|\n-|\ncurve:log"];
  } else if (s1.value == "Equalizer") {
    var optionArray = ["|----||||||",
      "Equalizer 1 Gain|Equalizer 1 Gain|Integer|\nmin:-768|\nmax:768|\nfactor:32|\n-|\ncurve:log",
      "Equalizer 1 Frequency|Equalizer 1 Frequency|Integer|\nmin:2131|\nmax:7045|\nfactor:1|\n-|\ncurve:log",
      "Equalizer 1 Q|Equalizer 1 Q|Integer|\nmin:6|\nmax:5120|\nfactor:64|\n-|\ncurve:log",
      "Equalizer 1 On|Equalizer 1 On|Boolean|||||",
      "Equalizer 1 Slope|Equalizer 1 Slope|Integer|\nmin:0|\nmax:2|\nfactor:1|\n6dB/oct0\n12dB/oct1\n18dB/oct2|\ncurve:lin",
      "Equalizer 1 Type|Equalizer 1 Type|Integer|\nmin:1|\nmax:5|\nfactor:1|\nBell    1\nHi Pass 2\nLo Shelv5|\ncurve:lin",
      "Equalizer 2 Gain|Equalizer 2 Gain|Integer|\nmin:-768|\nmax:768|\nfactor:32|\n-|\ncurve:log",
      "Equalizer 2 Frequency|Equalizer 2 Frequency|Integer|\nmin:2131|\nmax:7045|\nfactor:1|\n-|\ncurve:log",
      "Equalizer 2 Q|Equalizer 2 Q|Integer|\nmin:6|\nmax:5120|\nfactor:64|\n-|\ncurve:log",
      "Equalizer 2 On|Equalizer 2 On|Boolean|||||",
      "Equalizer 3 Gain|Equalizer 3 Gain|Integer|\nmin:-768|\nmax:768|\nfactor:32|\n-|\ncurve:log",
      "Equalizer 3 Frequency|Equalizer 3 Frequency|Integer|\nmin:2131|\nmax:7045|\nfactor:1|\n-|\ncurve:log",
      "Equalizer 3 Q|Equalizer 3 Q|Integer|\nmin:6|\nmax:5120|\nfactor:64|\n-|\ncurve:log",
      "Equalizer 3 On|Equalizer 3 On|Boolean|||||",
      "Equalizer 4 Gain|Equalizer 4 Gain|Integer|\nmin:-768|\nmax:768|\nfactor:32|\n-|\ncurve:log",
      "Equalizer 4 Frequency|Equalizer 4 Frequency|Integer|\nmin:2131|\nmax:7045|\nfactor:1|\n-|\ncurve:log",
      "Equalizer 4 Q|Equalizer 4 Q|Integer|\nmin:6|\nmax:5120|\nfactor:64|\n-|\ncurve:log",
      "Equalizer 4 On|Equalizer 4 On|Boolean|||||",
      "Equalizer 4 Slope|Equalizer 4 Slope|Integer|\nmin:0|\nmax:2|\nfactor:1|\n6dB/oct0\n12dB/oct1\n18dB/oct2|\ncurve:lin",
      "Equalizer 4 Type|Equalizer 4 Type|Integer|\nmin:1|\nmax:5|\nfactor:1|\nBell    1\nHi Pass 2\nLo Shelv5|\ncurve:lin"];
  } else if (s1.value == "Assignements") {
    var optionArray = ["|----||||||",
      "Aux Assignments|Aux Assignments||||||"]
  } else if (s1.value == "Aux Assignments") {
    var optionArray = ["|----||||||",
      "Aux Send 1 Level|Aux Send 1 Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log",
      "Aux Send 2 Level|Aux Send 2 Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log",
      "Aux Send 1/2 Pan/Balance|Aux Send 1/2 Pan/Balance|Integer|\nmin:-20|\nmax:20|\nfactor:1|\n-|\ncurve:lin",
      "Aux Send 1 On|Aux Send 1 On|Boolean|||||",
      "Aux Send 1 Mix Cue|Aux Send 1 Mix Cue|Boolean|||||",
      "Aux Send 1 Independent|Aux Send 1 Independent|Boolean|||||",
      "Aux Send 2 On|Aux Send 2 On|Boolean|||||",
      "Aux Send 2 Mix Cue|Aux Send 2 Mix Cue|Boolean|||||",
      "Aux Send 2 Independent|Aux Send 2 Independent|Boolean|||||",
      "Aux Send 3 Level|Aux Send 3 Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log",
      "Aux Send 4 Level|Aux Send 4 Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log",
      "Aux Send 3/4 Pan/Balance|Aux Send 3/4 Pan/Balance|Integer|\nmin:-20|\nmax:20|\nfactor:1|\n-|\ncurve:lin",
      "Aux Send 3 On|Aux Send 3 On|Boolean|||||",
      "Aux Send 3 Mix Cue|Aux Send 3 Mix Cue|Boolean|||||",
      "Aux Send 3 Independent|Aux Send 3 Independent|Boolean|||||",
      "Aux Send 4 On|Aux Send 4 On|Boolean|||||",
      "Aux Send 4 Mix Cue|Aux Send 4 Mix Cue|Boolean|||||",
      "Aux Send 4 Independent|Aux Send 4 Independent|Boolean|||||",
      "Aux Send 5 Level|Aux Send 5 Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log",
      "Aux Send 6 Level|Aux Send 6 Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log",
      "Aux Send 5/6 Pan/Balance|Aux Send 5/6 Pan/Balance|Integer|\nmin:-20|\nmax:20|\nfactor:1|\n-|\ncurve:lin",
      "Aux Send 5 On|Aux Send 5 On|Boolean|||||",
      "Aux Send 5 Mix Cue|Aux Send 5 Mix Cue|Boolean|||||",
      "Aux Send 5 Independent|Aux Send 5 Independent|Boolean|||||",
      "Aux Send 6 On|Aux Send 6 On|Boolean|||||",
      "Aux Send 6 Mix Cue|Aux Send 6 Mix Cue|Boolean|||||",
      "Aux Send 6 Independent|Aux Send 6 Independent|Boolean|||||",
      "Aux Send 7 Level|Aux Send 7 Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log",
      "Aux Send 8 Level|Aux Send 8 Level|Integer|\nmin:-4096|\nmax:480|\nfactor:32|\n-|\ncurve:log",
      "Aux Send 7/8 Pan/Balance|Aux Send 7/8 Pan/Balance|Integer|\nmin:-20|\nmax:20|\nfactor:1|\n-|\ncurve:lin",
      "Aux Send 7 On|Aux Send 7 On|Boolean|||||",
      "Aux Send 7 Mix Cue|Aux Send 7 Mix Cue|Boolean|||||",
      "Aux Send 7 Independent|Aux Send 7 Independent|Boolean|||||",
      "Aux Send 8 On|Aux Send 8 On|Boolean|||||",
      "Aux Send 8 Mix Cue|Aux Send 8 Mix Cue|Boolean|||||",
      "Aux Send 8 Independent|Aux Send 8 Independent|Boolean|||||"]
  } else if (s1.value == "Compressor") {
    var optionArray = ["|----||||||",
      "Compressor Threshold|Compressor Threshold|Integer|\nmin:-2240|\nmax:640|\nfactor:32|\n-|\ncurve:log",
      "Compressor Gain|Compressor Gain|Integer|\nmin:-640|\nmax:640|\nfactor:32|\n-|\ncurve:log",
      "Compressor Ratio|Compressor Ratio|Integer|\nmin:0|\nmax:2048|\nfactor:1|\n-|\ncurve:lin",
      "Compressor Attack|Compressor Attack|Integer|\nmin:5|\nmax:12000|\nfactor:48|\n-|\ncurve:lin",
      "Compressor Release|Compressor Release|Integer|\nmin:1920|\nmax:480000|\nfactor:48|\n-|\ncurve:lin",
      "Compressor Mix|Compressor Mix|Integer|\nmin:0|\nmax:100|\nfactor:1|\n-|\ncurve:lin"
    ]
  };
  if (s1.value == "") {
    s2.required = false;
    s2.style.visibility = "hidden";
    s3.style.visibility = "hidden";
    s2.innerHTML = "";
  }
  else {
    for ( option in optionArray) {
      let pair = optionArray[option].split("|");
      let newOption = document.createElement("option");
      newOption.value = pair[0];
      newOption.innerHTML = pair[1];
      newOption.title = pair[2] + pair[3] + pair[4] + pair[5] + pair[6] + pair[7];
      s2.options.add(newOption);
      s2.required = true;
      s2.style.visibility = "visible";
      s3.style.visibility = "visible";
    }
  }
}

function fillOscAddr(event) {
  let oscAddr = document.getElementById("oscAddr");
  let userLabel = document.getElementById("eUserLabel")
  let slct1 = document.getElementById("slct1");
  let slct2 = document.getElementById("slct2");
  let slct3 = document.getElementById("slct3");
  let switcher = document.getElementById("switcher");
  if (switcher.className == "toggle") {
    if (slct3.value == "") {
      oscAddr.value = "/Channels/" + slct0.value + "/" + userLabel.value + "/" + slct1.value + "/" + slct2.value;
    } else {
      oscAddr.value = "/Channels/" + slct0.value + "/" + userLabel.value + "/" + slct1.value + "/" + slct2.value + "/" + slct3.value;
    }
  } else {
    userLabelValid = userLabel.value.includes("/");
    if (userLabelValid == true) {
      userLabel.value = (userLabel.value).replace(/\//g, ".")
    };
    oscAddr.value = "/" + (userLabel.value).replace(/\./g, "/")
  }
}

function modifyOscAddr(event) {
  let newOscAddr = document.getElementById("oscAddr").value;
  let table = document.getElementById("tableOfConnection");
  let switcher1 = document.getElementById("switcher1");
  if (switcher1.className == "toggle toggle-on") {
    let x = table.rows.length;
    let oRange = document.getElementById("oRange");
    let lCheckbox = document.getElementById("lCheckbox");
    oRangeArr = Array.from(oRange.value.split(','));
    let rows = table.getElementsByTagName('tr');
    if (x > 2) {
      table.rows[rows.length - 1].cells[4].innerHTML = newOscAddr;
      let emMin = (Array.from((table.rows[rows.length - 1].cells[8].innerHTML).split("/")))[0];
      let emMax = (Array.from((table.rows[rows.length - 1].cells[10].innerHTML).split("/")))[0];
      table.rows[rows.length - 1].cells[8].innerHTML = emMin + "/" + oRangeArr[0];
      table.rows[rows.length - 1].cells[10].innerHTML = emMax + "/" + oRangeArr[1];
      if (lCheckbox.checked !== false) {
        table.rows[rows.length - 1].cells[7].innerHTML = "log";
      } else {
        table.rows[rows.length - 1].cells[7].innerHTML = "lin";
      }
    }
  }
  else {
    switcher1.className = "toggle";
    let x = table.rows.length;
    let oRange = document.getElementById("oRange");
    let lCheckbox = document.getElementById("lCheckbox");
    oRangeArr = Array.from(oRange.value.split(','));
    let rows = table.getElementsByTagName('tr');
    if (x > 2) {
      table.rows[rows.length - 1].cells[4].innerHTML = newOscAddr;
      let emMin = (Array.from((table.rows[rows.length - 1].cells[8].innerHTML).split("/")))[0];
      let emMax = (Array.from((table.rows[rows.length - 1].cells[10].innerHTML).split("/")))[0];
      table.rows[rows.length - 1].cells[8].innerHTML = emMin;
      table.rows[rows.length - 1].cells[10].innerHTML = emMax;
      lCheckbox.checked = false;
      table.rows[rows.length - 1].cells[2].innerHTML = 1;
    }
  }
}

function SomeDeleteRowFunction(o) {
  let table = document.getElementById("tableOfConnection");
  if (typeof (o) == "number") {
    let myRow = o;
    let ePath = table.rows[myRow].cells[0].innerHTML;
    let oAddr = table.rows[myRow].cells[4].innerHTML;
    let eVarFactor = table.rows[myRow].cells[2].innerHTML;
    let eVarType = table.rows[myRow].cells[6].innerHTML;
    ipcRenderer.send('deleteConnection', ePath, oAddr, myRow, eVarType, eVarFactor);
    table.deleteRow(o)
    console.log("delete Row number: ", o);
  }
  else {
    let p = o.parentNode.parentNode;
    myRow = p.rowIndex;
    console.log(myRow);
    let ePath = table.rows[myRow].cells[0].innerHTML;
    let oAddr = table.rows[myRow].cells[4].innerHTML;
    let eVarFactor = table.rows[myRow].cells[2].innerHTML;
    let eVarType = table.rows[myRow].cells[6].innerHTML;
    ipcRenderer.send('deleteConnection', ePath, oAddr, myRow, eVarType, eVarFactor);
    p.parentNode.removeChild(p);
    console.log("delete row number: ", myRow);
  }
}

function deleteAllRows(o) {
  const table = document.getElementById("tableOfConnection");
  let numOfConn = table.rows.length;
  for (x = numOfConn - 1; x > 1; x--) {
    setTimeout(() => {
      SomeDeleteRowFunction((table.rows.length) - 1);
    }, x * 25)
  }
}

function sendConnection(o) {
  console.log("ooooo : ", o)
  var table = document.getElementById("tableOfConnection");
  if (typeof o == "number") {
      myRow = o
  }
  else {
    var p = o.parentNode.parentNode;
    myRow = p.rowIndex;
  }
  console.log("myrow : ",myRow);
  let ePath = table.rows[myRow].cells[0].innerHTML;
  let oAddr = table.rows[myRow].cells[4].innerHTML;
  let eVarFactor = table.rows[myRow].cells[2].innerHTML;
  let eVarType = table.rows[myRow].cells[6].innerHTML;
  let eMin = (Array.from((table.rows[myRow].cells[8].innerHTML).split("/")))[0];
  let eMax = (Array.from((table.rows[myRow].cells[10].innerHTML).split("/")))[0];
  let oMinArray = (Array.from((table.rows[myRow].cells[8].innerHTML).split("/")));
  if (typeof oMinArray[1] === 'undefined') {
    oMin = eMin
  }
  else {
    oMin = oMinArray[1]
  }
  let oMaxArray = (Array.from((table.rows[myRow].cells[10].innerHTML).split("/")));
  if (typeof oMaxArray[1] === 'undefined') {
    oMax = eMax
  }
  else {
    oMax = oMaxArray[1]
  }
  let eVarCurve = table.rows[myRow].cells[7].innerHTML;
  console.log("epath in newconnectionR:", ePath)
  ipcRenderer.send('newConnection', ePath, oAddr, myRow, eVarType, eVarFactor, eMin, eMax, oMin, oMax, eVarCurve);
}

function sendAllConnections() {
  var table = document.getElementById("tableOfConnection");
  console.log("taille du tableau", table.rows.length);
  for (i = 2; i < table.rows.length; i++) {
    (function(n){
    setTimeout(() => {
      sendConnection(n);
    }, 25);
  }(i))
  }
}

function selectedOption(slct) {
  slct = document.getElementById(slct);
  if (slct.options[slct.selectedIndex].title !== "") {
    let details = slct.options[slct.selectedIndex].title;
    let detailsArray = details.split("\n");
    eVarType = detailsArray[0];
    eVarMin = "false";
    eVarMax = "true";
    eVarFactor = "";
    eVarCurve = "";
    if (detailsArray[0] !== "Boolean") {
      eVarMin = (detailsArray[1].split(":"))[1];
      eVarMax = (detailsArray[2].split(":"))[1];
      eVarFactor = (detailsArray[3].split(":"))[1]
      eVarCurve = (detailsArray[5].split(":"))[1]
    };
    if (detailsArray[4] !== "-") {
      eVarEnum = detailsArray[4];
    } else {
      eVarEnum = "";
    }
  }
}

function advancedMode(e) {
  e.preventDefault();
  let switcher = document.getElementById("switcher");
  let hideOnAdvanced = document.getElementsByClassName("hideOnAdvanced");
  //let stayOnAdvanced = document.getElementsByClassName("stayOnAdvanced");
  let slct0 = document.getElementById("slct0");
  let slct1 = document.getElementById("slct1");
  let manualEmberPath = document.getElementById("manualEmberPath")
  let eUserLabel = document.getElementById("eUserLabel");
  if (switcher.className == "toggle") {
    switcher.className = "toggle toggle-on";
    manualEmberPath.style.display = "flex";
    manualEmberPath.style.marginLeft= "0";
    manualEmberPath.style.marginRight= "0";
    manualEmberPath.style.top = 0;
    manualEmberPath.style.margin= "auto";
    manualEmberPath.style.visibility = "visible";
    let length = hideOnAdvanced.length
    console.log (length)
    for ( i = 0; i < length; i++) {
      hideOnAdvanced[i].style.display = "none";
      hideOnAdvanced[i].style.visibility= "hidden";
    };
    slct0.required = false;
    slct1.required = false;
    eUserLabel.required = false;
    hideOnAdvanced[0].style.display = "";
    hideOnAdvanced[0].style.visibility = "hidden";
  } else {
    switcher.className = "toggle";
    manualEmberPath.style.visibility = "hidden";
    manualEmberPath.style.display = "none"
    let length = hideOnAdvanced.length
    console.log (length)
    for ( i = 0; i < length; i++) {
      hideOnAdvanced[i].style.display = "";
    };
    slct0.required = true;
    slct1.required = true;
    eUserLabel.required = true;
    hideOnAdvanced[0].style.visibility = "visible";
    hideOnAdvanced[1].style.visibility = "visible";
    hideOnAdvanced[2].style.visibility = "visible";
    hideOnAdvanced[3].style.visibility = "visible";
    hideOnAdvanced[4].style.visibility = "visible";
    hideOnAdvanced[5].style.visibility = "visible";
  };
}

function remapMode(e) {
  e.preventDefault();
  let table = document.getElementById("tableOfConnection");
  let lastRow = table.rows[table.rows.length - 1];
  let eType = lastRow.cells[6].innerHTML;
  let eMax = (Array.from((lastRow.cells[10].innerHTML).split("/")))[0];
  let eMin = (Array.from((lastRow.cells[8].innerHTML).split("/")))[0];
  let eRange = document.getElementById("eRange");
  let oRange = document.getElementById("oRange");
  let lCheckbox = document.getElementById("lCheckbox");
  let switcher1 = document.getElementById("switcher1");
  let unhideOnRemap = document.getElementsByClassName("unhideOnRemap");
  if (switcher1.className == "toggle" && eType == "Integer") {
    switcher1.className = "toggle toggle-on";
    lCheckbox.checked = false;
    let oMax = (Array.from((lastRow.cells[10].innerHTML).split("/")))[1];
    let oMin = (Array.from((lastRow.cells[8].innerHTML).split("/")))[1];
    for ( i = 0; i < unhideOnRemap.length; i++) {
      unhideOnRemap[i].style.visibility = "visible";
      if (eType == "Integer") {
        eRange.innerHTML = "from : " + eMin + "," + eMax + " to : "
        oRange.value = oMin + "," + oMax;
        oRange.required = true;
      };
    }
  } else {
    switcher1.className = "toggle";
    for ( i = 0; i < unhideOnRemap.length; i++) {
      unhideOnRemap[i].style.visibility = "hidden";
      oRange.required = false;
    };
  };
}

//Menu Section//
function saveAs(saveAsBtn) {
  table = document.getElementById('tableOfConnection');
  let data = [];
  let headers = [];
  for (i = 0; i < table.rows[1].cells.length; i++) {
    headers[i] = table.rows[1].cells[i].innerHTML.toLowerCase().replace(/ /gi, '');
  }
  // go through cells
  for (i = 2; i < table.rows.length; i++) {
    let tableRow = table.rows[i];
    let rowData = {};
    let x = [0, 2, 4, 6, 7, 8, 10];
    x.forEach(item => {
      rowData[headers[item]] = tableRow.cells[item].innerHTML;
    })
    data.push(rowData);
  }
  let content = JSON.stringify(data, null, 2);
  console.log("contentsended:", content)
  ipcRenderer.send('sendSaveAs', content)
}

function save(saveBtn) {
  table = document.getElementById('tableOfConnection');
  let data = [];
  let headers = [];
  for (i = 0; i < table.rows[1].cells.length; i++) {
    headers[i] = table.rows[1].cells[i].innerHTML.toLowerCase().replace(/ /gi, '');
  }
  // go through cells
  for (i = 2; i < table.rows.length; i++) {
    let tableRow = table.rows[i];
    let rowData = {};
    let x = [0, 2, 4, 6, 7, 8, 10];
    x.forEach(item => {
      rowData[headers[item]] = tableRow.cells[item].innerHTML;
    })
    data.push(rowData);
  }
  let content = JSON.stringify(data, null, 2);
  let filename = document.getElementById("filepath").innerHTML;
  ipcRenderer.send('sendSave', content, filename)
}



function load(loadBtn) {
  ipcRenderer.send('openFile')
  let table = document.getElementById("tableOfConnection");
  let genBtn = table.rows[1].cells[5].innerHTML;
  if (genBtn == "") {
    addGenBtns()
  }
}

function prefs(preferencesBtn) {
  ipcRenderer.send('showPreferences');
}

function menu (){
  let menu = document.getElementById("menu").querySelectorAll(".button")
  let menuDiv = document.getElementById("menu")
  console.log("menubkgcolor",menuDiv.style.backgroundColor )
  if (menuDiv.style.backgroundColor === "rgb(71, 73, 108)"){
    menuDiv.style.backgroundColor = "rgb(40, 44, 52)"
  }else{
    menuDiv.style.backgroundColor = "rgb(71, 73, 108)"
  }
  for (i=1; i< menu.length;i++){
    if (menu[i].style.display === "none"){
    menu[i].style.display = "flex"
  }
  else {
    menu[i].style.display = "none"
  }
  
}
}
function logview(){
  let log = document.getElementById('logging')
  if (log.style.display === "none"){
  log.style.display = 'flex';
  }else{
  log.style.display = 'none'
  }
}



function tableToJson(table) {
  let data = [];
  let headers = [];
  for (i = 0; i < table.rows[1].cells.length; i++) {
    headers[i] = table.rows[1].cells[i].innerHTML.toLowerCase().replace(/ /gi, '');
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
  tableData = JSON.stringify(data, null, 2)
}
/////////////////////////////
//ipcRenderer.on('ready', (e)=>{
//let console = document.getElementById('logging')
//let anchor = document.getElementById('anchor');
//
//log.transports.console = (msg) => {
//  //console.log = log.log;
//  //Object.assign(, log.functions);
//  log.transports.console.format = '{h}:{i}:{s} / {text}';
//  let message = JSON.stringify(msg.data);
//  let line = document.createElement('div');
//  line.className = 'message';
//  message = message.replace('[', '');
//  message = message.replace(']', '');
//  message = message.replace(',', ' ');
//  line.innerText = message;
//  console.insertBefore(line, anchor);
//}
//});


