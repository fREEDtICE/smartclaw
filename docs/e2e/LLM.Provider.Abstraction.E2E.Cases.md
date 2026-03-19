# LLM Provider Abstraction E2E Cases

This document proposes thirteen deterministic E2E scenarios for the LLM Provider Abstraction subsystem.
It covers both end-to-end user journeys and module black-box flows driven through the provider-execution boundary, including target-bound authorization, capability negotiation, canonical response normalization, streaming, typed errors, replay evidence, and bounded retry behavior.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic runtime step intents and routed-target fixtures
* seeded identity, thread, collaborative-scope, routing-decision, policy, and configuration snapshots
* fake provider adapters with deterministic request, response, stream, and error fixtures
* replay-visible raw payload refs, normalized output artifacts, and usage metadata
* trace, checkpoint, and replay capture for every meaningful provider-execution action

## Suite structure

### User-journey scenarios

1. routed text generation returns one canonical assistant response
2. tool-aware model step returns canonical tool-call requests without execution
3. strict structured output succeeds on a compatible routed target
4. streamed response emits provider-neutral deltas and one authoritative final result
5. transient timeout is retried on the same target and then succeeds without routing drift

### Module black-box scenarios

6. target-mismatched or expired provider egress authorization fails closed before network execution
7. required tool support missing on the routed target returns `unsupported_feature`
8. strict schema requested on a target without strict schema support fails closed
9. unmappable provider tool call returns a typed error instead of a canonical executable tool request
10. malformed provider payload returns `malformed_response` and no canonical model output
11. authentication failure is non-retryable and does not auto-reissue the call
12. retries exhausted on timeout or provider outage return a normalized failure and no adapter-side failover
13. stream delta completion without a final canonical result is insufficient for authoritative success

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Routed text generation returns one canonical assistant response
* `Risk level:` Low
* `Rationale:` Proves the baseline provider-execution happy path: runtime hands the provider layer one routed target plus one exact-bound provider egress authorization, the adapter executes one provider call, and the subsystem returns one normalized final `ModelOutput` with replay-visible usage and provider identifiers.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing / Access routed `ResolvedModelTarget` and replay-visible routing decision
* Layer 2: LLM Provider Abstraction `GenerationRequest` validation, target-bound `ProviderEgressAuthorization`, canonical `ModelOutput`, and replay artifact capture
* Layer 2: Agent Runtime model execution seam and final-step orchestration
* Layer 2: Observability provider request/response, usage, latency, and replay-manifest evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_provider_text`, one open thread `thread_provider_text`, one active collaborative scope `scope_provider_text`, one routing decision selecting a text-capable target, and deterministic config with conservative timeout and zero retry pressure for this scenario.
* Seeded policy rules: provider egress is allowed for the routed target and request mode; the resulting `ProviderEgressAuthorization` binds to the routed provider, account, endpoint profile, model id, and non-streaming mode.
* Seeded memory and retrieval stores: both stores exist and are empty so the step isolates provider execution rather than context richness.
* Selected model mode: deterministic provider adapter fixture that returns one plain-text assistant completion with normalized usage metrics.
* Selected tool implementations: no tool execution occurs; `toolDescriptors` is empty.
* Expected capability set: the routed target supports text generation and does not require tool calls, structured output, or streaming.
* Execution-space posture: no execution-space-specific constraint is required for this call; if an `executionSpaceId` is carried, it remains lineage only.
* Approval or replay fixtures: routing-decision fixture, provider adapter fixture, raw payload artifact store when allowed, trace collector, and replay verifier.

### Given / When / Then

Given Agent Runtime has already obtained a routing decision for one text-only reasoning step and attached a valid target-bound `ProviderEgressAuthorization`,
When the LLM Provider Abstraction validates the `GenerationRequest`, executes the routed provider call, and normalizes the provider response,
Then it returns exactly one canonical `ModelOutput` containing assistant text, normalized usage metrics, a finish reason, the provider request id, and the provider model id.

### Required assertions

`Required fixtures:`

* The routing decision selects a target whose capability profile supports the requested non-streaming text mode.
* The `ProviderEgressAuthorization.allowedTargetHash` matches the routed target exactly.
* The provider adapter fixture returns a deterministic text response and token counts.

`Required observability artifacts:`

* Routing decision ref and provider-execution trace linked by the same `requestId`, `runId`, and `stepId`.
* Provider request metadata including provider id, provider account or endpoint profile, vendor model id, stream-disabled flag, and authorization id.
* Normalized usage metrics, latency metrics, finish reason, and provider request id.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views linking the reasoning step to the provider attempt and final output.

`Required replay artifacts:`

* Canonical request envelope hash and propagated identity/scope envelope.
* `ProviderEgressAuthorization` ref and underlying policy decision ref.
* Canonical rendered messages or refs.
* Normalized final `ModelOutput`.
* Raw provider request and response refs where policy permits capture.

`Pass/fail oracle:`

* The provider call occurs only after a valid routed target and exact-bound egress authorization exist, one normalized `ModelOutput` is returned, and replay-visible evidence reconstructs the call without depending on raw vendor payloads alone.

### Required harness capabilities

* Runtime step fixture with routed-target input
* Model Routing / Access decision fixture service
* Deterministic provider adapter fixture
* Policy fixture service for provider egress
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Tool-aware model step returns canonical tool-call requests without execution
* `Risk level:` Medium
* `Rationale:` Proves the provider layer’s tool-call boundary: runtime may expose an already-filtered effective tool list, the provider layer may serialize and normalize tool calls, but those calls remain requests only and are not treated as approvals or executions.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Agent Runtime tool-aware model execution seam and tool exposure contract
* Layer 2: LLM Provider Abstraction tool-descriptor serialization, canonical `ToolCallRequest` normalization, and non-authorization boundary
* Layer 2: Observability tool exposure summary, provider metadata, and normalized model output evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_provider_toolcall`, one open thread `thread_provider_toolcall`, one active collaborative scope `scope_provider_toolcall`, one routing decision selecting a tool-capable target, and deterministic config with tool-aware response mode enabled.
* Seeded policy rules: provider egress is allowed for the routed target; the tool descriptors provided to the provider layer already reflect runtime’s effective tool set and no tool execution authorization has been issued yet.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: deterministic provider adapter fixture that emits one tool call for an exposed tool and no direct final answer.
* Selected tool implementations: one immutable runtime-approved `ToolDescriptor` is supplied for serialization only.
* Expected capability set: the routed target supports `toolCalls`; no parallel tool calls are required for this scenario.
* Execution-space posture: no tool execution occurs yet, so any `executionSpaceId` remains lineage only.
* Approval or replay fixtures: routing-decision fixture, provider adapter fixture returning one tool call, trace collector, and replay verifier.

