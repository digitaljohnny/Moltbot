# Moltbot/Clawdbot Architecture & Workflows

This document provides comprehensive Mermaid diagrams to orient AI agents through the Moltbot/Clawdbot project architecture and workflows.

## System Architecture Overview

```mermaid
graph TB
    subgraph "Host Machine"
        Docker[Docker Container<br/>moltbot-setup<br/>moltbot-img:latest]
    end
    
    subgraph "Container: moltbot-setup"
        Gateway[Gateway Service<br/>clawdbot gateway<br/>PID1 Process<br/>Port 18789]
        Config[Configuration<br/>/root/.clawdbot/clawdbot.json]
        Workspace[Agent Workspace<br/>/root/clawd]
    end
    
    subgraph "Gateway Components"
        HTTP[HTTP Server<br/>REST API]
        WS[WebSocket Server<br/>Real-time Updates]
        AgentMgr[Agent Manager<br/>Coordinates Agents]
    end
    
    subgraph "Channels"
        Telegram[Telegram Channel<br/>Bot Token Auth]
        iMessage[iMessage Channel<br/>Disabled by Default]
        WebChat[WebChat Channel<br/>Control UI]
    end
    
    subgraph "Agents"
        Agent1[AI Agent<br/>Model: openai/gpt-5.2<br/>Workspace: /root/clawd]
        Agent2[Additional Agents<br/>Configurable]
    end
    
    subgraph "Skills"
        GolfSkill[golf-course-research<br/>SKILL.md]
        PlacesSkill[google-places<br/>SKILL.md]
        VestigeSkill[vestige-memory<br/>SKILL.md]
        OtherSkills[Other Skills<br/>skills/ directory]
    end
    
    subgraph "Plugins"
        TelegramPlugin[Telegram Plugin<br/>Provider]
        iMessagePlugin[iMessage Plugin<br/>Provider]
    end
    
    subgraph "Hooks"
        SessionHook[session-memory<br/>Event Handler]
        CommandHook[command-logger<br/>Event Handler]
    end
    
    subgraph "Control UI"
        WebUI[Web Interface<br/>http://127.0.0.1:18789/]
        KanbanBoard[Kanban Board<br/>Operations View]
        OperationsAPI[Operations API<br/>/api/operations]
    end
    
    Docker --> Gateway
    Gateway --> Config
    Gateway --> Workspace
    Gateway --> HTTP
    Gateway --> WS
    Gateway --> AgentMgr
    
    HTTP --> OperationsAPI
    WS --> WebUI
    HTTP --> WebUI
    
    AgentMgr --> Agent1
    AgentMgr --> Agent2
    
    Telegram --> TelegramPlugin
    iMessage --> iMessagePlugin
    WebChat --> WebUI
    
    TelegramPlugin --> Gateway
    iMessagePlugin --> Gateway
    
    Agent1 --> GolfSkill
    Agent1 --> PlacesSkill
    Agent1 --> VestigeSkill
    Agent1 --> OtherSkills
    
    Gateway --> SessionHook
    Gateway --> CommandHook
    
    WebUI --> KanbanBoard
    OperationsAPI --> KanbanBoard
    
    style Gateway fill:#4a90e2,color:#fff
    style Agent1 fill:#50c878,color:#fff
    style WebUI fill:#ff6b6b,color:#fff
    style Docker fill:#95a5a6,color:#fff
```

## Message Flow Architecture

