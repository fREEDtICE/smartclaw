# Frame AI Agent Platform — Layer 1 Overview Architecture

## 1. Document Purpose

This document defines the **product goals, architectural boundaries, core concepts, and top-level system design** of the Frame AI Agent Platform.

It is the **shared reference document** for:

* product alignment
* platform architecture alignment
* subsystem decomposition
* future detailed design specs

This document is intentionally **high level**. It does not define subsystem internals in full detail. Those belong in:

* **Layer 1.5**: cross-cutting contracts and system invariants
* **Layer 2**: subsystem design documents

---

## 2. Product Goal

Build a **modular, auditable, production-grade AI agent platform** that enables teams to create AI agent products without rebuilding core infrastructure.

The platform should support:

* multi-channel interaction(chat, email, messaging)
* universal identity across channels
* stateful and resumable execution
* provider-agnostic model access
* tool and skill execution
* scoped memory with lifecycle control
* shared retrieval infrastructure
* sandboxed execution
* team and application collaboration
* full observability and replay
* controlled self-improvement

### Design objective

Separate:

* **platform infrastructure**: runtime, memory, retrieval, tools, policy, sandbox, observability
  from
* **application logic**: product-specific agents, workflows, and user experiences

---

## 3. System Scope

### In scope

The platform is responsible for:

* channel integration and canonical message normalization
* identity and thread/session management
* agent runtime orchestration
* context assembly
* tool and skill execution
* memory management
* retrieval infrastructure
* sandbox execution boundaries
* policy enforcement and approval flows
* observability, tracing, replay, and cost controls
* controlled self-improvement workflows

### Out of scope

The platform does not directly define:

* end-user product UX
* business-specific workflows
* domain-specific agent behavior
* model training or foundation-model development

---

## 4. Core Principles

The platform should follow these principles:

1. **State-first execution**
   Every agent run must be resumable, inspectable, and checkpointable.

2. **Policy-gated behavior**
   Tools, skills, memory writes, and external actions must pass through policy controls.

3. **Strict separation of concerns**
   Runtime, memory, retrieval, tools, sandboxing, and observability must remain modular.

4. **Scoped memory with lifecycle control**
   Different memory scopes and trust levels must be isolated and managed explicitly.

5. **Retrieval as shared infrastructure**
   RAG should be a reusable platform service, not embedded separately in each agent.

6. **Progressive loading**
   Context, tools, skills, and retrieval should be loaded only when needed.

7. **Full traceability**
   Important decisions and side effects must be observable and auditable.

8. **Provider-neutral platform core**
   Models, channels, vector stores, and runtimes should integrate through stable internal interfaces.

9. **Safe extensibility**
   The platform should support user-created and imported capabilities without sacrificing auditability or control.

---

## 5. Canonical Terminology

The following terms should be used consistently across all architecture documents.

| Term                    | Definition                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| **User**                | A universal identity shared across channels                                                                 |
| **Channel Account**     | A provider-specific user/account identity mapped to a User                                                  |
| **Thread**              | A conversation unit governed by session/thread policy                                                       |
| **Agent Run**           | A single execution instance of the runtime                                                                  |
| **Execution Space**     | The isolated runtime and data boundary used for sandboxed execution                                         |
| **Collaborative Scope** | The shared team, application, or group context used for memory, settings, policies, and shared capabilities |
| **Context**             | The runtime-assembled input passed into model execution                                                     |
| **Memory**              | Persistent structured knowledge managed by the platform                                                     |
| **RAG / Retrieval**     | Query-time retrieval of external or indexed knowledge                                                       |
| **Tool**                | A typed executable capability with defined inputs, outputs, and side effects                                |
| **Skill**               | A packaged capability composed of instructions, metadata, tools, policies, and optional runtime code        |
| **Policy**              | A rule or decision layer that governs actions, permissions, approvals, and safety constraints               |
| **Checkpoint**          | A persisted execution snapshot that allows resumption or replay                                             |
| **Replay**              | Re-execution or reconstruction of a run for debugging, audit, or evaluation                                 |

### Terminology rule

The term **workspace** should not be used as a primary architecture term without qualification.

Use instead:

* **Execution Space** for isolated runtime/infrastructure context
* **Collaborative Scope** for shared team/application context

---

## 6. High-Level Architecture