### Given / When / Then

Given runtime sends one tool-aware `GenerationRequest` with an exact effective tool list and a target that supports tool calls,
When the provider abstraction serializes the tool descriptors into vendor format, executes the provider call, and normalizes the returned vendor tool call,
Then it returns one canonical `ModelOutput` whose `toolCalls` field contains one `ToolCallRequest` and no tool execution occurs inside the provider subsystem.

### Required assertions

`Required fixtures:`

* The supplied `ToolDescriptor` version and schema remain immutable for the request.
* The routed target advertises `toolCalls = true`.
* The provider adapter fixture emits a tool call that maps exactly to the exposed `toolId` and `toolVersion`.

`Required observability artifacts:`

* Tool exposure summary linked to the provider request.
* Provider request/response metadata plus normalized finish reason `tool_call`.
* Normalized `ToolCallRequest` evidence containing `callId`, `toolId`, `toolVersion`, and arguments.
* Explicit absence of any tool-execution record inside the provider layer for this scenario.

`Required replay artifacts:`

* Canonical request envelope hash, routed target ref, and `ProviderEgressAuthorization` ref.
* Tool-descriptor refs used for serialization.
* Normalized final `ModelOutput` with `toolCalls`.
* Raw provider request and response refs where capture is allowed.

`Pass/fail oracle:`

* The returned tool call maps exactly to the runtime-exposed tool descriptor, no extra tool is introduced, and no tool execution or re-authorization happens inside the provider subsystem.

### Required harness capabilities

