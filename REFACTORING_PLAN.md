# MCxOSCnext Refactoring Plan
## From Electron Desktop App to Dockerized Web Microservice

---

## 1. Current Architecture Analysis

### 1.1 Overview
MCxOSCnext is an **Electron-based desktop application** that serves as a bridge between:
- **Ember+ protocol** (used by LAWO MC² consoles, Riedel MediornetTDM)
- **OSC (Open Sound Control)** protocol

### 1.2 Core Components

| Component | File | Description |
|-----------|------|-------------|
| **Main Process** | `src/main.js` (~1289 lines) | Electron main process, handles Ember+ client, OSC UDP ports, IPC communication |
| **Renderer Process** | `src/renderer.js` (~1623 lines) | Frontend logic, table management, tree view navigation |
| **Utility Functions** | `src/mainFunctions.js` (~113 lines) | Value mapping, OSC/Ember conversion utilities |
| **Tree View** | `src/tree.js` (~691 lines) | Custom TreeJS implementation for Ember+ tree navigation |
| **UI** | `src/index.html` + CSS files | Static HTML with inline event handlers |

### 1.3 Key Dependencies

| Package | Version | Purpose | Critical for Refactoring |
|---------|---------|---------|-------------------------|
| `emberplus-connection` | `0.2.1-nightly-master-20230414-132419-ee926d2.0` | **PATCHED** Ember+ protocol client | ✅ **MUST KEEP EXACT VERSION** |
| `osc` | `^2.4.2` | OSC UDP communication | ✅ Keep |
| `electron` | `^23.1.0` | Desktop framework | ❌ Remove |
| `electron-preferences` | `^2.7.0` | Settings management | ❌ Replace with web config |
| `tabulator-tables` | `^5.4.4` | Table UI component | 🔄 Keep or replace with React table |
| `pretty-print-json` | `^1.5.0` | JSON visualization | 🔄 Keep |

### 1.4 Current Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     ELECTRON MAIN PROCESS                        │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │  EmberClient    │◄──►│  OSC UDPPort    │◄──►│ IPC Bridge   │ │
│  │  (TCP:9000)     │    │  (UDP:9000/12000)│    │              │ │
│  └────────┬────────┘    └────────┬────────┘    └──────┬───────┘ │
│           │                      │                     │         │
│           └──────────────────────┴─────────────────────┘         │
│                                  │                               │
└──────────────────────────────────┼───────────────────────────────┘
                                   │ IPC (ipcMain/ipcRenderer)
                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ELECTRON RENDERER PROCESS                     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐ │
│  │  Tree View UI   │    │  Connection     │    │   Logs       │ │
│  │  (Ember+ tree)  │    │  Table          │    │   Panel      │ │
│  └─────────────────┘    └─────────────────┘    └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 1.5 Key Functionality Breakdown

#### Ember+ Operations (in `main.js`)
- `emberGet()` - Creates EmberClient connection
- `eGet.getDirectory()` - Tree navigation
- `eGet.subscribe()` - Parameter value subscriptions
- `eGet.setValue()` - Write values to Ember+ provider
- `eGet.matrixSetConnection()` - Matrix routing (partial implementation)

#### OSC Operations (in `main.js`)
- `oscListening()` - Creates UDP receiver
- `oscGet.send()` - Sends OSC messages
- `oscGet.on("message")` - Handles incoming OSC

#### Value Mapping (in `mainFunctions.js`)
- `mapToScale()` - Linear/logarithmic value conversion
- `oscToEmber()` / `emberToOsc()` - Protocol conversion

### 1.6 Session File Format
```json
[
  {
    "path": "11043.11044.24603.24606.24607",
    "factor": "1",
    "address": "/Channels/Inputs/INP_1/Mute/Mute",
    "type": "Boolean",
    "math": "lin",
    "min": "false/0",
    "max": "true/1"
  }
]
```

---

## 2. Target Architecture