```mermaid
sequenceDiagram
    participant User
    participant Channel as Message Channel<br/>(Telegram/iMessage/WebChat)
    participant Gateway as Gateway Service
    participant Agent as AI Agent<br/>(openai/gpt-5.2)
    participant Skill as Skill<br/>(golf-course-research, etc.)
    participant Tools as External Tools<br/>(Web Search, APIs)
    participant Hook as Hooks<br/>(session-memory, command-logger)
    participant UI as Control UI<br/>(Kanban Board)
    
    User->>Channel: Sends Message
    Channel->>Gateway: Receives Message Event
    Gateway->>Hook: Trigger: message-received
    
    Gateway->>Agent: Route Message to Agent
    Agent->>Agent: Analyze Message<br/>Determine Intent
    
    alt Skill Required
        Agent->>Skill: Load SKILL.md<br/>Read Instructions
        Skill-->>Agent: Return Skill Instructions
        Agent->>Agent: Execute Skill Workflow
        
        loop Skill Steps
            Agent->>Tools: Call External Tool<br/>(Web Search, API, etc.)
            Tools-->>Agent: Return Results
            Agent->>Agent: Process Results
            Agent->>UI: Update Operation Status<br/>(via WebSocket)
        end
        
        Agent->>Skill: Complete Skill Execution
    else Direct Response
        Agent->>Agent: Generate Response
    end
    
    Agent->>Hook: Trigger: agent-response
    Agent->>Gateway: Return Response
    Gateway->>Channel: Send Response to User
    Channel->>User: Deliver Message
    
    Gateway->>UI: Emit Operation Update<br/>(WebSocket Event)
    UI->>UI: Update Kanban Board<br/>Display Operation Status
```

## Operation Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Pending: Operation Created
    
    Pending --> InProgress: Agent Starts Processing
    InProgress --> InProgress: Step Updates<br/>Token Tracking<br/>Activity Updates
    
    InProgress --> Completed: Success
    InProgress --> Failed: Error Occurs
    InProgress --> Cancelled: User Cancels
    
    Completed --> [*]
    Failed --> [*]
    Cancelled --> [*]
    
    note right of Pending
        Operation created with:
        - Type (skill/tool_call/agent_task)
        - Name & Description
        - Initial Steps
        - Metadata
    end note
    
    note right of InProgress
        During execution:
        - Steps updated (running/completed)
        - Tokens tracked (prompt/completion)
        - Cost calculated
        - Duration tracked
        - Activity logged
        - WebSocket events emitted
    end note
    
    note right of Completed
        Final state includes:
        - All steps completed
        - Total tokens & cost
        - Final duration
        - Success disposition
        - Results/metadata
    end note
```

## Component Relationships

```mermaid
graph LR
    subgraph "Configuration Layer"
        Config[clawdbot.json]
        GatewayConfig[gateway:<br/>port, bind, auth]
        ChannelConfig[channels:<br/>telegram, imessage]
        PluginConfig[plugins:<br/>entries]
        SkillConfig[skills:<br/>entries]
        AgentConfig[agents:<br/>model, workspace]
        HookConfig[hooks:<br/>session-memory,<br/>command-logger]
    end
    
    subgraph "Runtime Layer"
        Gateway[Gateway Service]
        Channels[Channels]
        Plugins[Plugins]
        Agents[Agents]
        Skills[Skills]
        Hooks[Hooks]
    end
    
    subgraph "Data Layer"
        Workspace[Workspace<br/>/root/clawd]
        SkillFiles[Skill Files<br/>SKILL.md]
        ConfigFiles[Config Files<br/>clawdbot.json]
    end
    
    subgraph "Interface Layer"
        REST[REST API<br/>/api/operations]
        WS[WebSocket<br/>/ws/operations]
        UI[Control UI<br/>:18789]
    end
    
    Config --> GatewayConfig
    Config --> ChannelConfig
    Config --> PluginConfig
    Config --> SkillConfig
    Config --> AgentConfig
    Config --> HookConfig
    
    GatewayConfig --> Gateway
    ChannelConfig --> Channels
    PluginConfig --> Plugins
    SkillConfig --> Skills
    AgentConfig --> Agents
    HookConfig --> Hooks
    
    Gateway --> Channels
    Gateway --> Plugins
    Gateway --> Agents
    Gateway --> Hooks
    
    Agents --> Skills
    Skills --> SkillFiles
    Skills --> Workspace
    
    Gateway --> REST
    Gateway --> WS
    Gateway --> UI
    
    REST --> UI
    WS --> UI
    
    style Gateway fill:#4a90e2,color:#fff
    style Config fill:#f39c12,color:#fff
    style UI fill:#ff6b6b,color:#fff