* Runtime step fixture with effective tool-set input
* Model Routing / Access decision fixture service
* Deterministic provider adapter fixture with tool-call response mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Strict structured output succeeds on a compatible routed target
* `Risk level:` Medium
* `Rationale:` Proves the structured-output happy path: when routing selects a target with strict schema support and runtime requests strict structured output, the provider layer returns structured data separately from plain assistant text and records schema lineage for replay.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing / Access capability-fit routing decision for strict schema mode
* Layer 2: LLM Provider Abstraction strict structured-output request validation, canonical result separation, and schema replay capture
* Layer 2: Observability schema refs, provider ids, usage, and final-result evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_provider_structured`, one open thread `thread_provider_structured`, one active collaborative scope `scope_provider_structured`, one routing decision selecting a target with `structuredOutput = true` and `strictJSONSchema = true`, and deterministic config with no fallback shaping required.
* Seeded policy rules: provider egress is allowed for the routed target and non-streaming structured mode.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: deterministic provider adapter fixture that returns one valid structured result matching the supplied schema.
* Selected tool implementations: none invoked.
* Expected capability set: strict structured output is required and supported by the selected target.
* Execution-space posture: none required.
* Approval or replay fixtures: structured schema ref or hash fixture, routing-decision fixture, and replay verifier.

### Given / When / Then

Given runtime requests structured output with `requireStrictSchema = true` and routing has selected a target that declares strict schema support,
When the provider abstraction validates the request, executes the provider call, and normalizes the result,
Then it returns one canonical `ModelOutput` where the structured data appears in `structuredOutput` and the schema ref remains replay-visible.

### Required assertions

`Required fixtures:`

* The routed target advertises both `structuredOutput = true` and `strictJSONSchema = true`.
* A valid schema ref or hash is present in the request.
* The provider adapter fixture returns data conforming to the supplied schema.

`Required observability artifacts:`

* Routing-decision evidence showing strict schema capability fit.
* Provider request metadata including schema hash or ref.
* Normalized final `ModelOutput` with `structuredOutput` populated separately from assistant text.
* Usage, latency, finish reason, provider request id, and provider model id.

`Required replay artifacts:`

* Canonical request envelope hash and propagated identity/scope envelope.
* Structured-output schema ref or hash.
* `ProviderEgressAuthorization` ref and policy decision lineage.
* Normalized final `ModelOutput` and raw provider payload refs where permitted.

`Pass/fail oracle:`

* The step succeeds only because the routed target supports strict schema mode, the normalized result preserves structured output as a separate field, and replay-visible schema lineage is sufficient to audit the result contract.

### Required harness capabilities

* Runtime structured-output step fixture
* Model Routing / Access decision fixture service
* Deterministic provider adapter fixture with strict-schema mode
* Schema fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Streamed response emits provider-neutral deltas and one authoritative final result
* `Risk level:` Medium
* `Rationale:` Proves the streaming contract: provider-neutral `StreamEvent` deltas are non-authoritative, exactly one final `StreamResult` is authoritative, and the stream stays linked to the same identity, thread, run, step, and request lineage as the underlying model call.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: LLM Provider Abstraction `ExecuteStream`, `StreamEvent`, `StreamResult`, and streaming invariants
* Layer 2: Agent Runtime streaming side-channel and authoritative final-output contract
* Layer 2: Observability stream-event and final-result evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_provider_stream`, one open thread `thread_provider_stream`, one active collaborative scope `scope_provider_stream`, one routing decision selecting a streaming-capable target, and deterministic config with stream mode enabled.
* Seeded policy rules: provider egress is allowed for the routed target in streaming mode, and the `ProviderEgressAuthorization` explicitly permits streaming.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: deterministic provider adapter fixture that emits three ordered text deltas, one completed event, and one final `StreamResult`.
* Selected tool implementations: none invoked.
* Expected capability set: the routed target supports `streaming = true`.
* Execution-space posture: none required.
* Approval or replay fixtures: streaming provider adapter fixture, trace collector, and replay verifier.

### Given / When / Then

Given runtime issues one streaming `GenerationRequest` against a routed target that supports streaming and a matching egress authorization,
When the provider abstraction executes the streamed call and normalizes its vendor stream into provider-neutral events,
Then it emits ordered `StreamEvent` deltas linked to the canonical request lineage and exactly one authoritative `StreamResult` carrying the final normalized response.

### Required assertions

`Required fixtures:`

* The routed target advertises `streaming = true`.
* The `ProviderEgressAuthorization` explicitly allows streaming for the target and request mode.
* The provider adapter fixture returns deterministic stream ordering and one final normalized result.

`Required observability artifacts:`