### 2.1 Microservice Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DOCKER COMPOSE                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      BACKEND CONTAINER (Node.js)                     │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────┐  │   │
│  │  │  Ember+ Service │  │   OSC Service   │  │  Express/Fastify    │  │   │
│  │  │  (EmberClient)  │  │  (UDP Handler)  │  │  REST API + WS      │  │   │
│  │  └────────┬────────┘  └────────┬────────┘  └──────────┬──────────┘  │   │
│  │           │                    │                      │             │   │
│  │           └────────────────────┴──────────────────────┘             │   │
│  │                                │                                     │   │
│  │                         WebSocket Server                             │   │
│  │                         (Real-time updates)                          │   │
│  │                                                                      │   │
│  │  Port: 3000 (HTTP/WS) │ Port: 9000 (OSC IN) │ Port: 12000 (OSC OUT) │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                   │                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      FRONTEND CONTAINER (Nginx/Static)              │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              React/Vite SPA (Modern Web UI)                  │   │   │
│  │  │  - Tree View Component                                       │   │   │
│  │  │  - Connection Table (TanStack Table / AG-Grid)              │   │   │
│  │  │  - Real-time value display via WebSocket                    │   │   │
│  │  │  - Configuration Panel                                       │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  │  Port: 80 (HTTP)                                                   │   │
│  └────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      VOLUMES                                         │   │
│  │  - /config  → Configuration files (config.json)                     │   │
│  │  - /sessions → Session files (*.session)                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 New Directory Structure

```
MCxOSCnext/
├── docker-compose.yml
├── Dockerfile
├── .dockerignore
├── package.json                    # Workspace root (monorepo)
│
├── packages/
│   ├── backend/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # Entry point
│   │       ├── server.ts           # Express/Fastify server
│   │       ├── websocket.ts        # WebSocket handler
│   │       ├── services/
│   │       │   ├── ember/
│   │       │   │   ├── EmberService.ts
│   │       │   │   ├── EmberTreeManager.ts
│   │       │   │   └── EmberSubscriptionManager.ts
│   │       │   ├── osc/
│   │       │   │   ├── OscService.ts
│   │       │   │   └── OscMessageHandler.ts
│   │       │   └── bridge/
│   │       │       ├── BridgeService.ts      # Orchestrates Ember<->OSC
│   │       │       └── ValueMapper.ts        # mapToScale logic
│   │       ├── api/
│   │       │   ├── routes/
│   │       │   │   ├── config.ts
│   │       │   │   ├── sessions.ts
│   │       │   │   ├── connections.ts
│   │       │   │   └── tree.ts
│   │       │   └── middleware/
│   │       ├── config/
│   │       │   ├── ConfigManager.ts
│   │       │   └── defaults.ts
│   │       └── types/
│   │           ├── ember.ts
│   │           ├── osc.ts
│   │           └── session.ts
│   │
│   ├── frontend/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── components/
│   │       │   ├── Header/
│   │       │   ├── TreeView/
│   │       │   ├── ConnectionTable/
│   │       │   ├── ConfigPanel/
│   │       │   └── LogViewer/
│   │       ├── hooks/
│   │       │   ├── useWebSocket.ts
│   │       │   ├── useEmberTree.ts
│   │       │   └── useConnections.ts
│   │       ├── services/
│   │       │   └── api.ts
│   │       ├── store/                # Zustand or Redux
│   │       └── types/
│   │
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── types/
│           │   ├── session.ts
│           │   ├── config.ts
│           │   └── messages.ts
│           └── utils/
│               └── valueMapping.ts
│
├── config/                          # Docker volume mount
│   └── config.json
├── sessions/                        # Docker volume mount
│   └── *.session
│
└── legacy/                          # Current code (for reference)
    └── src/
```

### 2.3 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Backend Runtime** | Node.js 20 LTS | Compatibility with emberplus-connection |
| **Backend Framework** | Fastify or Express | Fast, TypeScript-friendly |
| **WebSocket** | ws or Socket.io | Real-time value updates |
| **Frontend Framework** | React 18 + Vite | Modern, fast development |
| **UI Components** | shadcn/ui + Tailwind CSS | Beautiful, accessible |
| **State Management** | Zustand | Lightweight, simple |
| **Table** | TanStack Table | Feature-rich, performant |
| **Tree View** | react-arborist or custom | Ember+ tree visualization |
| **Container** | Docker + Docker Compose | Easy deployment |
| **Language** | TypeScript | Type safety, maintainability |

---

## 3. Migration Strategy

### Phase 1: Backend Microservice (Core Logic)
1. Extract Ember+ service from `main.js`
2. Extract OSC service from `main.js`
3. Create Bridge service (orchestration)
4. Implement REST API for configuration
5. Implement WebSocket for real-time updates
6. Port value mapping utilities

### Phase 2: Frontend Web Application
1. Create React project with Vite
2. Implement Tree View component
3. Implement Connection Table
4. Implement Configuration panel
5. Add WebSocket client for real-time updates
6. Port session file loading/saving

### Phase 3: Docker Containerization
1. Create multi-stage Dockerfile
2. Create docker-compose.yml
3. Configure volumes for persistence
4. Add health checks
5. Document deployment process

### Phase 4: Testing & Documentation
1. Unit tests for services
2. Integration tests
3. API documentation (OpenAPI)
4. User documentation
5. Migration guide

