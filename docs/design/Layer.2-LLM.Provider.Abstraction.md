# Frame AI Agent Platform — Layer 2

## LLM Provider Abstraction Design

Based on the platform architecture and contracts defined from the blueprint document.

---

## 1. Document Metadata

**Subsystem Name:** LLM Provider Abstraction
**Document Version:** v1.0-draft
**Status:** Draft
**Owners:** Model Platform Team
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* Model and Routing Design
* Tool Execution Framework
* Policy and Approval System
* Observability and Replay Design
* Sandbox / Execution Space Design

---

## 2. Purpose

The LLM Provider Abstraction subsystem gives the platform a **provider-neutral execution interface** for generative model calls.

It exists so that runtime and routing do not depend directly on vendor SDKs or vendor-specific payload shapes.
The platform needs a stable internal contract for:

* sending provider-neutral generation requests
* mapping them into provider-specific APIs
* normalizing responses, usage, and errors
* streaming partial output safely
* representing tool-call requests in a canonical form
* preserving enough data for traceability and replay

This subsystem owns **provider execution and normalization**, not routing policy and not agent reasoning.

---

## 3. Scope

### In Scope

The LLM Provider Abstraction subsystem is responsible for:

* maintaining provider adapters behind one canonical interface
* validating that a resolved provider target can satisfy requested features
* transforming provider-neutral requests into provider-specific request payloads
* executing generation requests against vendor APIs or SDKs
* normalizing provider responses into canonical assistant output, tool-call requests, usage, and finish reasons
* normalizing streaming events into a provider-neutral stream
* classifying transport, rate-limit, timeout, authentication, and contract errors
* collecting replay-grade provider metadata and raw artifact references
* exposing provider capability profiles to routing and runtime

### Out of Scope

The LLM Provider Abstraction subsystem does **not** own:

* model selection or routing policy
* prompt authoring
* context assembly
* tool execution authorization
* skill execution
* approval decisions
* policy authoring
* secret storage
* embedding or vector-index provider abstractions

Routing decides **which target** to call.
This subsystem decides **how that target is called and normalized**.

---

## 4. Architectural Role

The subsystem sits between provider-neutral platform execution and vendor-specific model APIs.

```text
Agent Runtime
  -> Model Access / Routing
       -> resolved model target + generation request
       -> LLM Provider Abstraction
            -> provider adapter
            -> credential resolution
            -> request execution
            -> stream normalization
            -> response normalization
       -> normalized model result
  -> continue reasoning / tool orchestration
```

### Upstream inputs

* resolved provider and model target from Model Access / Routing
* provider-neutral rendered input from Context Assembly
* effective tool list from runtime when tool use is enabled
* structured-output schema when requested
* timeouts, budgets, and streaming mode
* propagated identity and scope context, including `userId`, `threadId`, `runId`, and applicable `collaborativeScopeId` / `executionSpaceId`
* policy decision refs or equivalent runtime-cleared egress context for provider network execution
* correlation identifiers such as `stepId` and request IDs

### Downstream outputs

* canonical model response
* canonical stream sessions with provider-neutral events and one authoritative final result
* provider request and response metadata
* normalized usage and cost metadata
* normalized provider errors
* replay and trace artifacts

---

## 5. Goals and Non-Goals

### Goals

The subsystem must optimize for:

* provider neutrality in the platform core
* explicit capability negotiation
* stable canonical request and response shapes
* correct tool-call normalization
* safe streaming behavior
* bounded retries and timeouts
* observability and replay support
* room for provider-specific optimizations behind explicit capability profiles

### Non-Goals

The subsystem is not trying to optimize for:

* making all providers look identical when semantics differ materially
* hiding unsupported feature gaps
* choosing models or fallback targets autonomously
* embedding agent policies into provider calls
* authorizing side effects based on model output

The platform should avoid over-generalizing provider interfaces so far that useful provider strengths are lost.

---

## 6. Canonical Responsibilities

The LLM Provider Abstraction subsystem must:

* expose provider capability metadata to upstream routing logic
* accept only resolved targets rather than raw provider guessing
* validate request/target compatibility before network execution
* preserve identity, scope, and policy context through provider execution for traceability and replay
* serialize provider-neutral messages, tools, and response modes into vendor formats
* normalize all successful responses into canonical output objects
* normalize all streaming output into canonical events
* normalize tool-call requests as requests only, not execution approvals
* classify and surface errors using typed provider-neutral categories
* preserve vendor request IDs, model IDs, and raw artifact references for replay
* keep provider-specific behavior behind explicit adapter boundaries

---

## 7. Core Concepts

### 7.1 Resolved Model Target

The subsystem does not choose a model.
It receives a resolved target from Model Access / Routing.

A target should include:

* provider identity
* provider account or endpoint profile
* vendor model ID
* declared capability profile
* default timeout and request-shaping hints where applicable

### 7.2 Canonical Generation Request

The canonical request is the stable internal shape used by runtime and routing.
It should be expressive enough for:

* standard assistant generation
* streaming
* tool-enabled steps
* structured output
* multimodal input where supported

### 7.3 Canonical Generation Result

The canonical result must normalize:

* assistant output content
* tool-call requests
* finish reason
* usage and cost metadata
* provider identifiers
* response artifacts needed for replay

### 7.4 Provider Capability Profile

Providers differ in important ways.
The abstraction must make those differences explicit instead of pretending they do not exist.

Examples:

* system-message support
* tool-call support
* parallel tool-call support
* strict structured-output support
* image input support
* audio input support
* logprobs support
* server-side streaming support

---

## 8. Subsystem Invariants

This subsystem must obey the Layer 1.5 invariants and the runtime contract.

Additional provider-specific invariants:

1. **A provider adapter must never silently weaken a required feature.**
   If strict structured output, tools, or streaming are required and unsupported by the selected target, the request must fail with a typed compatibility error.

2. **Tool calls are requests, not authorizations.**
   The abstraction may normalize model-selected tool calls, but it must not imply that those calls are approved or executable.

3. **Streaming is non-authoritative.**
   Stream events are best-effort user experience signals. The final normalized response artifact is authoritative for replay and step completion.

4. **Provider-specific optimizations must be declared.**
   Any adapter-side optimization that changes payload shape or request strategy must be represented in adapter metadata and trace output.

5. **Canonical identifiers must survive provider execution.**
   `userId`, `threadId`, `runId`, `stepId`, internal request ID, applicable scope ids, policy decision refs, and provider request ID must remain traceable end-to-end.

6. **Provider execution must remain policy-first.**
   The subsystem may execute provider network calls only after runtime-owned policy has cleared the request or attached a policy decision ref. Adapters must not widen network access beyond that approved request path.

---

## 9. Capability Negotiation Contract

Capability negotiation should be explicit and fail fast.

### Required behavior

* routing chooses a target based on required features
* the provider abstraction validates that the chosen target still satisfies the request
* required features must fail closed if missing
* optional features may be omitted only when the request marks them optional
* any downgraded optional feature must be recorded in trace metadata

### Examples

* tool-enabled reasoning requires native or adapter-supported tool-call serialization
* strict JSON schema output requires a target that supports strict structured output semantics
* multimodal image input requires image-part support in the selected target profile

### Capability model

```go
package llmprovider

import (
	"context"
	"encoding/json"
	"time"
)

// ProviderID identifies a model vendor or vendor-compatible endpoint family.
type ProviderID string

// CapabilityProfile declares the behaviors a target adapter can support.
type CapabilityProfile struct {
	SystemMessages       bool
	Streaming            bool
	ToolCalls            bool
	ParallelToolCalls    bool
	StructuredOutput     bool
	StrictJSONSchema     bool
	ImageInput           bool
	AudioInput           bool
	LogProbs             bool
}

// ResolvedModelTarget is chosen upstream by routing and validated here before execution.
type ResolvedModelTarget struct {
	Provider            ProviderID
	ProviderAccountID   string
	ModelID             string
	EndpointProfile     string
	Capabilities        CapabilityProfile
	DefaultTimeout      time.Duration
}
```

---

## 10. Canonical Request Model

