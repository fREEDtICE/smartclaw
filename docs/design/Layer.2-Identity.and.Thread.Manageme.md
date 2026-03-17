# Layer 2 — Identity and Thread Management

## 1. Purpose

The Identity and Thread Management subsystem resolves **who** is interacting with the platform and **which conversation unit** the interaction belongs to. It provides the canonical foundation for user continuity across channels, thread/session lifecycle control, scope attachment, and run initialization. This subsystem exists upstream of runtime execution and must complete identity and thread resolution before any agent run proceeds.  

It is responsible for:

* mapping provider-specific channel identities into a universal **User**
* managing **Thread** creation, lookup, merge, split, and closure behavior
* associating interactions with **Collaborative Scope**
* propagating identity and scope metadata required by downstream systems
* enforcing session/thread policies before runtime execution begins  

---

## 2. Design Goals

This subsystem must satisfy the following goals:

1. **Universal identity across channels**
   A single real-world user may interact via Slack, email, Discord, WeChat, or other channels and should resolve to one canonical User where policy and matching allow. 

2. **Deterministic thread resolution**
   Every inbound interaction must resolve to exactly one thread outcome: attach to existing thread, create new thread, reopen paused thread, or reject as invalid. This supports state-first execution and replayability.  

3. **Strict separation of concepts**
   User, Thread, Collaborative Scope, and Execution Space remain distinct. This layer owns only identity and conversation structure; it does not own runtime isolation or memory semantics.  

4. **Policy-aware but not policy-bypassing**
   Identity and thread decisions may consult policy, but no downstream external action may occur before full policy evaluation in later stages. This layer must not create side effects that bypass policy-first execution. 

5. **Traceable propagation**
   The output of this subsystem must provide all identifiers required by downstream runtime, memory, tool, policy, and observability systems. 

---

## 3. Responsibilities

### In scope

* canonical user resolution
* channel account registration and lookup
* identity linking and unlinking workflows
* collaborative scope membership lookup
* inbound thread lookup and creation
* session policy evaluation
* thread lifecycle state tracking
* propagation of required identity metadata
* audit logging of identity/thread decisions

### Out of scope

* model execution
* context assembly beyond thread-facing metadata
* memory retrieval or memory writing
* tool execution
* sandbox allocation
* policy enforcement for downstream side effects

This follows the Layer 1 responsibility split where the layer resolves identity and conversation structure, while runtime and other subsystems handle execution and side effects. 

---

## 4. Architectural Position

```text
Channel Gateway
  -> Identity and Thread Management
      -> User Resolution
      -> Channel Account Mapping
      -> Scope Association
      -> Thread Resolution
      -> Session Policy Evaluation
      -> Identity/Scope Propagation Envelope
  -> Agent Runtime
```

This subsystem sits immediately after message normalization and before Agent Runtime for inbound interaction starts. It is a hard prerequisite for creating a new run from an inbound message, but asynchronous runtime resumes should reuse previously persisted identity/thread metadata rather than re-running this entry flow.  

---

## 5. Canonical Concepts

### 5.1 User

A universal identity shared across channels. A User is the canonical subject for continuity, policy, memory scope, and account linkage. 

### 5.2 Channel Account

A provider-specific identity, such as a Slack user ID, email address, Discord account, or WeChat account, mapped to a User. 

### 5.3 Thread

A conversation unit governed by session/thread policy. A Thread is not equivalent to a provider thread ID; rather, it is the canonical conversation container used by the platform. 

### 5.4 Collaborative Scope

The shared team, application, or group context that governs shared policies, settings, and access boundaries. 

### 5.5 Execution Space

Runtime isolation context. This subsystem may reference it in propagation envelopes when already known, but does not allocate or manage it.  

---

## 6. Core Invariants

This subsystem must obey the global invariants from Layer 1.5:

* identity must be resolved before runtime execution
* inbound resolution must produce the identifiers required for downstream run creation, and `runId` becomes mandatory only after runtime creates or resumes the run
* no cross-scope access without policy approval
* decisions must be observable
* state must be recoverable
* identity and thread boundaries must remain explicit and auditable  

Additional subsystem-specific invariants:

1. **Every inbound message must resolve to one canonical thread decision.**
2. **A channel account may map to only one active canonical User at a time.**
3. **A provider thread reference may map to different canonical threads only via explicit split or migration events.**
4. **Collaborative scope attachment must be explicit, not inferred implicitly from thread history alone.**
5. **Identity merges must preserve lineage and prior aliases for audit and replay.**

---

## 7. Subcomponents

### 7.1 Identity Resolver

Resolves inbound provider identity into a canonical User.

Functions:

* normalize provider identity claims
* perform deterministic lookup by verified account keys
* perform guarded matching on secondary signals
* return matched user, ambiguous result, or unresolved state

### 7.2 Channel Account Registry

Stores mappings between provider identities and canonical users.

Functions:

* maintain account linkage state
* track verification state
* record provenance of linkage
* support account revocation, unlink, and merge-safe updates

### 7.3 Scope Resolver

Determines the relevant collaborative scope.

Functions:

* inspect channel/account/app context
* resolve explicit scope mapping
* validate user membership or entitlement
* attach scope metadata or return no-scope result

### 7.4 Thread Resolver

Maps inbound events to existing or new threads.

Functions:

* find canonical thread by provider thread references
* apply session continuity rules
* detect reopening vs new-thread creation
* handle channel-specific edge cases

### 7.5 Session Policy Engine

Applies thread/session lifecycle rules before runtime.

Examples:

* inactivity timeout
* reply-window expiry
* explicit “new conversation” command
* channel-specific reply semantics
* collaborative scope isolation rules

### 7.6 Identity/Thread Event Log

Emits structured events for audit, replay, and observability.

---

## 8. Data Model

## 8.1 Core Entities

### User

```go
type User struct {
	UserID           string
	Status           string // active | merged | disabled
	PrimaryProfileRef *string
	CreatedAt        time.Time
	UpdatedAt        time.Time
	MergedIntoUserID *string
}
```

### ChannelAccount

```go
type ChannelAccount struct {
	ChannelAccountID    string
	Provider            string
	ProviderAccountKey  string
	ProviderWorkspaceKey *string
	UserID              string
	VerificationState   string // verified | unverified | pending
	LinkageMethod       string // explicit | admin_linked | auto_linked
	CreatedAt           time.Time
	UpdatedAt           time.Time
}
```

### CollaborativeScopeMembership

```go
type CollaborativeScopeMembership struct {
	MembershipID         string
	CollaborativeScopeID string
	UserID               string
	Role                 *string
	Status               string // active | revoked
	CreatedAt            time.Time
	UpdatedAt            time.Time
}
```

### Thread

```go
type Thread struct {
	ThreadID             string
	UserID               *string
	CollaborativeScopeID *string
	CanonicalChannel     string
	ThreadState          string // open | paused | closed | archived
	SessionPolicyID      *string
	CreatedAt            time.Time
	UpdatedAt            time.Time
	LastInboundAt        *time.Time
	LastOutboundAt       *time.Time
	SummaryRef           *string
}
```

### ProviderThreadBinding

```go
type ProviderThreadBinding struct {
	BindingID            string
	Provider             string
	ProviderWorkspaceKey *string
	ProviderThreadKey    string
	ThreadID             string
	BindingState         string // active | superseded
	CreatedAt            time.Time
	UpdatedAt            time.Time
}
```

Uniqueness rule:

* binding lookup must use `(provider, providerWorkspaceKey, providerThreadKey)` when the provider namespaces thread identifiers by workspace or tenant

### IdentityResolutionRecord