---

## 4. API Design (Draft)

### REST Endpoints

```
GET    /api/config                    # Get current configuration
PUT    /api/config                    # Update configuration

GET    /api/sessions                  # List available sessions
GET    /api/sessions/:name            # Get session content
POST   /api/sessions                  # Create/save session
DELETE /api/sessions/:name            # Delete session

GET    /api/tree                      # Get Ember+ tree root
GET    /api/tree/:path                # Get tree node by path
POST   /api/tree/:path/expand         # Expand tree node

GET    /api/connections               # Get active connections
POST   /api/connections               # Create connection (subscribe)
DELETE /api/connections/:id           # Remove connection (unsubscribe)
PUT    /api/connections/:id           # Update connection parameters

GET    /api/status                    # Get service status (Ember+, OSC)
POST   /api/status/reconnect          # Reconnect to services
```

### WebSocket Events

```
# Server -> Client
ember:connected        # Ember+ connection established
ember:disconnected     # Ember+ connection lost
ember:value            # Parameter value changed { path, value }
ember:tree             # Tree structure update
osc:received           # OSC message received
osc:sent               # OSC message sent
log:message            # Log entry

# Client -> Server
subscribe              # Subscribe to parameter { path, oscAddress }
unsubscribe            # Unsubscribe from parameter { id }
osc:send               # Send OSC message
```

---

## 5. Critical Considerations

### 5.1 emberplus-connection Preservation
The patched version `0.2.1-nightly-master-20230414-132419-ee926d2.0` must be preserved exactly:
- **Lock in package.json** with exact version
- **Consider vendoring** the package if npm availability is uncertain
- **Document any patches** applied

### 5.2 Network Considerations in Docker
- Ember+ uses **TCP** (port 9000 by default) - needs `network_mode: host` or proper port mapping
- OSC uses **UDP** - Docker UDP handling requires attention
- Consider `network_mode: host` for simplest network setup

### 5.3 Session File Compatibility
- Maintain **backward compatibility** with existing `.session` files
- Add versioning to session format for future changes

---

## 6. Next Steps

1. [ ] Review and approve this plan
2. [ ] Set up monorepo structure (npm/yarn workspaces)
3. [ ] Create backend package with TypeScript setup
4. [ ] Port EmberService first (most critical)
5. [ ] Port OscService
6. [ ] Implement basic REST API
7. [ ] Add WebSocket support
8. [ ] Create frontend React project
9. [ ] Implement core UI components
10. [ ] Create Docker configuration
11. [ ] Test end-to-end
12. [ ] Document deployment

---

*Document created: $(date)*
*Author: Cascade AI Assistant*

---

## 7. File Modularization Analysis

### 7.1 Current File Sizes

| File | Lines | Responsibility | Status |
|------|-------|----------------|--------|
| `src/main.js` | **1289** | Everything: Ember+, OSC, IPC, Preferences, File I/O | ❌ **Too large, monolithic** |
| `src/renderer.js` | **1623** | Everything: UI, Tree, Table, IPC handlers, Menu | ❌ **Too large, monolithic** |
| `src/tree.js` | 691 | TreeView component | ⚠️ Acceptable, could split |
| `src/mainFunctions.js` | 113 | Utility functions | ✅ Good size |

### 7.2 Recommended Modularization for `main.js` (1289 lines)

The current `main.js` mixes **7 distinct responsibilities**. Split into:

