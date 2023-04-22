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
- A 'Tree Viewer' inspired by [EmberPlus Viewer](https://github.com/Lawo/ember-plus/releases) helps you to specify ember+ paths.
- Clicking '!Submit' button adds selected parameter the table of connections ([treejs](https://github.com/m-thalmann/treejs) custom implementation).
- Once you've clicked it, you can modify OSC addresses, ember+ paths, types, OSC mins, OSC maxs directly in table cells.
- If you want to connect other parameters or devices, you can edit ember+ path directly in the table of connections.
- Finally you've got to click "go" buttons to establish connections.