* Provider-execution trace fields including `requestId`, `runId`, `stepId`, stream-enabled flag, authorization id, and provider request id.
* Ordered `StreamEvent` records with provider-neutral event types.
* One final `StreamResult` linked to the same request lineage.
* Usage, latency, and finish-reason evidence for the authoritative final result.

`Required replay artifacts:`

* Canonical request envelope hash and propagated identity/scope envelope.
* `ProviderEgressAuthorization` ref and policy decision lineage.
* Stream event refs when capture is enabled.
* Final normalized `StreamResult` as the authoritative replay artifact.

`Pass/fail oracle:`

* Stream deltas are emitted in stable order, exactly one final `StreamResult` exists, and replay treats the final normalized result rather than the stream completion event as authoritative.

### Required harness capabilities

* Runtime streaming-step fixture
* Model Routing / Access decision fixture service
* Deterministic streaming provider adapter fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 5

### Scenario summary

* `Title:` Transient timeout is retried on the same target and then succeeds without routing drift
* `Risk level:` Medium
* `Rationale:` Proves the transport-resilience boundary: the provider layer may perform bounded same-target retries for retryable timeout or transient-availability classes, but it must remain on the routed target and preserve explicit retry evidence.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing / Access same-target retry stays below routing; no cross-target failover inside provider layer
* Layer 2: LLM Provider Abstraction bounded retry rules, timeout handling, idempotent request id posture, and canonical success normalization
* Layer 2: Agent Runtime ownership of step state with provider-layer retry evidence
* Layer 2: Observability retry count, latency, and attempt evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_provider_retry`, one open thread `thread_provider_retry`, one active collaborative scope `scope_provider_retry`, one routing decision selecting a single primary target, and deterministic config with `maxProviderRetries = 1`.
* Seeded policy rules: provider egress is allowed for the routed target and request mode.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: deterministic provider adapter fixture that times out once on the selected target and then returns a valid final response on the retry.
* Selected tool implementations: none invoked.
* Expected capability set: no tool, structured-output, or streaming requirement is needed.
* Execution-space posture: none required.
* Approval or replay fixtures: routed target fixture, provider adapter timeout-then-success fixture, and trace collector.

### Given / When / Then

Given runtime issues one non-streaming `GenerationRequest` against a routed target and the provider fixture times out on the first attempt with a retryable timeout,
When the provider abstraction applies one bounded same-target retry using the same canonical request lineage and then receives a valid provider response,
Then it returns one successful normalized `ModelOutput` without changing targets or advancing any fallback chain.

### Required assertions

`Required fixtures:`

* `maxProviderRetries` is set to allow exactly one retry.
* The first provider attempt fails with a retryable timeout and the second succeeds on the same target.
* The routed target and authorization remain unchanged across both attempts.

`Required observability artifacts:`

* Provider trace records showing attempt count, retry count, timeout on attempt one, and success on attempt two.
* Stable canonical request id across both attempts.
* Provider request ids or attempt metadata for each attempt when available.
* Final normalized success result linked back to the routed target and same authorization id.

`Required replay artifacts:`

* Canonical request envelope hash.
* `ProviderEgressAuthorization` ref and routed target ref.
* Attempt evidence for the timed-out first call and successful second call.
* Final normalized `ModelOutput`.

`Pass/fail oracle:`

* The provider layer retries exactly once on the same target, returns a valid normalized success result, and records explicit retry evidence without any adapter-side target change.

### Required harness capabilities

* Runtime provider-step fixture
* Model Routing / Access decision fixture service
* Deterministic provider adapter fixture with timeout-then-success behavior
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module black-box scenarios

## Scenario 6

### Scenario summary

* `Title:` Target-mismatched or expired provider egress authorization fails closed before network execution
* `Risk level:` High
* `Rationale:` Proves the provider network boundary is policy-first and target-bound: provider execution must not proceed when the runtime-issued authorization is missing, expired, or mismatched to the routed target or stream mode.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: LLM Provider Abstraction request-validation and fail-closed authorization rules
* Layer 2: Agent Runtime model execution seam requiring `ProviderEgressAuthorization`
* Layer 2: Observability validation-failure evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one valid routed target exists, but the supplied `ProviderEgressAuthorization` is either expired or bound to a different `allowedTargetHash`.
* Seeded policy rules: the historical decision exists only for the stale or different target; no fresh authorization is present for the current request.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the call must fail during request validation.
* Selected tool implementations: none.
* Expected capability set: the routed target itself is otherwise compatible.
* Execution-space posture: any required execution-space lineage is present but not relevant to the failure.
* Approval or replay fixtures: provider adapter spy that records any accidental network execution.

### Given / When / Then

Given one `GenerationRequest` is structurally valid except that its provider egress authorization is expired or mismatched to the routed target,
When the provider abstraction validates the request,
Then it rejects the request before any provider network execution and returns a normalized failure for the unenforceable egress contract.

### Required assertions

`Required fixtures:`

* The routed target is otherwise compatible with the requested mode.
* The authorization fixture is deterministically expired or target-mismatched.
* The provider adapter spy starts empty.

`Required observability artifacts:`

* Validation-failure trace or event including request id, target identity, and authorization id.
* Explicit absence of provider execution attempt metadata.
* Normalized failure artifact with explicit retryability posture.

`Required replay artifacts:`

* Canonical request envelope hash.
* Routed target ref and rejected authorization ref.
* Failure evidence showing the request was rejected before provider execution.

`Pass/fail oracle:`

* No provider call is attempted, the provider adapter spy records zero executions, and the failure is attributable to the invalid or mismatched authorization rather than vendor behavior.

### Required harness capabilities

* Runtime provider-step fixture
* Model Routing / Access decision fixture service
* Provider adapter spy
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Required tool support missing on the routed target returns `unsupported_feature`
* `Risk level:` Medium
* `Rationale:` Proves fast-fail capability validation: if tool-aware generation is required but the routed target lacks tool-call support, the provider layer must reject the request before network execution.

### Contracts validated

* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Policy First`
* Layer 2: Model Routing / Access capability fit as a hard constraint and drift handling
* Layer 2: LLM Provider Abstraction tool-capability validation and `unsupported_feature` failure
* Layer 2: Observability compatibility-failure evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one routed target exists whose capability profile sets `toolCalls = false`, and runtime marks `requireTools = true` with one non-empty tool-descriptor list.
* Seeded policy rules: provider egress authorization is otherwise valid.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the call must fail before provider execution.
* Selected tool implementations: one immutable tool descriptor is present for serialization eligibility checking only.
* Expected capability set: tool-call support is required by the request but absent on the target.
* Execution-space posture: none required.
* Approval or replay fixtures: routed target fixture plus provider adapter spy.