The request model should be provider-neutral and explicit.

### Message model

The abstraction should accept canonical messages rather than raw vendor payloads.
Text-only context is the minimum case, but the model should allow richer parts for future multimodal use.

```go
// MessageRole identifies the canonical role in a provider-neutral conversation.
type MessageRole string

const (
	RoleSystem    MessageRole = "system"
	RoleUser      MessageRole = "user"
	RoleAssistant MessageRole = "assistant"
	RoleTool      MessageRole = "tool"
)

// ContentPartKind identifies one part inside a canonical message.
type ContentPartKind string

const (
	PartText  ContentPartKind = "text"
	PartImage ContentPartKind = "image"
	PartAudio ContentPartKind = "audio"
	PartFile  ContentPartKind = "file"
)

// ContentPart is the provider-neutral content unit for multimodal input.
type ContentPart struct {
	Kind     ContentPartKind
	Text     *string
	URI      *string
	MimeType *string
}

// ModelMessage is the canonical message shape passed into provider execution.
type ModelMessage struct {
	Role  MessageRole
	Parts []ContentPart
}
```

### Tool and response-mode model

```go
// ToolDescriptor is the provider-neutral tool shape already filtered by runtime.
type ToolDescriptor struct {
	ToolID      string
	ToolVersion string
	Name        string
	Description string
	InputSchema json.RawMessage
}

// ResponseMode defines the expected completion style.
type ResponseMode string

const (
	ResponseModeText       ResponseMode = "text"
	ResponseModeStructured ResponseMode = "structured"
	ResponseModeToolAware  ResponseMode = "tool_aware"
)

// GenerationRequest is the canonical provider-neutral request.
type GenerationRequest struct {
	RequestID           string
	UserID              string
	ThreadID            string
	RunID               string
	StepID              string
	CollaborativeScopeID *string
	ExecutionSpaceID    *string
	PolicyDecisionRef   *string
	Target              ResolvedModelTarget
	Messages            []ModelMessage
	ResponseMode        ResponseMode
	ToolDescriptors     []ToolDescriptor
	ResponseSchema      json.RawMessage
	MaxOutputTokens     int
	Temperature         *float64
	TopP                *float64
	StopSequences       []string
	Stream              bool
	RequireStrictSchema bool
	RequireTools        bool
	Metadata            map[string]json.RawMessage
	Timeout             time.Duration
}
```

### Request validation rules

The subsystem must validate:

* `Target` is fully resolved
* `UserID`, `ThreadID`, `RunID`, `StepID`, and required request identifiers are present
* `CollaborativeScopeID`, `ExecutionSpaceID`, and `PolicyDecisionRef` are present when the resolved execution path requires them
* message roles and parts are legal
* tool descriptors are present when required
* strict schema is not requested without a schema
* incompatible feature combinations are rejected before provider execution

---

## 11. Canonical Response Model

The provider abstraction must return one normalized shape regardless of vendor payload differences.

```go
// FinishReason identifies why the model stopped generating.
type FinishReason string

const (
	FinishStop       FinishReason = "stop"
	FinishToolCall   FinishReason = "tool_call"
	FinishLength     FinishReason = "length"
	FinishContentFilter FinishReason = "content_filter"
	FinishError      FinishReason = "error"
)

// ToolCallRequest is the canonical representation of a model-selected tool call.
type ToolCallRequest struct {
	CallID           string
	ToolID           string
	ToolVersion      string
	ProviderToolName *string
	Arguments        json.RawMessage
}

// UsageMetrics records normalized token usage.
type UsageMetrics struct {
	InputTokens        int
	OutputTokens       int
	ReasoningTokens    *int
	CachedInputTokens  *int
}

// ModelOutput represents the assistant-visible result from one provider call.
type ModelOutput struct {
	Message          ModelMessage
	StructuredOutput json.RawMessage
	ToolCalls        []ToolCallRequest
	FinishReason     FinishReason
	Usage            UsageMetrics
	ProviderRequestID string
	ProviderModelID   string
}
```

### Response rules