```

## Skill Execution Workflow

```mermaid
flowchart TD
    Start([User Request]) --> Detect{Detect Skill<br/>Needed?}
    
    Detect -->|Yes| LoadSkill[Load SKILL.md<br/>Read Instructions]
    Detect -->|No| DirectResponse[Generate Direct Response]
    
    LoadSkill --> ParseSkill[Parse Skill Metadata<br/>name, description]
    ParseSkill --> ExecuteSkill[Execute Skill Workflow]
    
    ExecuteSkill --> CreateOp[Create Operation Record<br/>type: skill<br/>status: pending]
    CreateOp --> InitSteps[Initialize Steps<br/>from Skill Definition]
    
    InitSteps --> StepLoop{More Steps?}
    
    StepLoop -->|Yes| StartStep[Start Step<br/>status: running]
    StartStep --> ExecuteStep[Execute Step Logic]
    
    ExecuteStep --> CallTools{Call External<br/>Tools?}
    CallTools -->|Yes| WebSearch[Web Search]
    CallTools -->|Yes| API[API Calls]
    CallTools -->|Yes| Playwright[Browser Automation]
    
    WebSearch --> ProcessResults[Process Results]
    API --> ProcessResults
    Playwright --> ProcessResults
    
    ProcessResults --> UpdateStep[Update Step<br/>status: completed]
    UpdateStep --> TrackTokens[Track Token Usage<br/>from LLM Responses]
    TrackTokens --> EmitWS[Emit WebSocket Event<br/>Operation Update]
    EmitWS --> StepLoop
    
    StepLoop -->|No| Finalize[Finalize Operation<br/>status: completed]
    Finalize --> ReturnResult[Return Structured Result<br/>JSON Response]
    
    ReturnResult --> End([Complete])
    DirectResponse --> End
    
    style Start fill:#4a90e2,color:#fff
    style ExecuteSkill fill:#50c878,color:#fff
    style CreateOp fill:#f39c12,color:#fff
    style End fill:#95a5a6,color:#fff