### Given / When / Then

Given runtime requests a tool-aware model step with `requireTools = true` against a routed target whose capability profile does not support tool calls,
When the provider abstraction validates request-target compatibility,
Then it fails closed with `unsupported_feature` before network execution.

### Required assertions

`Required fixtures:`

* The routed target advertises `toolCalls = false`.
* The request includes tool descriptors and requires tool support.
* The provider adapter spy records any accidental call attempt.

`Required observability artifacts:`

* Compatibility-validation evidence showing required tool capability mismatch.
* Normalized `unsupported_feature` error with explicit retryability posture.
* Explicit absence of provider execution metadata.

`Required replay artifacts:`

* Request envelope hash, target capability profile ref, and authorization ref.
* Compatibility-failure evidence showing the provider call was blocked before execution.

`Pass/fail oracle:`

* The request fails before network execution, returns `unsupported_feature`, and no adapter-side best-effort downgrade or hidden call occurs.

### Required harness capabilities

* Runtime tool-aware step fixture
* Model Routing / Access decision fixture service
* Provider adapter spy
* Capability-profile fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Strict schema requested on a target without strict schema support fails closed
* `Risk level:` Medium
* `Rationale:` Proves strict structured-output compatibility is a hard requirement and cannot be silently weakened by adapter-side shaping.

### Contracts validated

* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Policy First`
* Layer 2: LLM Provider Abstraction strict-schema validation and fail-closed compatibility handling
* Layer 2: Model Routing / Access hard capability constraint and route-drift evidence
* Layer 2: Observability compatibility-failure evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one routed target advertises `structuredOutput = true` but `strictJSONSchema = false`, and runtime requests `requireStrictSchema = true` with a schema present.
* Seeded policy rules: provider egress authorization is otherwise valid.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the call must fail before provider execution.
* Selected tool implementations: none.
* Expected capability set: strict schema is required but unsupported.
* Execution-space posture: none required.
* Approval or replay fixtures: target capability fixture and provider adapter spy.

### Given / When / Then

Given runtime requests strict structured output against a routed target that lacks strict schema capability,
When the provider abstraction validates the request,
Then it rejects the call with `unsupported_feature` before network execution rather than silently using weaker adapter shaping.

### Required assertions

`Required fixtures:`

* The routed target capability profile sets `strictJSONSchema = false`.
* The request includes a schema and sets `requireStrictSchema = true`.
* The provider adapter spy records any accidental call attempt.

`Required observability artifacts:`

* Compatibility-validation evidence citing strict schema mismatch.
* Normalized `unsupported_feature` error.
* Explicit absence of provider execution metadata.

`Required replay artifacts:`

* Request envelope hash, schema ref or hash, target capability profile ref, and authorization ref.
* Compatibility-failure evidence preserving the hard requirement.

`Pass/fail oracle:`

* The request fails before provider execution, no weaker structured-output mode is substituted silently, and replay-visible evidence preserves the strict-schema mismatch.

### Required harness capabilities

* Runtime structured-output step fixture
* Model Routing / Access decision fixture service
* Provider adapter spy
* Capability-profile fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Unmappable provider tool call returns a typed error instead of a canonical executable tool request
* `Risk level:` High
* `Rationale:` Proves the provider layer will not leak ambiguous vendor tool identities into runtime as if they were safe canonical tool requests.

### Contracts validated

* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: LLM Provider Abstraction tool-call interoperability, unmappable-tool rejection, and malformed or compatibility error handling
* Layer 2: Agent Runtime tool-call requests remain requests only after canonical normalization
* Layer 2: Observability invalid-tool-call evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one routed tool-capable target exists and runtime supplies one exact exposed tool set.
* Seeded policy rules: provider egress authorization is valid for the target and request mode.
* Seeded memory and retrieval stores: not used.
* Selected model mode: deterministic provider adapter fixture that returns a vendor tool call whose name or mapping cannot be reconciled to exactly one exposed `toolId` and `toolVersion`.
* Selected tool implementations: runtime-provided tool descriptors exist only for exposure and mapping.
* Expected capability set: tool-call support is present, but the returned vendor tool name is incompatible with the exposed canonical tool set.
* Execution-space posture: no tool execution occurs.
* Approval or replay fixtures: provider adapter fixture returning one unmappable tool call and trace collector.

### Given / When / Then

Given a tool-aware provider request executes successfully at the transport layer but the returned vendor tool call cannot be mapped to exactly one exposed canonical tool descriptor,
When the provider abstraction normalizes the provider response,
Then it returns a typed failure instead of a canonical `ToolCallRequest`.

### Required assertions

`Required fixtures:`

* The exposed tool set is deterministic and contains no ambiguous aliases that would make the mapping under-specified.
* The vendor tool call cannot map to exactly one `toolId` and `toolVersion`.
* No downstream tool execution is triggered.

`Required observability artifacts:`

* Provider response-normalization evidence showing the mapping failure.
* Typed normalized error returned to runtime.
* Explicit absence of a canonical `ToolCallRequest` artifact for the invalid vendor call.

`Required replay artifacts:`

* Request envelope hash, tool-descriptor refs, and provider response ref where capture is allowed.
* Normalization-failure evidence showing why the tool call could not be mapped safely.

`Pass/fail oracle:`

* Runtime receives a typed failure rather than an ambiguous executable tool request, and replay-visible evidence explains the mapping failure.

### Required harness capabilities

* Runtime tool-aware step fixture
* Deterministic provider adapter fixture with invalid tool-call output
* Tool-descriptor fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The provider-abstraction design requires a typed compatibility error or invalid tool-call error here, but the canonical error model does not define a dedicated `invalid_tool_call` code or say whether this case must normalize as `unsupported_feature` or `malformed_response`.

## Scenario 10

### Scenario summary

* `Title:` Malformed provider payload returns `malformed_response` and no canonical model output
* `Risk level:` High
* `Rationale:` Proves the provider layer fails closed on unusable vendor payloads and never passes malformed output upward as if it were a valid canonical response.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Policy First`
* Layer 2: LLM Provider Abstraction malformed-provider-response handling and non-retry-on-malformed rule
* Layer 2: Observability normalization-failure evidence and raw payload refs where permitted

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one otherwise valid routed target and authorization exist.
* Seeded policy rules: provider egress authorization is valid.
* Seeded memory and retrieval stores: not used.
* Selected model mode: deterministic provider adapter fixture that returns an invalid vendor payload that cannot be normalized into assistant text, structured output, or tool calls.
* Selected tool implementations: none.
* Expected capability set: not applicable because the failure occurs during response normalization.
* Execution-space posture: none required.
* Approval or replay fixtures: raw provider payload capture enabled for this scenario when policy allows.