* providers that return text only should normalize into one assistant message with text parts
* providers that return tool calls should normalize those calls even if the vendor payload shape differs
* providers that return both text and tool-call requests should preserve both when vendor semantics allow it
* structured output should be returned separately from plain assistant text when the request mode requires it

---

## 12. Streaming Contract

Streaming is important for channel latency but must not become the authoritative execution artifact.

### Required streaming behavior

* every stream must be linked to the canonical `RequestID`, `UserID`, `ThreadID`, `RunID`, and `StepID`
* stream events must be provider-neutral
* stream cancellation must propagate to the active provider call
* final step completion must still depend on the finalized response artifact, not stream completion alone

### Canonical stream event model

```go
// StreamEventType identifies one normalized event from a provider stream.
type StreamEventType string

const (
	StreamStarted      StreamEventType = "started"
	StreamTextDelta    StreamEventType = "text_delta"
	StreamToolDelta    StreamEventType = "tool_delta"
	StreamUsage        StreamEventType = "usage"
	StreamCompleted    StreamEventType = "completed"
)

// StreamEvent is the provider-neutral streaming unit.
type StreamEvent struct {
	RequestID string
	UserID    string
	ThreadID  string
	RunID     string
	StepID    string
	CollaborativeScopeID *string
	ExecutionSpaceID     *string
	Type      StreamEventType
	DeltaText *string
	ToolCall  *ToolCallRequest
	Usage     *UsageMetrics
}

// StreamResult carries the authoritative final normalized response for a streamed call.
type StreamResult struct {
	RequestID string
	UserID    string
	ThreadID  string
	RunID     string
	StepID    string
	CollaborativeScopeID *string
	ExecutionSpaceID     *string
	Output    ModelOutput
}

// StreamSession groups the non-authoritative event stream with the authoritative final result.
type StreamSession struct {
	Events <-chan StreamEvent
	Result <-chan StreamResult
	Errors <-chan error
}
```

### Streaming rules

* text deltas should be emitted in stable order
* partial tool-call argument deltas may be normalized as deltas or buffered until syntactically valid, but the adapter must document which mode it uses
* successful streamed executions must emit exactly one final `StreamResult`
* `StreamCompleted` closes delta emission only; authoritative completion occurs when the final `StreamResult` arrives
* stream completion without a final canonical response is insufficient for authoritative replay

---

## 13. Tool-Call Interoperability

Tool use is a joint contract between runtime, tool execution, and provider abstraction.

### Provider abstraction responsibilities

* serialize the runtime-approved effective tool list into provider format
* preserve stable tool identity through provider serialization, either by using canonical tool ids directly or by maintaining an unambiguous request-local mapping
* normalize provider-returned tool calls back into canonical tool-call requests
* reject malformed tool-call payloads from provider responses

### Explicit non-responsibilities

The provider abstraction must not:

* decide whether a tool should have been exposed
* execute tools
* re-authorize model-selected tools
* widen the tool set beyond what runtime provided

### Tool-call rules

* if `RequireTools` is true and the target lacks tool support, fail before network execution
* if the provider returns a tool call that cannot be mapped to exactly one exposed `toolId` and `toolVersion`, return a typed compatibility error or invalid tool-call error
* if tool-call arguments are malformed, return a normalized invalid-response error

---

## 14. Structured Output Contract

Structured output must be explicit because vendors vary significantly in native support.

### Rules

* strict schema mode must fail closed when unsupported
* non-strict structured mode may use adapter-supported shaping only if the route profile allows it
* structured output must remain separate from plain assistant text in the normalized result
* schema refs or hashes should be recorded for replay

### Compatibility posture

The subsystem should distinguish:

* native strict structured output
* adapter-supported structured output
* unsupported structured output

Only the first two may be used, and only when the target profile declares them.

---

## 15. Provider Adapter Model

Each provider integration should live behind a narrow adapter boundary.

### Adapter responsibilities

* translate canonical requests to provider payloads
* execute HTTP or SDK calls
* parse provider responses and streams
* normalize usage, finish reasons, and error classes
* expose target capability profiles

### Adapter rules