```
packages/backend/src/
├── index.ts                          # Entry point (~30 lines)
├── server.ts                         # HTTP/WS server setup (~100 lines)
│
├── services/
│   ├── ember/
│   │   ├── EmberService.ts           # Core Ember+ client (~200 lines)
│   │   │   - emberGet()
│   │   │   - connect/disconnect
│   │   │   - getElementByPath()
│   │   │   - subscribe/unsubscribe
│   │   │   - setValue()
│   │   │
│   │   ├── EmberTreeManager.ts       # Tree navigation (~150 lines)
│   │   │   - getDirectory()
│   │   │   - expandNode()
│   │   │   - Tree caching
│   │   │
│   │   └── EmberSubscriptionManager.ts  # Subscriptions (~100 lines)
│   │       - Active subscriptions tracking
│   │       - Callback management
│   │
│   ├── osc/
│   │   ├── OscService.ts             # OSC UDP handling (~150 lines)
│   │   │   - oscListening()
│   │   │   - send()
│   │   │   - Message parsing
│   │   │
│   │   └── OscMessageHandler.ts      # Message routing (~100 lines)
│   │       - oscToTable() logic
│   │       - Address matching
│   │
│   └── bridge/
│       ├── BridgeService.ts          # Ember↔OSC orchestration (~200 lines)
│       │   - newConnection handler
│       │   - reSendOrArgs handler
│       │   - Direction management
│       │   - Rate limiting (gateDelay)
│       │
│       └── ValueMapper.ts            # Value conversion (~80 lines)
│           - mapToScale (from mainFunctions.js)
│           - Linear/logarithmic conversion
│
├── api/
│   ├── routes/
│   │   ├── config.ts                 # Config endpoints (~50 lines)
│   │   ├── sessions.ts               # Session file I/O (~80 lines)
│   │   ├── connections.ts            # Connection CRUD (~100 lines)
│   │   └── tree.ts                   # Tree navigation (~60 lines)
│   │
│   └── handlers/
│       └── ipc-to-rest.ts            # Maps old IPC to REST (~50 lines)
│
├── config/
│   ├── ConfigManager.ts              # Preferences replacement (~100 lines)
│   │   - Load/save config.json
│   │   - Default values
│   │   - Validation
│   │
│   └── defaults.ts                   # Default configuration (~30 lines)
│
└── types/
    ├── ember.ts                      # Ember+ types (~50 lines)
    ├── osc.ts                        # OSC types (~30 lines)
    ├── session.ts                    # Session file types (~30 lines)
    └── config.ts                     # Config types (~40 lines)
```

**Summary: 1289 lines → ~15 files averaging ~85 lines each**

### 7.3 Recommended Modularization for `renderer.js` (1623 lines)

The current `renderer.js` mixes **8 distinct responsibilities**. Split into React components:

```
packages/frontend/src/
├── main.tsx                          # Entry point (~20 lines)
├── App.tsx                           # Main layout (~80 lines)
│
├── components/
│   ├── Header/
│   │   └── Header.tsx                # Logo + branding (~30 lines)
│   │
│   ├── NetworkStatus/
│   │   ├── NetworkStatus.tsx         # Connection indicators (~60 lines)
│   │   │   - Ember+ status (eServerOK, eServConnError)
│   │   │   - OSC RX status (udpportOK, udpportKO)
│   │   │   - OSC TX status (oServerOK)
│   │   │
│   │   └── StatusDot.tsx             # Individual status dot (~30 lines)
│   │
│   ├── TreeView/
│   │   ├── TreeView.tsx              # Main tree component (~150 lines)
│   │   │   - embertree handler
│   │   │   - expandedNode handler
│   │   │   - Node selection
│   │   │
│   │   ├── TreeNode.tsx              # Individual node (~50 lines)
│   │   └── ElementPreview.tsx        # JSON preview panel (~60 lines)
│   │       - expandedElement handler
│   │       - prettyPrintJson display
│   │
│   ├── ConnectionTable/
│   │   ├── ConnectionTable.tsx       # Main table (~200 lines)
│   │   │   - Table rendering
│   │   │   - Row management
│   │   │   - sendFileContent handler
│   │   │
│   │   ├── ConnectionRow.tsx         # Individual row (~80 lines)
│   │   │   - Cell rendering
│   │   │   - Inline editing
│   │   │
│   │   ├── ValueCell.tsx             # Value display with updates (~40 lines)
│   │   │   - sendEmberValue handler
│   │   │   - oReceivedAddr handler
│   │   │
│   │   ├── TypeSelector.tsx          # Type dropdown (~30 lines)
│   │   ├── CurveSelector.tsx         # Math curve dropdown (~30 lines)
│   │   └── DirectionIndicator.tsx    # Direction arrows (~20 lines)
│   │
│   ├── MatrixView/
│   │   ├── MatrixView.tsx            # Matrix visualization (~200 lines)
│   │   │   - createMatrixView logic
│   │   │
│   │   └── MatrixCell.tsx            # Individual crosspoint (~40 lines)
│   │       - check_uncheck logic
│   │
│   ├── Menu/
│   │   ├── MenuBar.tsx               # Menu container (~50 lines)
│   │   └── MenuButtons.tsx           # Individual buttons (~40 lines)
│   │       - load(), save(), saveAs(), prefs()
│   │
│   ├── LogViewer/
│   │   ├── LogViewer.tsx             # Log panel (~60 lines)
│   │   │   - loginfo handler
│   │   │   - resolveError handler
│   │   │
│   │   └── LogEntry.tsx              # Single log entry (~20 lines)
│   │
│   └── ConfigPanel/
│       └── ConfigPanel.tsx           # Settings UI (~100 lines)
│           - Replaces electron-preferences
│
├── hooks/
│   ├── useWebSocket.ts               # WebSocket connection (~80 lines)
│   │   - Real-time updates
│   │   - Reconnection logic
│   │
│   ├── useEmberTree.ts               # Tree state management (~60 lines)
│   ├── useConnections.ts             # Connection state (~80 lines)
│   ├── useConfig.ts                  # Configuration state (~40 lines)
│   └── useLogs.ts                    # Log state (~30 lines)
│
├── services/
│   └── api.ts                        # REST API client (~100 lines)
│       - Typed API calls
│       - Error handling
│
├── store/
│   ├── index.ts                      # Zustand store (~30 lines)
│   ├── connectionStore.ts            # Connection state (~50 lines)
│   ├── treeStore.ts                  # Tree state (~40 lines)
│   └── uiStore.ts                    # UI state (~30 lines)
│
├── utils/
│   ├── formatting.ts                 # Date formatting, etc. (~30 lines)
│   └── tableHelpers.ts               # Table utilities (~40 lines)
│
└── types/
    └── index.ts                      # Frontend types (~50 lines)
```