### Given / When / Then

Given a provider call succeeds at the network boundary but returns a malformed or unusable vendor payload,
When the provider abstraction attempts response normalization,
Then it returns `malformed_response` and emits no canonical `ModelOutput`.

### Required assertions

`Required fixtures:`

* The request and authorization are otherwise valid.
* The provider payload is deterministically malformed for the selected adapter.
* Automatic retries are disabled for `malformed_response`.

`Required observability artifacts:`

* Provider attempt metadata and normalization-failure evidence.
* Normalized `malformed_response` error with `retryable = false`.
* Raw provider response ref where capture is allowed.
* Explicit absence of canonical `ModelOutput`.

`Required replay artifacts:`

* Request envelope hash and authorization ref.
* Raw response ref where permitted plus normalization-failure evidence.
* Error artifact showing no valid canonical response was produced.

`Pass/fail oracle:`

* No canonical model output is emitted, the failure normalizes as `malformed_response`, and the provider layer does not retry or pass the malformed payload through as valid output.

### Required harness capabilities

* Runtime provider-step fixture
* Deterministic provider adapter fixture with malformed-response mode
* Raw payload capture fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Authentication failure is non-retryable and does not auto-reissue the call
* `Risk level:` High
* `Rationale:` Proves the credential-boundary failure path: provider authentication failures must normalize cleanly, remain non-retryable by default, and not trigger blind retries.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: LLM Provider Abstraction authentication failure normalization, retryability rules, and credential-boundary handling
* Layer 2: Observability provider error, authorization lineage, and retry-count evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one routed target and valid target-bound authorization exist, but the provider credential fixture is invalid.
* Seeded policy rules: provider egress authorization is valid for the request; the failure comes from provider authentication, not missing policy.
* Seeded memory and retrieval stores: not used.
* Selected model mode: deterministic provider adapter fixture returning an authentication failure.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: credential failure injector, provider adapter fixture, and trace collector.

### Given / When / Then

Given a valid routed provider request with a valid egress authorization but invalid provider credentials,
When the provider abstraction executes the call,
Then it returns a normalized `authentication` error and does not automatically retry the request.

### Required assertions

`Required fixtures:`

* The routed target and authorization are otherwise valid.
* The credential failure is deterministic and adapter-specific.
* Retry configuration does not override the non-retryable authentication class.

`Required observability artifacts:`

* Provider attempt metadata with the failed provider request context.
* Normalized `authentication` error with `retryable = false`.
* Retry-count evidence showing zero automatic retries.

`Required replay artifacts:`

* Request envelope hash, routed target ref, and authorization ref.
* Normalized error artifact and any provider request id or provider status where available.

`Pass/fail oracle:`

* The call fails once with a normalized `authentication` error, no automatic retry occurs, and the failure remains attributable to provider credentials rather than routing or policy.

### Required harness capabilities

* Runtime provider-step fixture
* Deterministic provider adapter fixture with authentication-failure mode
* Credential-failure injector
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Retries exhausted on timeout or provider outage return a normalized failure and no adapter-side failover
* `Risk level:` High
* `Rationale:` Proves the retry/failover boundary: the provider layer may retry the same target within bounded policy, but once retries are exhausted it must return a normalized failure to runtime rather than choosing a fallback target itself.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing / Access same-target retry versus cross-target failover boundary
* Layer 2: LLM Provider Abstraction bounded retry rules and no-adapter-fallback invariant
* Layer 2: Agent Runtime ownership of failover decisions after normalized provider failure
* Layer 2: Observability retry exhaustion and terminal provider-error evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one routing decision defines a primary target and fallbacks, but deterministic config sets the provider layer’s `maxProviderRetries` to a small bounded value and does not permit adapter-side target switching.
* Seeded policy rules: provider egress authorization is valid for the primary target only.
* Seeded memory and retrieval stores: not used.
* Selected model mode: deterministic provider adapter fixture that returns retryable `timeout` or `provider_unavailable` failures on every same-target attempt.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: routing decision with fallbacks, provider adapter spy on target identity, and trace collector.