```go
type IdentityResolutionRecord struct {
	ResolutionID         string
	InboundEventID       string
	Provider             string
	MatchedUserID        *string
	MatchedChannelAccountID *string
	ResolutionOutcome    string // matched | ambiguous | unresolved | rejected
	Confidence           float64
	ReasonCodes          []string
	CreatedAt            time.Time
}
```

### ThreadResolutionRecord

```go
type ThreadResolutionRecord struct {
	ResolutionID          string
	InboundEventID        string
	ThreadID              *string
	Outcome               string // attached | created | reopened | rejected
	ReasonCodes           []string
	SessionPolicySnapshot json.RawMessage
	CreatedAt             time.Time
}
```

---

## 9. External Contracts

## 9.1 Input Contract from Channel Gateway

This subsystem receives a canonical inbound envelope from Channel Gateway:

```go
type InboundMessageEnvelope struct {
	InboundEventID       string
	Provider             string
	ProviderMessageKey   string
	ProviderThreadKey    *string
	ProviderAccountKey   *string
	ProviderWorkspaceKey *string
	ChannelType          string
	ReceivedAt           time.Time
	NormalizedMessage    NormalizedMessage
	ProviderPayloadRef   string
}

type NormalizedMessage struct {
	Text        *string
	Attachments []AttachmentRef
	Subject     *string
}
```

The gateway preserves provider payloads, and this subsystem consumes normalized identity and thread hints without owning raw ingestion concerns. 

## 9.2 Output Contract to Agent Runtime

The subsystem outputs a resolution result that can either produce a runnable runtime-start envelope or a blocked/non-runnable outcome:

```go
type InboundResolutionResult struct {
	InboundEventID         string
	IdentityState          string // resolved | guest | ambiguous | unresolved
	ResolutionDisposition  string // start_run | blocked | requires_disambiguation
	BlockedReasonCodes     []string
	RuntimeStart           *RuntimeStartEnvelope
	PropagationPreview     *PropagationPreview
	AuditRefs              ResolutionAuditRefs
}

type RuntimeStartEnvelope struct {
	UserID                *string
	ThreadID              string
	CollaborativeScopeID  *string
	SessionState          string // attached | created | reopened
	SessionPolicySnapshot json.RawMessage
	Propagation           ResolutionPropagation
}

type ResolutionPropagation struct {
	UserID                *string
	ThreadID              string
	CollaborativeScopeID  *string
	ExecutionSpaceID      *string
}

type PropagationPreview struct {
	UserID               *string
	CollaborativeScopeID *string
	ExecutionSpaceID     *string
}

type ResolutionAuditRefs struct {
	IdentityResolutionID string
	ThreadResolutionID   string
}
```

Rules:

* runtime may start only when `resolutionDisposition = "start_run"` and `runtimeStart` is present
* `ambiguous`, `unresolved`, or rejected thread outcomes must not require synthetic thread creation just to satisfy the contract
* guest flows are allowed only if product policy explicitly allows runtime start with `identityState = "guest"`

---

## 10. Resolution Flows

## 10.1 Identity Resolution Flow

```text
Inbound envelope
  -> normalize provider identity claims
  -> exact lookup by verified channel account
  -> if none, evaluate allowed fallback matchers
  -> if one safe match, resolve user
  -> if multiple matches, mark ambiguous
  -> if none, unresolved or create guest subject according to product policy
  -> emit identity resolution record
```

### Matching precedence

1. verified channel account binding
2. explicit product/app binding
3. approved secondary lookup signals
4. guest/unresolved fallback

Rules:

* exact verified bindings dominate all heuristic matches
* heuristic linking must never silently merge two existing users
* any merge requires explicit administrative or policy-approved workflow
* ambiguous results must not auto-link

## 10.2 Thread Resolution Flow

