# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-03-25

### Added - Sprint & Story API Enhancements

#### New Sprint Tools
- **forloopSprintCreate** - Create new sprint with dates and settings
  - Arguments: title, description, startDate, endDate, isPrivate, organizationId
  - Confirmation messages with sprint details
- **forloopSprintUpdate** - Update sprint details
  - Arguments: sprintId, title, description, startDate, endDate, isPrivate
  - Partial updates supported
- **forloopSprintDelete** - Delete sprint (with confirmation)
  - Arguments: sprintId, confirm (required for safety)
  - Warning message before deletion

#### New Story Tools
- **forloopStoryGet** - Retrieve story by ID
  - Arguments: storyId
  - Returns: story details, sprint info, assignee info, description

#### Enhanced Story Create
- **forloopStoryCreate** - Added missing server-compatible arguments:
  - `status` - Initial story status (default: 'todo')
  - `assigneeId` - User ID for assignment
  - `assigneeType` - 'user' or 'agent' (default: 'user')
  - `x`, `y` - Canvas position coordinates
  - `zIndex` - Canvas layering order
  - `templateId` - Template for story creation
  - `metadata` - Additional JSON metadata

#### API Client Updates
- **CreateStoryRequest interface** - Extended with all server-compatible fields
  - Matches server expectations in `server_lambda/src/controllers/storyController.ts`
  - Proper type definitions for all optional fields

---

## [2.1.0] - 2026-03-24

### Added - Phase 2a: Agents & Skills Integration

#### Custom Agents
- **forLoopPlanner** (Primary Agent) - Sprint planning specialist
  - Tab-switchable primary agent for sprint workflows
  - Guides users through sprint planning process
  - Creates stories with INVEST criteria
  - Invokes forLoopStoryEvaluator for estimates
  - Auto-loads sprint-planning, story-creation, story-points skills
  
- **forLoopStoryEvaluator** (Subagent) - Story point estimation specialist
  - Invoked via `@forLoopStoryEvaluator` mention
  - 4-dimension analysis: complexity, effort, uncertainty, risk
  - Provides confidence levels and reasoning
  - Suggests splitting stories >5 points
  - Calibration with historical stories

#### Workflow Skills
- **sprint-planning** skill - Structured sprint planning workflow
  - Process flowchart with decision points
  - Pre-planning and during-planning checklists
  - Tool usage examples (sprint.list, sprint.get, story.create)
  - Capacity planning calculations
  - Common mistakes and fixes
  
- **story-creation** skill - User story best practices
  - User story template (As a... I want... So that...)
  - Given/When/Then acceptance criteria format
  - INVEST criteria checklist
  - Story sizing guidelines
  - Epic decomposition examples
  
- **story-points** skill - Estimation framework
  - 4-dimension estimation approach
  - Points reference scale (0-10)
  - Estimation techniques (triangulation, affinity mapping)
  - Factors checklist (technical, knowledge, testing)
  - Calibration examples by point value

#### Configuration
- Skill permissions system integration
- Agent-specific permission overrides
- Auto-loading skills based on permissions

### Changed
- Updated package.json to include `agent/` and `skills/` directories
- Enhanced README.md with agents and skills documentation
- Updated version to 2.1.0

### Technical
- Skills follow Superpowers pattern (frontmatter, flowcharts, checklists)
- Agents follow OpenAgentsControl pattern (markdown with frontmatter)
- Files distributed via npm/git package

---

## [2.0.0] - 2026-03-23

### Added - Phase 2: AI Agent Integration

#### New Tools
- `forloopAgentSuggest` - Get AI-powered suggestions for story breakdowns, estimates, and planning
- `forloopAgentBreakdown` - Automatically break down stories into actionable subtasks
- `forloopAgentEstimate` - Get AI-suggested story points with rationale
- `forloopAgentHistory` - View and filter conversation history with AI agents
- `forloopAgentClear` - Clear conversation history (individual or bulk)