```

## Docker & Deployment Architecture

```mermaid
graph TB
    subgraph "Host Machine (macOS/Linux)"
        DockerHost[Docker Engine]
        PortMapping[Port Mapping<br/>127.0.0.1:18789:18789]
    end
    
    subgraph "Container: moltbot-setup"
        PID1[PID1 Process<br/>clawdbot gateway<br/>--port 18789<br/>--bind lan]
        
        subgraph "File System"
            ConfigFile[/root/.clawdbot/clawdbot.json]
            WorkspaceDir[/root/clawd/]
            SkillDir[/root/clawd/skills/]
        end
        
        subgraph "Network"
            ContainerPort[Port 18789<br/>LAN Binding]
        end
    end
    
    subgraph "External Access"
        Browser[Browser<br/>http://127.0.0.1:18789/]
        TelegramAPI[Telegram API<br/>Bot Token]
        DevicePairing[Device Pairing<br/>Token Auth]
    end
    
    DockerHost --> PortMapping
    PortMapping --> ContainerPort
    ContainerPort --> PID1
    
    PID1 --> ConfigFile
    PID1 --> WorkspaceDir
    PID1 --> SkillDir
    PID1 --> ContainerPort
    
    ContainerPort --> Browser
    ContainerPort --> DevicePairing
    PID1 --> TelegramAPI
    
    style PID1 fill:#4a90e2,color:#fff
    style DockerHost fill:#95a5a6,color:#fff
    style Browser fill:#ff6b6b,color:#fff
```

## Control UI Integration

```mermaid
graph TB
    subgraph "Gateway HTTP Server"
        RESTAPI[REST API Endpoints]
        WSServer[WebSocket Server]
        StaticFiles[Static File Server]
    end
    
    subgraph "Control UI Routes"
        Home[/ - Home/Dashboard]
        Operations[/operations - Kanban Board]
        Settings[/settings - Configuration]
    end
    
    subgraph "Kanban Board Components"
        Board[KanbanBoard.tsx<br/>Main Container]
        Column[KanbanColumn.tsx<br/>Status Columns]
        Card[OperationCard.tsx<br/>Operation Cards]
        Modal[OperationDetailModal.tsx<br/>Detail View]
    end
    
    subgraph "Data Layer"
        Hook[useOperations Hook<br/>Data Management]
        Service[operationService.ts<br/>API Client]
        Types[operation.ts<br/>TypeScript Types]
    end
    
    subgraph "Real-time Updates"
        WSConnection[WebSocket Connection<br/>ws://127.0.0.1:18789/ws/operations]
        Polling[Polling Fallback<br/>If WS Fails]
    end
    
    RESTAPI --> Service
    WSServer --> WSConnection
    StaticFiles --> Home
    StaticFiles --> Operations
    StaticFiles --> Settings
    
    Operations --> Board
    Board --> Column
    Column --> Card
    Card --> Modal
    
    Service --> Hook
    Hook --> Board
    WSConnection --> Hook
    Polling --> Hook
    
    Types --> Service
    Types --> Hook
    Types --> Card
    
    style RESTAPI fill:#4a90e2,color:#fff
    style Board fill:#50c878,color:#fff
    style WSConnection fill:#f39c12,color:#fff
```

## Key Workflows Summary

### 1. Message Processing Workflow
1. User sends message via Channel (Telegram/iMessage/WebChat)
2. Gateway receives message event
3. Hooks triggered (session-memory, command-logger)
4. Message routed to appropriate Agent
5. Agent analyzes intent and determines if Skill needed
6. If Skill required: Load SKILL.md, execute workflow
7. Agent generates response using LLM (openai/gpt-5.2)
8. Response sent back through Channel to User
9. Operation updates emitted via WebSocket to Control UI

### 2. Skill Execution Workflow
1. Agent detects need for Skill (auto-detect or manual)
2. Load SKILL.md file from workspace
3. Parse frontmatter (name, description)
4. Create Operation record (type: skill, status: pending)
5. Initialize steps from Skill definition
6. Execute each step:
   - Update step status (running → completed)
   - Call external tools (web search, APIs, Playwright)
   - Process results
   - Track token usage from LLM calls
   - Emit WebSocket updates
7. Finalize operation (status: completed)
8. Return structured result

### 3. Operation Tracking Workflow
1. Operation created when skill/tool/agent task starts
2. Operation record includes: type, name, steps, metadata
3. Steps updated as operation progresses
4. Token usage tracked from LLM API responses
5. Cost calculated based on token usage and model
6. Duration tracked from start to completion
7. WebSocket events emitted on each update
8. Control UI receives updates and displays in Kanban Board
9. Operation finalized with disposition (success/failure)

### 4. Configuration Management Workflow
1. Configuration stored in `/root/.clawdbot/clawdbot.json`
2. Gateway reads config on startup
3. Config sections: gateway, channels, plugins, skills, agents, hooks
4. Changes can be made via CLI: `clawdbot config set <path> <value>`
5. Gateway restart required for some config changes
6. Device pairing managed via `clawdbot devices approve`

## Key File Locations

- **Config**: `/root/.clawdbot/clawdbot.json` (inside container)
- **Workspace**: `/root/clawd` (inside container)
- **Skills**: `/root/clawd/skills/` or `skills_for_moltbot/` (project)
- **Control UI**: `ui/kanban-board/` (project)
- **Gateway**: Runs as PID1 in container
- **Port**: `127.0.0.1:18789` (host) → `18789` (container)

## Common Commands Reference

```bash
# Container Management
docker ps -a --filter "name=moltbot-setup"
docker start moltbot-setup
docker restart moltbot-setup
docker logs moltbot-setup

# Gateway Management
docker exec moltbot-setup clawdbot gateway status
docker exec moltbot-setup clawdbot gateway restart

# Configuration
docker exec moltbot-setup clawdbot config get <path>
docker exec moltbot-setup clawdbot config set <path> <value>

# Device Pairing
docker exec moltbot-setup clawdbot devices list
docker exec moltbot-setup clawdbot devices approve <request-id>

# Logs
docker exec moltbot-setup clawdbot logs
```

## Architecture Principles

1. **Gateway-Centric**: Gateway is the central service managing all connections
2. **Modular Skills**: Skills are self-contained packages with SKILL.md files
3. **Event-Driven**: Hooks provide event handling for extensibility
4. **Real-time Updates**: WebSocket provides live operation tracking
5. **Docker Isolation**: Containerized deployment for consistency
6. **Token-Based Auth**: Secure access via tokens and device pairing
7. **Workspace-Based**: Agents operate in isolated workspace directories