```text
[Channels]
  Slack / Email / Discord / WeChat / QQ / ...
        |
        v
[Channel Gateway]
  - inbound ingestion
  - outbound delivery
  - attachment normalization
  - provider payload preservation
        |
        v
[Identity and Thread Layer]
  - user resolution
  - channel account mapping
  - collaborative scope membership
  - session/thread policy
        |
        v
[Agent Runtime]
  - context assembly
  - reasoning loop
  - state/checkpoints
  - tool routing
  - skill loading
  - subagent scheduling
        |
        +--------------------------+
        |                          |
        v                          v
[Memory System]              [RAG Infrastructure]
  - scoped memory            - ingestion
  - extraction               - indexing
  - validation               - retrieval/rerank
  - retrieval                - citation packaging
        |
        v
[Tool and Skill Execution Layer]
  - typed tools
  - audited side effects
  - approvals
  - caches
  - sandbox runtimes
        |
        v
[Sandbox / Execution Space]
  - isolation boundaries
  - secret broker
  - quotas
  - network policy
  - output controls
        |
        v
[Observability + Policy + Cost]
  - traces
  - logs
  - denials
  - replay artifacts
  - token usage
  - alerts
  - evaluation inputs
```

---

## 7. Main System Responsibilities

### 7.1 Channel Gateway

The Channel Gateway provides a common integration layer for all inbound and outbound communication channels.

Responsibilities:

* receive inbound events and messages
* normalize messages, attachments, and metadata into canonical representations
* support webhook and polling integrations
* send outbound responses, including streaming where supported
* preserve original provider payloads for debugging and replay support

### 7.2 Identity and Thread Layer

This layer resolves user identity and conversation structure across channels.

Responsibilities:

* map provider-specific identities to a universal User
* manage thread/session boundaries
* apply channel-specific or product-specific session policies
* associate Users with Collaborative Scopes where applicable

### 7.3 Agent Runtime

The Agent Runtime is the orchestration core of the platform.

Responsibilities:

* assemble execution context
* run reasoning loops
* coordinate tools, skills, and subagents
* maintain run state and checkpoints
* stream intermediate or final outputs where applicable
* trigger memory extraction and persistence steps

### 7.4 Memory System

The Memory System manages persistent structured knowledge used by agents.

Responsibilities:

* support multiple scopes, types, trust levels, and retention rules
* validate and store memory candidates
* retrieve relevant memory at run time
* manage conflict detection, provenance, and lifecycle

### 7.5 RAG Infrastructure

RAG is a shared retrieval service used across agents and applications.

Responsibilities:

* ingest and index external or internal knowledge
* perform retrieval and reranking
* support metadata filtering
* provide reusable retrieval APIs
* package evidence and citations for downstream consumption

### 7.6 Tool and Skill Execution

This layer provides controlled extensibility.

Responsibilities:

* execute typed tools with observable side effects
* load and run skills with declared permissions
* apply approval and policy gates before risky actions
* support deterministic serialization where possible
* route execution into appropriate runtimes

### 7.7 Sandbox / Execution Space

This layer enforces isolation and execution safety.

Responsibilities:

* provide per-run or per-user isolated execution environments
* separate trusted inputs, outputs, scratch space, and secrets
* enforce CPU, memory, time, and storage limits
* enforce network access policy
* control output handling and scanning where needed

### 7.8 Observability, Policy, and Cost Control

This set of platform services provides governance and production controls.

Responsibilities:

* trace run flow and subsystem interactions
* log side effects and decisions
* enforce policy decisions and approval workflows
* track token and cost usage
* provide replay, audit, evaluation, and alerting support

### 7.9 Self-Improvement

Self-improvement is a governed platform capability, not default live behavior.

Responsibilities:

* analyze traces, failures, feedback, and anomalies
* produce candidate improvements to prompts, skills, policies, retrieval, or evaluation sets
* keep all impactful changes behind review and approval

---

## 8. Execution Model

At a high level, the platform executes the following lifecycle for each inbound interaction:

```text
Message Ingest
  -> Identity and Thread Resolution
  -> Context Assembly
  -> Memory and Retrieval Injection
  -> Policy and Middleware Evaluation
  -> Reasoning / ReAct Loop
  -> Tool / Skill / Subagent Execution
  -> Checkpointing
  -> Response Generation
  -> Memory Extraction
  -> Trace / Log / Cost Persistence
```

### Required properties

Each Agent Run should be:

* stateful
* resumable
* observable
* policy-governed
* replayable where supported

---

## 9. Separation of Concerns

The architecture depends on keeping the following concepts distinct:

### Memory vs Retrieval

* **Memory** is persistent, structured, scoped, and lifecycle-managed
* **Retrieval** is query-time access to indexed knowledge sources

### Runtime vs Application Logic

* **Runtime** provides orchestration, control, safety, and extensibility
* **Application logic** defines domain-specific workflows and behavior

### Tools vs Skills

* **Tools** are executable primitives
* **Skills** are packaged capabilities that may compose tools, instructions, and policy

### Collaborative Scope vs Execution Space

* **Collaborative Scope** governs shared context and access
* **Execution Space** governs isolated runtime execution and data boundaries

This separation should be preserved across all future documents.

---

## 10. Cross-Cutting Platform Concerns

The following concerns affect the entire platform and will be defined in Layer 1.5:

* identity and scope propagation
* context assembly order and precedence
* policy enforcement lifecycle
* tool execution lifecycle
* memory read/write contract
* retrieval integration contract
* observability requirements
* deterministic replay requirements
* configuration precedence rules

Layer 2 subsystem documents must conform to these contracts.

---

## 11. Storage and Infrastructure Direction

The platform is expected to use polyglot persistence.

Recommended direction:

* **Postgres** for core transactional entities
* **Object storage** for artifacts, logs, checkpoints, and attachments
* **Redis** for queues, locks, caches, and streaming buffers
* **Vector database** for retrieval and memory indexing
* **Analytics / columnar store** for observability and cost reporting

This section is directional only. Detailed storage design belongs in subsystem specs.

---

## 12. Evolution Strategy

The platform should evolve in phases.

### Phase 1 — Core Runtime

* canonical message and identity model
* basic thread handling
* single-agent runtime
* tool execution with policy gates
* basic retrieval
* thread and user memory
* checkpointing
* logging and token tracking

### Phase 2 — Platform Maturity

* multimodal support
* streaming in both directions
* Collaborative Scope support
* sandbox trust zones
* skills system
* subagents
* improved observability and cost controls

### Phase 3 — Advanced Platform Intelligence

* self-improvement workflows
* evaluation pipelines
* external skill import and audit pipeline
* advanced memory conflict workflows
* provider-specific optimization strategies
* enterprise governance controls

---

## 13. Major Risks and Failure Modes

Key risks include:

* over-generalizing provider interfaces and losing useful provider-specific strengths
* conflating memory with retrieval and weakening trust/lifecycle rules
* allowing tools or skills to bypass policy enforcement
* under-specifying thread, scope, and identity boundaries
* making sandboxing an implementation detail instead of a trust boundary
* allowing uncontrolled subagent expansion
* building self-improvement into live execution paths
* defining configuration without clear precedence and override rules

These risks should explicitly shape Layer 1.5 and Layer 2 docs.

---

## 14. What This Platform Enables

If implemented correctly, this platform enables:

* fast development of new AI agent products
* safe and observable tool-using agents
* cross-channel continuity of agent experience
* reusable retrieval and memory infrastructure
* secure execution of extensible capabilities
* gradual improvement of agent quality under governance
* clearer separation between infrastructure teams and application teams

---

## 15. Document Map

This Layer 1 document should be followed by the following architecture documents.

### Layer 1.5 — Cross-Cutting Contracts

* system invariants
* identity and scope propagation contract
* execution lifecycle contract
* context contract
* policy contract
* tool execution contract
* memory contract
* retrieval contract
* replay contract
* observability contract
* configuration contract

### Layer 2 — Subsystem Design Documents

Recommended subsystem specs:

1. Channel Gateway
2. Identity and Thread Management
3. Agent Runtime
4. Memory System
5. RAG Infrastructure
6. Tool Execution Framework
7. Skills System
8. Sandbox / Execution Space
9. Observability, Replay, and Cost Control
10. Policy and Approval System
11. Self-Improvement System

---

## 16. Final Architectural Position

The platform should not be built as a single monolithic “agent framework” with all concerns fused together.

It should be built as a **thin, stable platform kernel** with clearly separated subsystems and explicit cross-cutting contracts.

The core kernel should center on:

* identity
* threads
* runs and checkpoints
* model execution
* tools
* memory

Everything else should extend from that kernel in a controlled and observable way.