**Summary: 1623 lines → ~35 files averaging ~45 lines each**

### 7.4 Recommended Modularization for `tree.js` (691 lines)

If keeping custom TreeJS (not replacing with react-arborist):

```
packages/frontend/src/lib/treejs/
├── index.ts                          # Exports (~10 lines)
├── TreeView.ts                       # Main TreeView class (~200 lines)
├── TreeNode.ts                       # TreeNode class (~250 lines)
├── TreeUtil.ts                       # Utility functions (~100 lines)
├── TreeConfig.ts                     # Configuration (~30 lines)
└── types.ts                          # TypeScript types (~50 lines)
```

**Summary: 691 lines → 6 files averaging ~110 lines each**

### 7.5 IPC to REST/WebSocket Mapping

Current IPC events need to be mapped to REST endpoints and WebSocket events:

| IPC Event (Current) | New Implementation | Type |
|---------------------|-------------------|------|
| `newConnection` | `POST /api/connections` | REST |
| `deleteConnection` | `DELETE /api/connections/:id` | REST |
| `expandNode` | `POST /api/tree/:path/expand` | REST |
| `openFile` | `GET /api/sessions/:name` | REST |
| `sendSave` | `PUT /api/sessions/:name` | REST |
| `sendSaveAs` | `POST /api/sessions` | REST |
| `showPreferences` | `GET/PUT /api/config` | REST |
| `reSendOrArgs` | WebSocket `osc:send` | WS |
| `mtx_connect` | `POST /api/matrix/connect` | REST |
| `sendEmberValue` | WebSocket `ember:value` | WS (push) |
| `oReceivedAddr` | WebSocket `osc:received` | WS (push) |
| `embertree` | WebSocket `ember:tree` | WS (push) |
| `expandedNode` | WebSocket `tree:expanded` | WS (push) |
| `loginfo` | WebSocket `log:message` | WS (push) |
| `eServerOK/Error` | WebSocket `status:ember` | WS (push) |
| `udpportOK/KO` | WebSocket `status:osc` | WS (push) |

### 7.6 File Size Guidelines

For the new codebase, follow these guidelines:

| Metric | Guideline |
|--------|-----------|
| **Max lines per file** | 200-250 lines |
| **Ideal lines per file** | 50-150 lines |
| **Max functions per file** | 5-10 |
| **Single responsibility** | 1 clear purpose per file |

### 7.7 Priority Order for Refactoring

1. **High Priority** (Core functionality)
   - `EmberService.ts` - Critical for Ember+ connection
   - `OscService.ts` - Critical for OSC communication
   - `BridgeService.ts` - Orchestrates the two protocols

2. **Medium Priority** (API layer)
   - REST API routes
   - WebSocket handlers
   - ConfigManager

3. **Lower Priority** (Frontend)
   - React components can be built incrementally
   - Start with minimal UI, enhance over time

---

## 8. Backend-Centric Architecture Design

