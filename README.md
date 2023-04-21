# MCxOSCnext

An Electron App as Bridge between Ember+ and OSC \
dedicated to [LAWO](https://lawo.com/) MC² consoles \
but works also with [Riedel](https://riedel.net) MediornetTDM devices \
(Matrix switching and functions not implemented yet). \
Heavily based on <https://github.com/nrkno/tv-automation-emberplus-connection> \
"W-I-P!"

# Installation

`yarn`

# Launch

`yarn start`

![Screenshot](/src/assets/screenshot_v2.2.0-alpha.7.png)

# Instructions

- Preferences are automatically stored in a 'config.json'
- Connections are stored in a separated JSON formatted '\*.session' file. -->[examples](/examples)
- A pre-configured form , dedicated for Lawo MC²36 console (not tested yet on other models), helps you to specify ember+ paths.
- Clicking 'Add' button add a line in the table of connections.
- Once you've clicked it, you can modify OSC addresses, ember+ paths, types, OSC mins, OSC maxs directly in table cells.
- If you want to connect other parameters or devices, you can edit ember+ path directly in the table of connections.
- You can retrieve paths needed with [emberplus viewer](https://github.com/Lawo/ember-plus/releases).
- Then you've got to click "go" buttons to establish connections.
