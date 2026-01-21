---
trigger: always_on
---
# Project Overview - MCxOSC Refactoring

## Context

This project is a **major refactoring** from an Electron desktop application to a Dockerized web microservice.

### Original Application
- **Technology**: Electron (Node.js + Chromium)
- **Purpose**: Bridge between Ember+ protocol and OSC (Open Sound Control)
- **Use case**: Professional broadcast/audio equipment control (LAWO, Riedel)

### Target Architecture
- **Backend**: Node.js/TypeScript microservice
- **Frontend**: React SPA (Vite)
- **Deployment**: Docker/Docker Compose
- **Operation mode**: "Set and Forget" - headless capable

## Critical Dependency

⚠️ **NEVER CHANGE THE EMBERPLUS-CONNECTION VERSION**

```json
"emberplus-connection": "0.2.1-nightly-master-20230414-132419-ee926d2.0"
```

This is a **patched nightly version** specifically required for this project. Any version change will break compatibility.

## Key Documents

1. `REFACTORING_PLAN.md` - Complete architectural analysis and migration plan
2. `.windsurf/rules/*.md` - Development rules for AI agents

## Repository Structure (Target)

```
MCxOSCnext/
├── packages/
│   ├── backend/          # Node.js service
│   │   └── src/
│   │       ├── core/     # ConnectionManager, BridgeEngine
│   │       ├── services/ # EmberService, OscService
│   │       └── api/      # REST routes, WebSocket
│   └── frontend/         # React SPA
│       └── src/
│           ├── components/
│           └── hooks/
├── src/                  # Legacy Electron code (reference only)
├── docker/
└── config/
```