### 8.1 Current Architecture Problems

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT ARCHITECTURE (Problematic)                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐                  ┌─────────────────────┐         │
│   │      FRONTEND       │                  │      BACKEND        │         │
│   │    (renderer.js)    │                  │     (main.js)       │         │
│   │                     │                  │                     │         │
│   │  ┌───────────────┐  │   IPC (heavy)    │  - Ember+ client    │         │
│   │  │ Connection    │◄─┼──────────────────┼► - OSC client       │         │
│   │  │ Table         │  │  every update    │  - NO state storage │         │
│   │  │ (SOURCE OF    │  │  ~50+ messages   │  - Relies on        │         │
│   │  │  TRUTH)       │  │  per second      │    frontend data    │         │
│   │  └───────────────┘  │                  │                     │         │
│   │         ▲           │                  │                     │         │
│   │         │           │                  │                     │         │
│   │   User edits        │                  │                     │         │
│   │   table directly    │                  │                     │         │
│   └─────────────────────┘                  └─────────────────────┘         │
│                                                                             │
│   ISSUES:                                                                   │
│   ❌ Frontend table is source of truth → data loss if browser closes       │
│   ❌ Every Ember+ update → IPC → DOM update → potential bottleneck         │
│   ❌ myRow index used as connection ID → fragile if rows reordered          │
│   ❌ All parameters passed back/forth on each operation                     │
│   ❌ No persistence without explicit save                                   │
│   ❌ Rate limiting (gateDelay) tied to UI updates                          │
│   ❌ directions[] array managed in backend but synced via IPC              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 New Backend-Centric Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    NEW ARCHITECTURE (Backend-Centric)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────┐                  ┌─────────────────────────────┐ │
│   │      FRONTEND       │                  │         BACKEND             │ │
│   │    (React SPA)      │                  │    (Node.js Service)        │ │
│   │                     │                  │                             │ │
│   │  - Display only     │   REST/WS        │  ┌─────────────────────┐   │ │
│   │  - Configuration UI │◄────────────────►│  │  ConnectionManager  │   │ │
│   │  - Monitoring       │   (lightweight)  │  │  (SOURCE OF TRUTH)  │   │ │
│   │  - Logs viewer      │                  │  │                     │   │ │
│   │                     │   WebSocket:     │  │  - In-memory Map    │   │ │
│   │  "Set & Forget"     │   status updates │  │  - Auto-persist     │   │ │
│   │  after config       │   (batched)      │  │  - UUID-based IDs   │   │ │
│   │                     │                  │  └─────────────────────┘   │ │
│   └─────────────────────┘                  │            │               │ │
│                                            │            ▼               │ │
│                                            │  ┌─────────────────────┐   │ │
│                                            │  │    BridgeEngine     │   │ │
│                                            │  │  (Processing Core)  │   │ │
│                                            │  │                     │   │ │
│                                            │  │  - Value mapping    │   │ │
│                                            │  │  - Rate limiting    │   │ │
│                                            │  │  - Direction mgmt   │   │ │
│                                            │  │  - NO IPC needed    │   │ │
│                                            │  └─────────────────────┘   │ │
│                                            │        │         │         │ │
│                                            │        ▼         ▼         │ │
│                                            │  ┌─────────┐ ┌─────────┐   │ │
│                                            │  │ Ember+  │ │   OSC   │   │ │
│                                            │  │ Service │ │ Service │   │ │
│                                            │  └─────────┘ └─────────┘   │ │
│                                            └─────────────────────────────┘ │
│                                                                             │
│   BENEFITS:                                                                 │
│   ✅ Backend owns all connection state → survives frontend disconnect      │
│   ✅ Frontend optional after initial config → headless operation possible  │
│   ✅ Batched WebSocket updates → reduced traffic                           │
│   ✅ UUID connection IDs → stable references                               │
│   ✅ Auto-persistence → no data loss                                       │
│   ✅ Rate limiting in backend → consistent timing                          │
│   ✅ Full processing without UI → professional reliability                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Core Backend Components

#### 8.3.1 ConnectionManager (Source of Truth)

```typescript
// packages/backend/src/core/ConnectionManager.ts

interface Connection {
  id: string;                    // UUID, stable identifier
  emberPath: string;             // Ember+ parameter path
  oscAddress: string;            // OSC address
  
  // Value mapping configuration
  emberMin: number;
  emberMax: number;
  oscMin: number;
  oscMax: number;
  factor: number;
  curve: 'lin' | 'log';
  
  // Type information
  parameterType: 'INTEGER' | 'BOOLEAN' | 'STRING' | 'ENUM' | 'REAL';
  enumValues?: string[];
  
  // Runtime state (NOT synced to frontend on every change)
  currentEmberValue: any;
  currentOscValue: any;
  direction: 'idle' | 'ember-to-osc' | 'osc-to-ember';
  lastActivity: number;
  isSubscribed: boolean;
  error?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

class ConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private persistPath: string;
  private autoSaveTimer: NodeJS.Timer;
  
  // CRUD operations
  create(config: ConnectionConfig): Connection;
  update(id: string, changes: Partial<ConnectionConfig>): Connection;
  delete(id: string): void;
  get(id: string): Connection | undefined;
  getAll(): Connection[];
  getByEmberPath(path: string): Connection | undefined;
  getByOscAddress(address: string): Connection[];
  
  // Bulk operations
  importSession(sessionData: SessionFile): void;
  exportSession(): SessionFile;
  
  // Persistence (auto-save every N seconds + on change)
  private persist(): void;
  private load(): void;
  
  // State updates (internal, no IPC)
  updateRuntimeState(id: string, state: Partial<RuntimeState>): void;
}
```