```text
Inbound envelope + resolved identity/scope
  -> inspect providerThreadKey and channel conversation hints
  -> lookup active provider binding using provider + workspace/tenant namespace
  -> if found, validate session policy
      -> attach / reopen / create successor thread
  -> if not found, evaluate continuity rules
      -> match recent open thread if allowed
      -> else create new thread
  -> emit thread resolution record
```

### Thread precedence rules

1. explicit provider thread binding
2. explicit platform reply-to metadata
3. channel-specific continuity rule
4. recent-thread reuse if permitted
5. new thread creation

Rules:

* provider thread bindings must be matched in the same tenant/workspace namespace as the inbound event
* cross-tenant thread reuse is invalid even if raw provider thread keys match

---

## 11. Session and Thread Policies

This subsystem owns thread/session policy evaluation but not general policy enforcement.

### 11.1 Policy Inputs

* channel type
* provider reply semantics
* collaborative scope rules
* agent/application config
* user config overrides where allowed
* time since last activity

This respects the overall config precedence contract. 

### 11.2 Example Policy Dimensions

* inactivity timeout duration
* maximum dormant reopen window
* email subject continuity rule
* whether DMs and group chats create separate threads
* whether cross-channel continuity is allowed
* whether explicit “start over” commands force new thread
* whether thread reuse is disallowed after scope change

### 11.3 Thread Lifecycle States

```text
open -> paused -> closed -> archived
```

Recommended semantics:

* **open**: active conversational continuity
* **paused**: temporarily inactive but resumable
* **closed**: intentionally terminated; reuse discouraged
* **archived**: retained for history/replay only
* **reopened**: a transition/result that moves a paused thread back to `open`, not a distinct persisted state

---

## 12. Cross-Channel Continuity

The platform goal requires universal identity across channels, but cross-channel thread continuity must be governed carefully. 

### Rule set

* identity continuity and thread continuity are separate decisions
* one User may span many channels
* a Thread may optionally span channels only if allowed by application policy
* default recommendation: preserve user continuity across channels, but keep canonical thread continuity conservative unless an explicit cross-channel bridge exists

Example:

* same user emails and later messages in Slack
* resolve to same `userId`
* create separate threads unless the application explicitly supports channel-bridged threads

This avoids over-specifying provider interfaces and under-specifying thread boundaries, both called out as key risks. 

---

## 13. Failure Modes and Handling

### 13.1 Ambiguous Identity

Cause: multiple possible user matches.
Handling:

* do not auto-merge
* mark identity as ambiguous
* route to a safe fallback flow or request disambiguation in product layer
* log ambiguity reasons

### 13.2 Missing Provider Thread Key

Cause: channel does not supply stable thread metadata.
Handling:

* rely on session policy and recent continuity rules
* prefer new thread creation over unsafe attachment

### 13.3 Duplicate Inbound Delivery

Cause: provider retries or duplicate webhook delivery for the same inbound event.
Handling:

* treat `providerMessageKey` plus provider namespace as an idempotency key
* reuse the previously persisted identity/thread resolution result when safe
* never create duplicate threads from repeated delivery of the same canonical inbound event

### 13.4 Scope Mismatch

Cause: user identity resolved, but collaborative scope is invalid or revoked.
Handling:

* deny scope attachment
* either fall back to user-only thread or block run according to product policy
* emit audit event

### 13.5 Identity Merge After Historical Activity

Cause: two users later determined to be same subject.
Handling:

* preserve alias lineage
* do not rewrite historical audit facts destructively
* maintain merge mapping for replay compatibility

### 13.6 Channel Account Reassignment

Cause: provider identity reused or transferred.
Handling:

* require explicit revocation and re-verification
* never silently rebind a verified account with existing history

---

## 14. Observability Requirements

This subsystem must emit structured signals because execution must be observable. 

Required events:

* inbound_identity_resolution_started
* inbound_identity_resolved
* inbound_identity_ambiguous
* inbound_identity_unresolved
* thread_resolution_started
* thread_attached
* thread_created
* thread_reopened
* scope_attached
* scope_denied
* session_policy_applied
* identity_merge_recorded
* channel_account_linked
* channel_account_unlinked