### Given / When / Then

Given a routed provider request whose selected target fails repeatedly with retryable timeout or provider-unavailable errors,
When the provider abstraction performs bounded same-target retries and exhausts them,
Then it returns a normalized failure to runtime and does not silently advance to any fallback target from the routing decision.

### Required assertions

`Required fixtures:`

* The routing decision includes at least one fallback target to prove adapter-side failover would have been possible if allowed.
* The same-target retry budget is bounded and deterministic.
* The provider adapter spy records every executed target identity.

`Required observability artifacts:`

* Attempt records for each same-target retry with retry count and final error class.
* Stable routed target identity across all provider-layer attempts.
* Terminal normalized provider error returned after retry exhaustion.
* Explicit absence of any provider-layer attempt against a fallback target.

`Required replay artifacts:`

* Request envelope hash, routing decision ref, authorization ref, and attempt-history refs.
* Final normalized provider error artifact and retry-count evidence.
* Evidence that fallback advancement remained outside the provider layer.

`Pass/fail oracle:`

* All retries stay on the original routed target, retries stop at the configured bound, and runtime receives a normalized failure rather than observing an adapter-side target switch.

### Required harness capabilities

* Runtime provider-step fixture
* Model Routing / Access decision fixture service with fallbacks
* Deterministic provider adapter fixture with repeated retryable failure mode
* Provider target spy
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 13

### Scenario summary

* `Title:` Stream delta completion without a final canonical result is insufficient for authoritative success
* `Risk level:` High
* `Rationale:` Proves the replay-integrity boundary for streaming: completion of non-authoritative deltas alone must not be treated as successful provider execution when no final canonical `StreamResult` exists.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: LLM Provider Abstraction streaming invariants and authoritative-final-result rule
* Layer 2: Agent Runtime streaming and replay contract
* Layer 2: Observability stream-event capture and replay-posture evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one routed streaming-capable target and valid streaming authorization exist.
* Seeded policy rules: provider egress authorization allows streaming for the routed target.
* Seeded memory and retrieval stores: not used.
* Selected model mode: deterministic provider adapter fixture that emits valid stream deltas and a `completed` delta event but never produces a final canonical `StreamResult`.
* Selected tool implementations: none.
* Expected capability set: the target supports streaming, but the stream fixture is intentionally incomplete.
* Execution-space posture: none required.
* Approval or replay fixtures: streaming provider adapter fixture, trace collector, and replay verifier.

### Given / When / Then

Given a streamed provider call emits well-formed provider-neutral deltas and closes delta emission,
When the provider abstraction never receives or cannot normalize a final canonical result,
Then the streamed call must not be treated as authoritative success.

### Required assertions

`Required fixtures:`

* Streaming authorization and target capability are both valid.
* The adapter fixture emits at least one valid delta and one delta-completion event.
* No final canonical `StreamResult` is produced.

`Required observability artifacts:`

* Stream-event records showing ordered deltas and delta completion.
* Evidence that authoritative completion was not reached.
* Terminal error or incomplete-stream evidence returned to runtime.

`Required replay artifacts:`

* Request envelope hash, authorization ref, and stream-event refs.
* Evidence that replay posture is degraded or incomplete because the final canonical result is missing.
* Explicit absence of an authoritative `StreamResult`.

`Pass/fail oracle:`

* Delta completion alone does not count as success, no authoritative final result is emitted, and replay-visible evidence makes the incompleteness explicit.

### Required harness capabilities

* Runtime streaming-step fixture
* Deterministic streaming provider adapter fixture with missing-final-result mode
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The provider-abstraction design says stream completion without a final canonical response is insufficient for authoritative replay, but it does not define the required normalized terminal error code or whether this case should surface as `timeout`, `provider_unavailable`, `malformed_response`, or a distinct incomplete-stream class.

## Module coverage map

* Core provider-execution happy-path coverage: Scenarios 1, 2, 3, 4, and 5
* Capability-negotiation and fail-fast coverage: Scenarios 7, 8, and 9
* Authorization and policy-first egress coverage: Scenarios 1, 4, and 6
* Error normalization and retry-boundary coverage: Scenarios 5, 10, 11, and 12
* Streaming and replay-integrity coverage: Scenarios 4 and 13