#### 8.3.2 BridgeEngine (Processing Core)

```typescript
// packages/backend/src/core/BridgeEngine.ts

class BridgeEngine {
  private connectionManager: ConnectionManager;
  private emberService: EmberService;
  private oscService: OscService;
  private rateLimiter: RateLimiter;
  
  // Ember+ → OSC flow (no frontend involvement)
  private handleEmberUpdate(path: string, value: any): void {
    const conn = this.connectionManager.getByEmberPath(path);
    if (!conn) return;
    
    // Rate limiting check
    if (!this.rateLimiter.canProcess(conn.id, 'ember')) return;
    
    // Direction conflict check
    if (conn.direction === 'osc-to-ember') return;
    
    // Update internal state
    this.connectionManager.updateRuntimeState(conn.id, {
      currentEmberValue: value,
      direction: 'ember-to-osc',
      lastActivity: Date.now()
    });
    
    // Value mapping
    const oscValue = this.mapValue(value, conn, 'ember-to-osc');
    
    // Send OSC (async, fire-and-forget)
    this.oscService.send(conn.oscAddress, oscValue, conn.parameterType);
    
    // Schedule direction reset
    this.rateLimiter.scheduleReset(conn.id, 500);
    
    // NO IPC to frontend here! State is internal.
  }
  
  // OSC → Ember+ flow (no frontend involvement)
  private handleOscMessage(address: string, args: any[]): void {
    const connections = this.connectionManager.getByOscAddress(address);
    
    for (const conn of connections) {
      if (!this.rateLimiter.canProcess(conn.id, 'osc')) continue;
      if (conn.direction === 'ember-to-osc') continue;
      
      // Update internal state
      this.connectionManager.updateRuntimeState(conn.id, {
        currentOscValue: args[0],
        direction: 'osc-to-ember',
        lastActivity: Date.now()
      });
      
      // Value mapping
      const emberValue = this.mapValue(args[0], conn, 'osc-to-ember');
      
      // Send to Ember+ (async)
      this.emberService.setValue(conn.emberPath, emberValue);
      
      // Schedule direction reset
      this.rateLimiter.scheduleReset(conn.id, 500);
    }
  }
  
  // Start all subscriptions from stored connections
  async activateAllConnections(): Promise<void>;
  
  // Single connection activation
  async activateConnection(id: string): Promise<void>;
  
  // Deactivation
  async deactivateConnection(id: string): Promise<void>;
}
```

#### 8.3.3 RateLimiter (Anti-Feedback Loop)

```typescript
// packages/backend/src/core/RateLimiter.ts

class RateLimiter {
  private lastProcessed: Map<string, { ember: number; osc: number }>;
  private pendingResets: Map<string, NodeJS.Timeout>;
  private minInterval: number = 50; // ms between same-direction updates
  
  canProcess(connectionId: string, source: 'ember' | 'osc'): boolean;
  scheduleReset(connectionId: string, delayMs: number): void;
  getDirection(connectionId: string): 'idle' | 'ember-to-osc' | 'osc-to-ember';
}
```

### 8.4 Frontend Role (Lightweight)

The frontend becomes a **monitoring and configuration dashboard**, not a data store:

```typescript
// Frontend responsibilities (minimal)

interface FrontendRole {
  // Configuration (REST API calls)
  configureConnection(config: ConnectionConfig): Promise<void>;
  updateConnection(id: string, changes: Partial<ConnectionConfig>): Promise<void>;
  deleteConnection(id: string): Promise<void>;
  
  // Session management (REST)
  loadSession(name: string): Promise<void>;
  saveSession(name: string): Promise<void>;
  
  // Monitoring (WebSocket, batched updates)
  subscribeToUpdates(): WebSocket;  // Receives batched state every 100-500ms
  
  // Tree browsing (REST)
  expandTreeNode(path: string): Promise<TreeNode[]>;
  getElementDetails(path: string): Promise<ElementDetails>;
}
```

#### 8.4.1 WebSocket Updates (Batched)

Instead of individual IPC messages, batch updates:

