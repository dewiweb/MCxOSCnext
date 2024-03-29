const { dialog } = require('electron');
const fs = require('fs');

module.exports = {
  //copied from https://github.com/jean-emmanuel/open-stage-control/blob/master/src/client/widgets/utils.js

  clip: function (value, range) {

    value = parseFloat(value)

    if (isNaN(value)) value = range[0]

    return Math.max(Math.min(range[0], range[1]), Math.min(value, Math.max(range[0], range[1])))
  },
  // map a value from a scale to another
  //     value: number
  //     rangeIn: [number, number]
  //     rangeOut: [number, number]
  //     decimals: number (-1 to bypass)
  //     log: true, or manual log scale (max log value)
  //     revertLog: boolean

  mapToScale: function (value, rangeIn, rangeOut, decimals, log, revertlog) {

    // clip in
    value = module.exports.clip(value, [rangeIn[0], rangeIn[1]])


    // normalize
    value = (value - rangeIn[0]) / (rangeIn[1] - rangeIn[0])

    // log scale
    if (log) {

      var logScale = revertlog ? Math.abs(rangeIn[1] - rangeIn[0]) :
        Math.abs(rangeOut[1] - rangeOut[0])

      if (log !== true && log !== -1) logScale = Math.abs(log)
      else if (logScale >= 100) logScale /= 10
      else logScale = Math.max(logScale, 10)

      if (log < 0) revertlog = !revertlog

      value = revertlog ?
        Math.log(value * (logScale - 1) + 1) / Math.log(logScale) :
        Math.pow(logScale, value) / (logScale - 1) - 1 / (logScale - 1)

    }

    // scale out
    value = value * (rangeOut[1] - rangeOut[0]) + rangeOut[0]

    // clip out
    value = module.exports.clip(value, [rangeOut[0], rangeOut[1]])

    // decimals
    if (decimals !== -1) value = parseFloat(value.toFixed(decimals))

    return value

  },

  oscToEmber: function (oscBundle) {
    console.log("oscbundle:",oscBundle)
    //let oscArgs = JSON.stringify(oscBundle.args);
    //console.log("oscbundlestringified:",oscArgs)
    //oscArgs = oscArgs.replace(/\s|\[|\]/g, "");
    //oscArgs = JSON.parse(oscArgs);
    let oscArgs
    console.log("osc_type", oscBundle.args[0].type)
    console.log("osc_value", oscBundle.args[0].value)
    if (oscBundle.args[0].type !== "s"){
    oscArgs = Number(oscBundle.args[0].value);
    console.log("cas1")
    }else{
      oscArgs = oscBundle.args[0].value.toString()
      console.log("cas2")
    }
    
    console.log("output_oscArgs", oscArgs);
    return oscArgs
  },
  embChPath: function (chNumb) {
    let eChPath = 'Channels.Inputs.INP   ';
    eChPath = eChPath.concat(chNumb.toString());
    return eChPath
  },
  embFadLevPath: function (eChPath) {
    let eFadLevPath = eChPath.concat('.Fader.Fader Level');
    return eFadLevPath
  },
  pathToAddress: function (path) {
    let oscAddress = path.replace(/\./g, '/');
    slash = "/";
    oscAddress = slash.concat(oscAddress);
    return oscAddress
  },
  addressToPath: function (address) {
    let path = address.replace(/\//g, '.');
    path = path.slice(1);
    return path
  },

  IntTwoChars: function (i) {
    return (`0${i}`).slice(-2);
  },

  sleep: function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },


}