* adapters must not leak raw vendor SDK types beyond the subsystem boundary
* adapters must not embed routing policy
* adapters must return normalized errors even when raw vendor messages are preserved for diagnostics

### Adapter interfaces

```go
// Adapter executes canonical generation requests against one provider family.
type Adapter interface {
	ProviderID() ProviderID
	Supports(target ResolvedModelTarget, req GenerationRequest) error
	Generate(ctx context.Context, req GenerationRequest) (ModelOutput, error)
	Stream(ctx context.Context, req GenerationRequest) (StreamSession, error)
}

// Registry resolves adapters for already-routed targets.
type Registry interface {
	AdapterFor(target ResolvedModelTarget) (Adapter, error)
}
```

---

## 16. Error Model

Provider failures must be classified in a way runtime and routing can act on safely.

### Error categories

* invalid request
* unsupported capability
* authentication failure
* authorization failure
* rate limit
* timeout
* transient provider outage
* malformed provider response
* canceled request

### Typed error model

```go
// ErrorCode identifies a canonical provider error class.
type ErrorCode string

const (
	ErrInvalidRequest       ErrorCode = "invalid_request"
	ErrUnsupportedFeature   ErrorCode = "unsupported_feature"
	ErrAuthentication       ErrorCode = "authentication"
	ErrAuthorization        ErrorCode = "authorization"
	ErrRateLimit            ErrorCode = "rate_limit"
	ErrTimeout              ErrorCode = "timeout"
	ErrProviderUnavailable  ErrorCode = "provider_unavailable"
	ErrMalformedResponse    ErrorCode = "malformed_response"
	ErrCanceled             ErrorCode = "canceled"
)

// ProviderError carries a normalized error plus provider diagnostics.
type ProviderError struct {
	Code              ErrorCode
	Message           string
	Retryable         bool
	ProviderRequestID *string
	ProviderStatus    *int
}

func (e ProviderError) Error() string {
	return e.Message
}
```

### Error-handling rules

* retryability must be explicit on normalized errors
* provider transport retries must be bounded and idempotency-safe
* malformed provider payloads must not be passed through as if they were valid model output

---

## 17. Timeouts, Retries, and Cancellation

The subsystem should enforce transport-level resilience without taking over routing policy.

### Rules

* request timeout must default from the resolved target or request override
* cancellation from runtime must cancel active provider work
* retries should be limited to retryable transport, timeout, and provider-unavailable classes when safe
* authentication, authorization, unsupported-feature, and malformed-response errors should not be retried automatically

### Idempotency posture

Each request should carry a stable internal request ID so adapters can use provider idempotency features where available.

---

## 18. Observability and Replay

The provider layer is one of the main replay boundaries.

### Required trace fields

* internal request ID
* `userId`
* `threadId`
* `runId`
* `stepId`
* `collaborativeScopeId` when applicable
* `executionSpaceId` when applicable
* provider ID
* provider account or endpoint profile
* vendor model ID
* stream enabled flag
* policy decision ref when present
* tool exposure summary
* schema hash or ref when structured output is used
* provider request ID
* finish reason
* normalized usage metrics
* latency metrics
* retry count

### Replay artifacts

For replay and audit, the subsystem should preserve:

* canonical request envelope hash
* propagated identity and scope envelope
* policy decision ref
* canonical rendered messages or refs
* tool descriptors or refs
* structured-output schema ref
* normalized final response
* raw provider request and response refs where policy permits
* stream event refs when recorded

### Replay rules

* final normalized responses are authoritative for replay
* stream replays are best-effort unless exact stream events were stored
* provider-specific raw payloads should not be the only replay artifact

---

## 19. Security and Credential Boundaries

Provider credentials are sensitive and should remain outside the public subsystem contract.

### Rules

* adapters obtain credentials through approved configuration or secret-broker mechanisms
* credentials must not be stored in request payload artifacts
* trace output must redact sensitive headers, secrets, and account secrets
* provider account selection must remain explicit in the resolved target

This subsystem uses credentials. It does not own credential storage policy.

---

## 20. Configuration Direction