Each event should include:

* `inboundEventId`
* provider thread/account namespace keys
* provider metadata
* reason codes
* selected user/thread/scope ids
* latency
* config snapshot refs
* policy refs where applicable

---

## 15. Replay and Audit

To support deterministic replay for supported runs, this subsystem must persist enough identity/thread decision data to reconstruct the run entry point. 

Must capture:

* inbound event reference
* provider namespace keys used for lookup
* normalized identity claims
* matching inputs and reason codes
* selected user/thread/scope ids
* policy snapshot used for session decision
* provider binding used
* any ambiguity or rejection result

Replay rule:

* replay should reuse recorded resolution outputs unless explicitly running in “fresh-resolution diagnostic mode”

---

## 16. Storage Direction

Consistent with Layer 1 guidance, recommended persistence is:

* **Postgres** for Users, ChannelAccounts, Threads, Bindings, Memberships
* **Object storage** for provider payload snapshots and audit artifacts
* **Redis** for short-lived lookup caches, idempotency keys, and hot thread/session state
* **Analytics store** for identity/thread resolution telemetry 

---

## 17. API Surface

## 17.1 Internal Service Methods

```go
type IdentityThreadService interface {
	ResolveIdentity(ctx context.Context, input InboundMessageEnvelope) (IdentityResolutionResult, error)
	ResolveThread(ctx context.Context, input InboundMessageEnvelope, identity IdentityResolutionResult, scope *ScopeResolutionResult) (ThreadResolutionResult, error)
	ResolveScope(ctx context.Context, input InboundMessageEnvelope, identity IdentityResolutionResult) (ScopeResolutionResult, error)
	LinkChannelAccount(ctx context.Context, cmd LinkChannelAccountCommand) (LinkResult, error)
	UnlinkChannelAccount(ctx context.Context, cmd UnlinkChannelAccountCommand) (UnlinkResult, error)
	MergeUsers(ctx context.Context, cmd MergeUsersCommand) (MergeResult, error)
	CloseThread(ctx context.Context, cmd CloseThreadCommand) (ThreadStateResult, error)
	ReopenThread(ctx context.Context, cmd ReopenThreadCommand) (ThreadStateResult, error)
}
```

## 17.2 Combined Entry Point

```go
type InboundResolver interface {
	ResolveInboundInteraction(ctx context.Context, input InboundMessageEnvelope) (InboundResolutionResult, error)
}
```

This is the primary entry point used for inbound run starts. Runtime resume paths should rely on persisted run metadata rather than invoking this method again.

---

## 18. Security and Trust Boundaries

* this subsystem may read identity, scope, and thread data
* it must not perform external side effects beyond its own metadata persistence
* it must not grant cross-scope access without policy-approved membership checks
* it must not expose internal matching heuristics as runtime-visible model tools
* it must treat identity linkage as a high-trust administrative action

---

## 19. Open Design Choices

These may be decided later without violating higher-level contracts:

* whether guest users are modeled as first-class Users or ephemeral subjects
* exact heuristics permitted for fallback identity matching
* whether cross-channel thread bridging is product-wide or agent-specific
* whether paused vs closed thread states are both needed operationally
* whether collaborative scope can be multi-valued per thread or only one effective scope at a time

Recommended default: **one effective collaborative scope per thread at a time**, for simpler policy and memory boundaries.

---

## 20. Final Architectural Position

Identity and Thread Management should be implemented as a **core platform kernel subsystem** because it anchors continuity, scoping, and run initialization for every interaction. It must remain small, deterministic, and highly auditable.

It should own:

* canonical identity resolution
* channel account mapping
* scope association
* thread/session resolution
* propagation envelope generation

It should not own:

* agent reasoning
* memory semantics
* retrieval logic
* tool execution
* sandbox lifecycle
