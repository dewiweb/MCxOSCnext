# MCxOSCnext

An Electron App as Bridge between Ember+ and OSC \
dedicated to [LAWO](https://lawo.com/) MC² consoles \
(not already tested with other ember+ providers). \
Heavily based on <https://github.com/nrkno/tv-automation-emberplus-connection> \
"W-I-P!"

# Installation

`yarn`

# Launch

`yarn start`

![Screenshot](/src/assets/screenshot2.0.0.png)

# Instructions

- Preferences are automatically stored  in a 'config.json'
- Connections are stored in a separated '*.session' (it's a json file editable with texteditor.)
- example:

```
[
  {
    "path": "Channels.GP Channels.TRK   1.Fader.Fader Level",
    "factor": "32",
    "address": "/Channels/GP Channels/TRK   1/Fader/Fader Level",
    "type": "Integer",
    "math": "log",
    "min": "-4096/-128",
    "max": "480/15"
  },
  {
    "path": "_2._7._1._3e9._40001100._40001101",
    "factor": "1",
    "address": "/track/1/gate/treshold",
    "type": "Integer",
    "math": "lin",
    "min": "0",
    "max": "0"
  },
  {
    "path": "_9.AccessChannelOID",
    "factor": "1",
    "address": "/_9/AccessChannelOID",
    "type": "String",
    "math": "lin",
    "min": "0",
    "max": "0"
  }
]
````

- A pre-configured form , dedicated for Lawo MC²36 console (not tested yet on other models), helps you to specify ember+ paths.
- Clicking 'Add' button add a line in the table of connections.
- Once you've clicked it, you can modify OSC addresses, ember+ paths, types, OSC mins, OSC maxs directly in table cells.
- If you want to connect other parameters or devices, you can edit ember+ path directly in the table of connections.
- You can retrieve paths needed with [emberplus viewer](https://github.com/Lawo/ember-plus/releases).
- Then you've got to click "go" buttons to establish connections.