Provider execution must obey the platform configuration contract and precedence order:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `defaultProviderTimeout` | default request timeout when target does not override | duration | target-defined | system or agent |
| `maxProviderRetries` | bound retry count for retryable transport failures | integer | conservative | system or agent |
| `captureRawProviderPayloads` | preserve raw provider request/response refs when policy allows | boolean | false | system or collaborative scope |
| `providerAccountSelectionMode` | constrain which provider account/profile a route may use | string | explicit target | system or collaborative scope |
| `defaultStreamingMode` | enable streaming by default when the caller allows it | boolean | false | agent or run |
| `structuredOutputFallbackMode` | allow adapter-shaped non-strict structured output where supported | string | policy-controlled | system or agent |

### Configuration rules

* all provider configuration must declare scope explicitly
* effective timeout, retry, provider-account, and payload-capture settings must be traceable and replay-visible
* overrides must not silently reroute requests or widen credential reach
* run-level overrides may tighten provider behavior, but must not widen risk posture beyond policy-approved limits

---

## 21. API Surface

The public API should remain narrow and provider-neutral.

```go
// Executor runs canonical generation requests against already-routed targets.
type Executor interface {
	Execute(ctx context.Context, req GenerationRequest) (ModelOutput, error)
	ExecuteStream(ctx context.Context, req GenerationRequest) (StreamSession, error)
}

// CapabilityReader exposes provider capability metadata to routing or diagnostics.
type CapabilityReader interface {
	GetCapabilities(ctx context.Context, target ResolvedModelTarget) (CapabilityProfile, error)
}
```

### Execution contract

* `Execute` returns the final normalized response artifact
* `ExecuteStream` returns a `StreamSession` with provider-neutral events, one authoritative final result, and terminal errors
* callers remain responsible for tying the final `StreamResult` to finalized step state

---

## 22. Downstream and Peer Dependencies

### Upstream dependencies

* Model Access / Routing
* Context Assembly
* configuration service
* credential or secret broker

### Downstream / peer dependencies

* provider SDKs or HTTP clients
* Observability and Replay
* Policy and Approval System for trace metadata only where needed
* Tool Execution Framework through shared tool descriptors and tool-call contracts

### Explicit boundary with routing

Routing may:

* choose a provider and model
* choose fallback targets
* choose latency or budget posture

The provider abstraction may:

* validate the chosen target
* execute the chosen target
* report normalized capability or execution failure

The provider abstraction must not silently reroute to a different target on its own.

---

## 23. Tradeoffs and Design Decisions

### Decision: provider-neutral canonical request/response model

**Why:** keeps runtime and routing stable across vendors
**Alternative:** let runtime talk to vendor SDKs directly
**Consequence:** more adapter work, much cleaner platform core

### Decision: explicit capability validation before execution

**Why:** prevents hidden semantic downgrades
**Alternative:** best-effort provider fallback inside adapters
**Consequence:** more early failures, much safer behavior

### Decision: final normalized response is authoritative, stream is not

**Why:** aligns with runtime replay and checkpoint contracts
**Alternative:** treat stream completion as equivalent to final result
**Consequence:** slightly more bookkeeping, much better replay integrity

### Decision: adapters do not own routing policy

**Why:** keeps provider execution separate from model-choice policy
**Alternative:** let each adapter pick its own fallbacks
**Consequence:** clearer control flow and better observability

### Decision: provider-specific strengths are exposed through capability profiles

**Why:** avoids lowest-common-denominator design
**Alternative:** flatten every provider to the weakest common interface
**Consequence:** routing and callers must reason about capabilities explicitly

---

## 24. Final Position

The platform should treat LLM Provider Abstraction as a first-class Layer 2 subsystem that sits below routing and above vendor APIs.

Its authoritative contract is:

* accept a resolved provider target and canonical generation request
* validate capability compatibility
* execute against the selected vendor API
* return a normalized final response and optional normalized stream events
* preserve replay-grade metadata and typed errors

This subsystem should remain separate from:

* routing policy
* prompt construction
* tool execution authorization
* agent reasoning

That separation keeps the platform provider-neutral, explicit about capability gaps, and stable under replay, streaming, and tool-enabled execution.