#### Server-Side Features
- New `/api/agents/suggestions` endpoint for context-aware AI suggestions
- New `/api/agents/stories/:id/breakdown` for story task decomposition
- New `/api/agents/stories/:id/estimate` for story point estimation
- New `/api/agents/conversations` for conversation history management
- Integration with existing WebSocket/Redis infrastructure for async AI responses
- Support for conversation tracking by sprint and agent

#### Agent Capabilities
- **Breakdown suggestions**: Context-aware task decomposition based on story type
  - Login/auth features → authentication middleware, password encryption
  - Analytics features → data queries, visualization components
  - Generic → database, API, UI, tests, documentation
  
- **Estimation**: Smart story point calculation
  - Considers complexity, priority, description length
  - Suggests points on Fibonacci-like scale (1-13)
  - Provides estimation rationale
  
- **Conversation tracking**: Full history management
  - Filter by sprint
  - View request/response pairs
  - Delete individual or bulk conversations

### Changed
- Updated plugin architecture to support Phase 2 features
- Enhanced API client with new methods for agent operations

### Technical
- Added `agentSuggestionController.ts`
- Added `conversationController.ts`
- Added `agentSuggestionRoutes.ts`
- Updated `app.ts` to register agent routes
- Added type definitions for agent suggestions and conversations

---

## [1.0.0] - 2026-03-23

### Added - Phase 1: Foundation & Authentication

#### Core Features
- `forloopTokenSet` - Set/update ForLoop API token
- `forloopTokenGet` - Check if API token is configured
- `forloopSprintGet` - Get sprint details with stories and files
- `forloopSprintList` - List all accessible sprints
- `forloopStoryCreate` - Create new stories
- `forloopStoryUpdate` - Update existing stories
- `forloopStoryDelete` - Delete stories
- `forloopAgentQuery` - Query AI agents for analysis

#### Server-Side
- `OpencodeApiToken` database table with proper indexes
- Token-based authentication middleware
- API token validation with scope enforcement
- RESTful endpoints at `/api/opencode/*`

#### Infrastructure
- Token storage in `~/.config/forloop/tokens.json`
- Automatic sprint ID detection from git branches
- Environment variable injection via `shell.env` hook
- Installation scripts for local and global deployment

#### Documentation
- Comprehensive README.md
- Installation scripts (5 methods)
- Skill documentation
- MIT License

---

## Version History

| Version | Release Date | Phase | Features |
|---------|--------------|-------|----------|
| 0.1.0 | 2026-03-20 | Pre-Alpha | Initial prototype |
| 1.0.0 | 2026-03-23 | Phase 1 | Foundation & Authentication |
| 2.0.0 | 2026-03-23 | Phase 2 | AI Agent Integration |
| 2.1.0 | 2026-03-24 | Phase 2a | Agents & Skills Integration |
| 3.0.0 | TBA | Phase 3 | Autopilot & AWS |

---

## Semantic Versioning

This project follows Semantic Versioning (SemVer):

- **MAJOR** version for incompatible changes (e.g., breaking API changes)
- **MINOR** version for backwards-compatible features
- **PATCH** version for backwards-compatible bug fixes

**Format:** `MAJOR.MINOR.PATCH` (e.g., 2.0.0)

---

## Upcoming Features (v3.0.0 - Phase 3)

Planned for next release:

- `forloop.autopilot.run` - Trigger autopilot development cycles
- `forloop.autopilot.approve` - Approve/reject AI-generated change sets
- `forloop.aws.deploy_lambda` - Deploy Lambda functions directly
- `forloop.aws.create_resource` - Create AWS resources via AI
- Enhanced WebSocket support for real-time AI responses
- Multi-agent coordination features

---

**Unreleased** changes can be viewed on the `main` branch.

[2.0.0]: https://github.com/forloop-cc/forloop-opencode-plugin/releases/tag/v2.0.0
[1.0.0]: https://github.com/forloop-cc/forloop-opencode-plugin/releases/tag/v1.0.0
