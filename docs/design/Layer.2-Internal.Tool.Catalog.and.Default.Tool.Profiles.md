# Frame AI Agent Platform — Layer 2

## Internal Tool Catalog and Default Tool Profiles

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Document Type:** Supporting reference document
**Subsystem / Reference Name:** Internal Tool Catalog and Default Tool Profiles
**Document Version:** v1.0-draft
**Status:** Draft
**Owners:** Platform Tools Team
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Tool Execution Framework Design
* Skills System Design
* Policy and Approval System Design
* Sandbox / Execution Space Design
* Observability, Replay, and Cost Control Design

---

## 2. Purpose

This document defines the **platform-owned built-in tool inventory and the default profile bundles used as candidate tool sources**.

It exists because Tool Execution Framework Design intentionally does not duplicate the exact built-in list, profile composition, or per-tool catalog metadata.
The platform needs one reference that defines:

* which tools count as platform-owned internal tools
* the stable ids and initial versions of those tools
* the capability class, risk posture, side-effect class, and determinism posture attached to each built-in tool
* which default tool profiles include which built-in tools
* which profiles are automatic defaults versus opt-in bundles
* how internal tool membership and profile composition evolve over time without breaking replay

This document is a **control-plane reference**, not the live execution engine.
Tool execution remains owned by the Tool Execution Framework.
Final exposure remains owned by Agent Runtime and policy-aware filtering.

---

## 3. Scope

### In Scope

This document is the source of truth for:

* the platform-owned internal built-in tool list
* internal catalog membership rules
* named default tool profiles and their composition
* stable tool ids and initial profile ids
* catalog-level lifecycle states, versioning, and deprecation rules
* catalog metadata needed for runtime resolution, policy posture, replay, and audit

### Out of Scope

This document does **not** own:

* tool execution logic or adapters
* policy authoring or approval workflows
* runtime computation of the final `EffectiveToolSet`
* product-specific external tool definitions
* skill-contributed tool definitions
* sandbox implementation internals
* implementation-language schemas or interfaces

This reference says **what the built-in tools and default bundles are**.
Other subsystems decide **whether they are visible, allowed, or executable for a given run**.

---

## 4. Architectural Role

The internal tool catalog is a control-plane dependency for runtime, execution, policy, and replay.

```text
Platform-owned Tool Descriptors
  -> Internal Tool Catalog and Default Tool Profiles
       -> Tool Execution Framework candidate resolution
       -> Agent Runtime effective tool computation
       -> Policy risk and approval posture
       -> Observability and replay snapshotting
```

### Upstream inputs

* immutable tool descriptors published by the Tool Execution Framework
* platform-owned tool ownership decisions
* platform-authored default profile definitions
* lifecycle state changes such as deprecation or replay-only posture

### Downstream consumers

* Tool Execution Framework candidate resolution
* Agent Runtime capability exposure computation
* Skills System when combining internal tools with skill-contributed tools
* Policy and Approval System for risk and side-effect posture inputs
* Observability, Replay, and Cost Control for catalog and profile snapshot refs

---

## 5. Goals and Non-Goals

### Goals

This reference must optimize for:

* one stable source of truth for built-in tool membership
* explicit versioned default profile composition
* replayable catalog and profile snapshots
* clear separation between internal tools and other tool sources
* predictable Head Agent and subagent bootstrap behavior
* safe extensibility as built-in tools are added or deprecated

### Non-Goals

This reference is not trying to optimize for:

* replacing runtime exposure logic
* hiding risky tools inside undocumented defaults
* making every agent receive the same tool bundle
* treating skill-contributed tools as if they were platform-owned
* encoding implementation-only details that belong in later iteration specs

---

## 6. Cross-Layer Contract Coverage

This document implements the supporting reference explicitly required by Layer 1 and Layer 1.5.

### From Layer 1

This reference must support:

* maintenance of the platform-owned internal tool catalog
* named default tool profiles
* controlled extensibility for the tool and skill execution layer
* observable side-effect posture through explicit built-in tool metadata

### From Layer 1.5

This reference must implement:

* the separate `Internal Tool Catalog and Default Tool Profiles` document required by the Tool Execution Contract
* the Head Agent default internal profile as a candidate-tool source
* the rule that subagents must not inherit the full Head Agent default profile automatically
* the rule that all default profiles remain subject to runtime filtering, scope constraints, execution-space availability, and policy

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

This reference must:

* list every platform-owned built-in tool id that belongs to the internal catalog
* pin each cataloged built-in to an immutable descriptor version
* assign a capability class to each catalog entry
* record which default profiles include each built-in tool
* define which platform profiles are automatic defaults versus opt-in bundles
* define lifecycle state rules for tools and profile versions
* preserve replay-visible snapshot requirements for catalog and profile resolution

---

## 8. Core Invariants

This reference must obey the platform invariants.

Additional catalog-specific invariants:

1. **Internal catalog membership is explicit.**  
   A platform-owned tool is not part of the internal catalog unless it appears in a published catalog entry.

2. **Catalog entries reference immutable descriptor versions.**  
   Built-in tool behavior may evolve only through a new tool version, not by mutating an old one in place.

3. **Default profiles are candidate bundles, not execution grants.**  
   Profile inclusion alone does not authorize exposure or execution.

4. **The Head Agent default profile is broad but not final.**  
   It is a candidate source only and remains subject to runtime, scope, execution-space, and policy filtering.

5. **Subagents do not automatically inherit the Head Agent default profile.**  
   Child runs must use an explicit child default or explicitly requested opt-in profile.

6. **Replay must reconstruct catalog and profile composition exactly.**  
   Profile expansion and catalog membership used by a past run must remain reference-addressable.

7. **High-risk tools must remain visible as high-risk tools.**  
   No profile may hide shell, network, or destructive file-mutation capability behind vague names or undocumented metadata.

---

## 9. Catalog Model

This document reuses the core registry terms defined by the Tool Execution Framework and narrows them for platform-owned built-ins.

### Core contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ToolRef` | `toolId`, `version` | None | Immutable reference to one published descriptor version. |
| `ToolProfile` | `profileId`, `version`, `toolRefs`, `defaultEnable`, `notes` | `attachmentMode`, `intendedUse` | Named bundle of candidate tools. |
| `CatalogEntry` | `catalogId`, `tool`, `capabilityClass`, `defaultProfiles` | `lifecycleState`, `riskLevel`, `sideEffectClass`, `determinismClass` | Platform-owned internal tool membership record. |
| `CatalogSnapshot` | `snapshotId`, `catalogEntries`, `profiles`, `createdAt` | `sourceRevision` | Replay-visible snapshot of catalog and profile state. |

### Lifecycle states

| State | Meaning |
| --- | --- |
| `active` | Available for new resolution and new runs. |
| `deprecated` | Still available, but discouraged for new use. |
| `disabled_new_use` | Not available for new resolution, but preserved for replay. |
| `replay_only` | Historical runs may reference it, but it should not appear in new candidate resolution. |

### Attachment modes

| Attachment mode | Meaning |
| --- | --- |
| `head_default` | Automatically considered for the Head Agent when defaults are enabled. |
| `child_default` | Automatically considered for subagents when child defaults are enabled. |
| `opt_in_only` | Used only when explicitly requested by agent, product, or run config. |

### Catalog rules

* only platform-owned tools may appear in this internal catalog
* profile versions must be immutable once published
* catalog entries and profiles must be version-pinnable for replay
* removing a tool from a profile requires a new profile version
* changing tool contract behavior requires a new tool descriptor version

---

## 10. Capability Classes

Capability classes are catalog-level grouping labels used for auditing, profile composition, and candidate-resolution explanation.

| Capability class | Meaning |
| --- | --- |
| `fs_read` | Reads file content without mutating filesystem state. |
| `fs_discovery` | Lists files, directories, or metadata. |
| `fs_mutation` | Creates, rewrites, patches, moves, or copies filesystem content. |
| `process_execution` | Starts or controls a process or shell command. |
| `network_retrieval` | Retrieves remote content over approved network paths. |
| `artifact_intelligence` | Inspects or derives metadata from attachments or artifacts. |

### Capability-class policy posture

* `fs_read` and `fs_discovery` remain `tool_execution` intents, but they still require execution-space-bound path controls and broker enforcement.
* `fs_mutation` implies downstream `file_write` conditions in addition to normal `tool_execution` governance.
* `process_execution` remains a `tool_execution` surface, but it should carry process, timeout, and working-directory conditions from policy-derived authorization.
* `network_retrieval` implies downstream `network_request` conditions in addition to normal `tool_execution` governance.
* `artifact_intelligence` remains plain `tool_execution` unless a specific descriptor declares broader broker or network requirements.

---

## 11. Platform-Owned Built-In Tool Catalog

The initial platform internal catalog contains the following built-in tools.
All tool versions below are the first published internal versions and are written as `v1`.

### 11.1 Filesystem read and discovery tools