```typescript
// Backend sends batched updates every 100ms (configurable)
interface BatchedUpdate {
  timestamp: number;
  connections: {
    [id: string]: {
      emberValue?: any;      // Only if changed
      oscValue?: any;        // Only if changed
      direction?: string;    // Only if changed
      error?: string;        // Only if changed
    };
  };
  status: {
    ember?: ConnectionStatus;  // Only if changed
    oscRx?: ConnectionStatus;  // Only if changed
    oscTx?: ConnectionStatus;  // Only if changed
  };
  logs?: string[];  // Batched log messages
}

// Update frequency based on activity
class UpdateBatcher {
  private pendingUpdates: Map<string, Partial<ConnectionState>>;
  private batchInterval: number = 100;  // Fast during activity
  private idleInterval: number = 1000;  // Slow when idle
  
  queueUpdate(connectionId: string, changes: Partial<ConnectionState>): void;
  private flush(): void;  // Send batched WebSocket message
}
```

### 8.5 "Set and Forget" Operation Modes

#### 8.5.1 Headless Mode (No UI Required)

```bash
# Start service with session file, no UI needed
docker run -d mcxosc-service \
  --session /config/my_session.json \
  --ember-host 192.168.1.100 \
  --ember-port 9000 \
  --osc-rx-port 8000 \
  --osc-tx-host 192.168.1.200 \
  --osc-tx-port 9000

# Service runs autonomously, UI optional for monitoring
```

#### 8.5.2 Auto-Start on Boot

```typescript
// packages/backend/src/startup/AutoStart.ts

class AutoStartManager {
  // Load last session on startup
  async initialize(): Promise<void> {
    const config = await this.loadConfig();
    
    if (config.autoConnect.enabled) {
      await this.emberService.connect(config.ember);
      await this.oscService.start(config.osc);
    }
    
    if (config.autoLoadSession.enabled) {
      const session = await this.loadSession(config.autoLoadSession.path);
      await this.connectionManager.importSession(session);
      
      if (config.autoActivate.enabled) {
        await this.bridgeEngine.activateAllConnections();
      }
    }
    
    console.log('MCxOSC service ready - operating autonomously');
  }
}
```

#### 8.5.3 Configuration File Structure

```json
// /config/mcxosc.config.json
{
  "ember": {
    "host": "192.168.1.100",
    "port": 9000,
    "autoConnect": true,
    "reconnectInterval": 5000
  },
  "osc": {
    "rxPort": 8000,
    "txHost": "192.168.1.200",
    "txPort": 9000
  },
  "session": {
    "autoLoad": "/config/sessions/default.session",
    "autoSaveInterval": 30000,
    "backupCount": 5
  },
  "bridge": {
    "rateLimit": 50,
    "directionResetDelay": 500,
    "autoActivateOnLoad": true
  },
  "ui": {
    "batchUpdateInterval": 100,
    "logRetention": 1000
  }
}
```

### 8.6 Data Flow Comparison

#### Current Flow (Problematic)
```
Ember+ update → main.js → IPC → renderer.js → DOM update → user sees change
OSC received  → main.js → IPC → renderer.js → DOM update → user sees change
User edits    → renderer.js → IPC → main.js → process → IPC → renderer.js

Problem: Every single value change triggers IPC + DOM update
         At 50 updates/sec = major performance bottleneck
```

#### New Flow (Optimized)
```
Ember+ update → BridgeEngine → ConnectionManager (memory) → OSC send
                                     └─→ UpdateBatcher (queued)
                                              └─→ WebSocket (batched, 10Hz)
                                                       └─→ Frontend (optional)

OSC received  → BridgeEngine → ConnectionManager (memory) → Ember+ send
                                     └─→ UpdateBatcher (queued)

Benefit: Processing happens instantly in memory
         UI updates are batched and optional
         System works without frontend connected
```

### 8.7 Performance Characteristics

| Metric | Current | New Architecture |
|--------|---------|------------------|
| **Updates/sec handling** | ~50 (limited by IPC) | ~1000+ (in-memory) |
| **Latency (Ember→OSC)** | ~10-50ms (IPC overhead) | ~1-5ms (direct) |
| **Frontend dependency** | Required | Optional |
| **Data persistence** | Manual save only | Auto-persist |
| **Crash recovery** | Data lost | Auto-restore |
| **Multi-client support** | Single window | Multiple browsers |
| **Headless operation** | Not possible | Full support |

### 8.8 Migration Path

1. **Phase 1**: Create backend with ConnectionManager + BridgeEngine
2. **Phase 2**: Implement REST API for configuration
3. **Phase 3**: Add WebSocket for monitoring (batched)
4. **Phase 4**: Build minimal React UI
5. **Phase 5**: Add headless mode support
6. **Phase 6**: Docker packaging with config persistence