| Tool id | Version | Purpose | Required input fields | Output contract highlights | Risk | Side-effect class | Determinism | Requires Execution Space | Requires Network | Default profiles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `read_file` | `v1` | Read bounded file content from a path. | `path` | `content` or `contentRef`, `encoding`, `truncated` | `low` | `none` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.head.readonly`, `platform.subagent.analysis`, `platform.subagent.exec.limited`, `platform.research.fetch` |
| `list_dir` | `v1` | List directory entries with optional depth limits. | `path` | `entries`, `truncated` | `low` | `none` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.head.readonly`, `platform.subagent.analysis`, `platform.subagent.exec.limited`, `platform.research.fetch` |
| `glob_search` | `v1` | Resolve glob patterns relative to a root path. | `root`, `pattern` | `matches`, `truncated` | `low` | `none` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.head.readonly`, `platform.subagent.analysis`, `platform.subagent.exec.limited`, `platform.research.fetch` |
| `search_text` | `v1` | Search text or regex patterns across files. | `root`, `pattern` | `matches`, `matchCount`, `truncated` | `low` | `none` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.head.readonly`, `platform.subagent.analysis`, `platform.subagent.exec.limited`, `platform.research.fetch` |
| `file_stat` | `v1` | Return file or directory metadata. | `path` | `exists`, `type`, `size`, `mtime`, `permissions` | `low` | `none` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.head.readonly`, `platform.subagent.analysis`, `platform.subagent.exec.limited`, `platform.research.fetch` |

### 11.2 Filesystem mutation tools

| Tool id | Version | Purpose | Required input fields | Output contract highlights | Risk | Side-effect class | Determinism | Requires Execution Space | Requires Network | Default profiles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `write_file` | `v1` | Create, overwrite, or append file content. | `path`, `content` | `bytesWritten`, `created`, `finalPath` | `high` | `file_io` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.subagent.exec.limited` |
| `patch_file` | `v1` | Apply a bounded textual patch to an existing file. | `path`, `patch` | `applied`, `rejectedHunks`, `resultHash` | `high` | `file_io` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.subagent.exec.limited` |
| `move_file` | `v1` | Move or rename a file or directory. | `sourcePath`, `destPath` | `finalPath`, `overwrote` | `high` | `file_io` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.subagent.exec.limited` |
| `copy_file` | `v1` | Copy a file or directory to a new location. | `sourcePath`, `destPath` | `finalPath`, `bytesCopied` | `medium` | `file_io` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.subagent.exec.limited` |
| `make_dir` | `v1` | Create a directory path with optional parent creation. | `path` | `created`, `finalPath` | `medium` | `file_io` | `environment_bound` | `true` | `false` | `platform.head.default`, `platform.subagent.exec.limited` |

### 11.3 Process and network tools

| Tool id | Version | Purpose | Required input fields | Output contract highlights | Risk | Side-effect class | Determinism | Requires Execution Space | Requires Network | Default profiles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `shell_exec` | `v1` | Execute one bounded shell or process command. | `command` | `exitCode`, `stdoutRef`, `stderrRef`, `timedOut` | `high` | `process` | `non_deterministic` | `true` | `false` | `platform.head.default`, `platform.subagent.exec.limited` |
| `write_stdin` | `v1` | Send bounded input to a live interactive process session. | `sessionId`, `chars` | `bytesWritten`, `stdoutRef`, `stderrRef`, `sessionState` | `high` | `process` | `non_deterministic` | `true` | `false` | `platform.head.default`, `platform.subagent.exec.limited` |
| `fetch_url` | `v1` | Retrieve remote content using approved read-only network semantics. | `url` | `statusCode`, `headers`, `bodyRef`, `contentType` | `high` | `network` | `non_deterministic` | `true` | `true` | `platform.head.default`, `platform.research.fetch` |
| `download_artifact` | `v1` | Download remote content into managed artifact storage. | `url`, `artifactClass` | `artifactRef`, `bytesDownloaded`, `contentType` | `high` | `network` | `non_deterministic` | `true` | `true` | `platform.head.default`, `platform.research.fetch` |

### 11.4 Attachment and artifact inspection tools

| Tool id | Version | Purpose | Required input fields | Output contract highlights | Risk | Side-effect class | Determinism | Requires Execution Space | Requires Network | Default profiles |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `inspect_attachment` | `v1` | Inspect an attachment or stored artifact and return structured metadata or summaries. | `attachmentRef`, `inspectionMode` | `summary`, `metadata`, `derivedArtifactRefs` | `medium` | `none` | `environment_bound` | `false` | `false` | `platform.head.default`, `platform.head.readonly`, `platform.subagent.analysis`, `platform.research.fetch` |

### Catalog notes

* the initial internal catalog contains fifteen built-in tools
* all built-in filesystem, process, and network tools above are execution-space-bound; the catalog exposes that posture explicitly so runtime and tool execution do not have to infer it indirectly
* built-in network tools are retrieval-oriented only; broader external-system mutation tools belong outside this initial internal catalog
* `download_artifact` writes into managed artifact storage, not arbitrary caller-chosen filesystem paths
* `inspect_attachment` operates on managed attachment or artifact refs and does not imply arbitrary host filesystem access unless a later descriptor version declares broader broker requirements
* `patch_file` exists separately from `write_file` so approval and replay can distinguish bounded textual edits from whole-file replacement
* `write_stdin` requires a valid live session created by an approved process-execution path and must not create a new session implicitly

---

## 12. Default Tool Profiles

The platform publishes the following versioned default profile set.
All profile versions below are written as `v1`.

| Profile id | Version | Attachment mode | `defaultEnable` | Intended use | Tool refs |
| --- | --- | --- | --- | --- | --- |
| `platform.head.default` | `v1` | `head_default` | `true` | Broad Head Agent candidate set. | `read_file`, `list_dir`, `glob_search`, `search_text`, `file_stat`, `write_file`, `patch_file`, `move_file`, `copy_file`, `make_dir`, `shell_exec`, `write_stdin`, `fetch_url`, `download_artifact`, `inspect_attachment` |
| `platform.head.readonly` | `v1` | `opt_in_only` | `false` | Conservative Head Agent profile for read-oriented work. | `read_file`, `list_dir`, `glob_search`, `search_text`, `file_stat`, `inspect_attachment` |
| `platform.subagent.analysis` | `v1` | `child_default` | `true` | Conservative child default for analysis, review, and summarization tasks. | `read_file`, `list_dir`, `glob_search`, `search_text`, `file_stat`, `inspect_attachment` |
| `platform.subagent.exec.limited` | `v1` | `opt_in_only` | `false` | Child or specialist profile for bounded code or file-edit execution tasks. | `read_file`, `list_dir`, `glob_search`, `search_text`, `file_stat`, `write_file`, `patch_file`, `move_file`, `copy_file`, `make_dir`, `shell_exec`, `write_stdin` |
| `platform.research.fetch` | `v1` | `opt_in_only` | `false` | Research-oriented profile for approved retrieval and artifact acquisition tasks. | `read_file`, `list_dir`, `glob_search`, `search_text`, `file_stat`, `fetch_url`, `download_artifact`, `inspect_attachment` |

### Profile rules

* `platform.head.default` is the only automatic broad Head Agent profile in this initial catalog
* `platform.subagent.analysis` is the default child profile; it intentionally excludes file mutation, shell execution, and network retrieval
* no child run receives `platform.head.default` automatically
* opt-in profiles must be explicitly requested by agent config, skill config where allowed, or run-level overrides
* repeated tool refs from multiple profiles must be deduplicated by exact `toolId` and `version`

---

## 13. Lifecycle, Versioning, and Deprecation

### Versioning rules

* every built-in tool descriptor change requires a new `version`
* every profile composition change requires a new profile `version`
* catalog snapshots must pin both tool versions and profile versions
* replay must reference the exact profile version and tool versions used by the run

### Deprecation rules

* a tool may move from `active` to `deprecated` without breaking replay
* removing a tool from `platform.head.default` requires a new `platform.head.default` version
* a `disabled_new_use` or `replay_only` tool may remain in historical snapshots but must not be added to fresh candidate resolution
* profile deprecation must never erase the historical membership mapping needed for replay or audit

---

## 14. Boundary with Runtime, Policy, Skills, and Execution

This reference does not override the ownership boundaries defined elsewhere.

### Agent Runtime boundary

Runtime still owns the final `EffectiveToolSet`.
This reference only defines candidate sources and profile composition.

Runtime must still intersect:

* upstream-available tools
* agent-allowed tools
* collaborative-scope and execution-space constraints
* run-level overrides
* policy restrictions

### Tool Execution Framework boundary

Tool Execution Framework still owns:

* descriptor publication
* candidate resolution mechanics
* execution-time validation
* dispatch and normalization

This reference only defines which published platform-owned descriptors count as internal built-ins and which profiles include them.

### Policy boundary

Risk and side-effect metadata in this reference inform policy posture, but do not replace policy evaluation.
Exact authorization envelopes, request hashing, and downstream enforcement remain owned by the Tool Execution Framework and the Policy and Approval System.

### Skills boundary

Skill-contributed tools are not part of the internal tool catalog.
They may be merged into candidate resolution later, but must remain traceable to their skill source rather than disguised as platform-owned built-ins.

---

## 15. Observability and Replay

Catalog and profile selection must be replay-visible.

### Required replay fields

For tool candidate resolution and tool execution replay, the platform should preserve:

* `catalogSnapshotId`
* `profileId`
* `profileVersion`
* `toolId`
* `toolVersion`
* whether the tool came from `platform.head.default`, a child default, or an opt-in profile
* whether runtime filtered the tool out later and the associated reason code

### Replay rules

* historical runs should reconstruct candidate-tool resolution from a stored catalog snapshot instead of current live catalog state
* if a run used `platform.head.default@v1`, replay must not silently substitute a later profile version
* deprecated or replay-only tools must remain reference-addressable for historical replay

---

## 16. Configuration Direction

Catalog and profile use must obey the platform configuration precedence contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override level |
| --- | --- | --- | --- | --- |
| `defaultHeadProfileRef` | pin the automatic Head Agent internal profile | tool profile ref | `platform.head.default@v1` | system or agent |
| `defaultChildProfileRef` | pin the automatic child internal profile | tool profile ref | `platform.subagent.analysis@v1` | system or agent |
| `disabledInternalToolIds` | block specific internal tools even if a profile includes them | list | empty | collaborative scope, agent, or run |
| `disabledInternalProfiles` | block specific platform profiles | list | empty | collaborative scope, agent, or run |
| `profileVersionPins` | pin exact profile versions for replayable or regulated environments | map | explicit | system or collaborative scope |

### Configuration rules

* lower-precedence configuration must not widen access beyond higher-precedence restrictions
* disabling a tool or profile does not delete historical replay references
* run-level configuration may narrow the catalog or profile set, but must not silently upgrade to unpublished profile versions

---

## 17. Contract Sketch

This section defines the language-neutral control-plane contract implied by this reference. Exact Go interfaces, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `GetCatalogSnapshot` | Return one pinned catalog and profile snapshot for candidate resolution or replay. | snapshot ref or effective config context | `CatalogSnapshot` |
| `GetProfile` | Return one immutable profile definition. | `profileId`, `version` | `ToolProfile` |
| `ListInternalCatalogEntries` | Return platform-owned built-in catalog entries for diagnostics or tooling. | optional filters | list of `CatalogEntry` |
| `ExplainProfileMembership` | Explain why one built-in tool belongs to one or more default profiles. | `toolId`, `version` | membership explanation artifact |

### Behavioral expectations

* all returned catalog and profile objects must be immutable for a fixed version
* profile expansion must be deterministic for a fixed snapshot
* lookup operations must be cheap enough for runtime-adjacent control-plane use, ideally through cached snapshots

---

## 18. Tradeoffs and Design Decisions

### Decision: keep the internal catalog separate from the execution framework design

**Why:** the execution framework should not carry the full built-in inventory and profile composition inline
**Alternative:** duplicate the built-in tool list inside the execution framework doc
**Consequence:** one extra reference document, much cleaner separation of control-plane source of truth

### Decision: give the Head Agent a broad default candidate profile

**Why:** Layer 1 and Layer 1.5 expect a strong platform-owned default bootstrap for the Head Agent
**Alternative:** require every agent to enumerate every built-in tool manually
**Consequence:** simpler bootstrap, but strong reliance on runtime and policy filtering

### Decision: give subagents a separate conservative child default

**Why:** Layer 1.5 explicitly forbids automatic inheritance of the full Head Agent default profile
**Alternative:** no child defaults at all
**Consequence:** safer delegation behavior while still providing useful built-in analysis capability

### Decision: catalog shell and network tools explicitly instead of hiding them as special cases

**Why:** risky tools must remain visible in catalog, replay, and policy posture
**Alternative:** treat shell or network access as undocumented privileged behaviors
**Consequence:** stronger auditability and clearer governance

---

## 19. Final Position

The platform should treat `Internal Tool Catalog and Default Tool Profiles` as the authoritative Layer 2 supporting reference for platform-owned built-in tools.

Its authoritative role is:

* define the exact initial built-in tool list
* define the named default profile set and attachment modes
* pin catalog and profile versions for replay
* preserve the distinction between platform-owned internal tools and all other tool sources

This document does not grant execution or exposure on its own.
It supplies the control-plane source of truth that Tool Execution Framework, Agent Runtime, Policy, Skills, and Replay depend on.
