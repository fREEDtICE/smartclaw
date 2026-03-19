# Identity and Thread Management E2E Cases

This document proposes twelve deterministic E2E scenarios for the Identity and Thread Management subsystem.
It covers both end-to-end user journeys and module black-box flows driven through the subsystem's inbound-resolution, scope-attachment, thread-resolution, replay, and high-trust identity-maintenance contracts.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic channel ingress from webhook and polling drivers through canonical Channel Gateway envelopes
* seeded users, channel accounts, provider-thread bindings, collaborative-scope memberships, and thread fixtures
* recorded model decisions only when the flow proceeds past identity/thread resolution into runtime
* immutable config snapshot, session-policy snapshot, and replay-evidence fixtures
* trace, checkpoint, and replay capture for every meaningful resolution action

## Suite structure

### User-journey scenarios

1. verified inbound chat attaches to an existing canonical thread and starts a run
2. same user continues on a second channel but gets a new thread by default
3. paused thread is reopened within the configured dormant window
4. scope change forces new-thread creation by higher-precedence configuration
5. unresolved inbound identity starts a guest run only when product policy allows it

### Module black-box scenarios

6. verified account binding outranks heuristic identity matches
7. ambiguous identity returns `requires_disambiguation` and never auto-links
8. same provider thread key in a different workspace does not cross-tenant attach
9. duplicate inbound delivery reuses the prior resolution result and creates no duplicate thread
10. revoked scope membership blocks runtime start when fallback is disabled
11. replay reuses recorded resolution outputs instead of fresh live matching
12. historical user merge preserves alias lineage and future inbound resolves to the merged user

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Verified inbound chat attaches to an existing canonical thread and starts a run
* `Risk level:` Low
* `Rationale:` Proves the baseline identity/thread happy path: a canonical inbound envelope from Channel Gateway resolves through a verified channel-account binding plus an active provider-thread binding into one attached thread outcome and one valid `PreRunEnvelope` for runtime start.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway canonical `InboundMessageEnvelope` input contract and payload preservation
* Layer 2: Identity and Thread Management verified account matching, provider-thread binding lookup, `attached` thread outcome, and `RuntimeStartEnvelope`
* Layer 2: Agent Runtime run-start requirement for a valid `PreRunEnvelope`
* Layer 2: Observability identity/thread events, audit refs, and replay-entry evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_identity_attach`, one open canonical thread `thread_identity_attach`, one active collaborative scope `scope_identity_attach`, one verified `ChannelAccount` for the inbound provider identity, and one active `ProviderThreadBinding` matching the provider workspace and thread key.
* Seeded policy rules: allow normal runtime start and final reply handling for the resolved thread; no guest or fallback identity path is needed.
* Seeded memory and retrieval stores: both stores exist and are empty so the scenario isolates identity/thread behavior.
* Selected model mode: recorded model adapter mode with one model-only completion after runtime starts.
* Selected tool implementations: none invoked.
* Expected capability set: no tool, skill, or subagent capability is needed for the recorded runtime step.
* Execution-space posture: none required before runtime start; any `executionSpaceId` remains absent or lineage-only.
* Approval or replay fixtures: canonical inbound envelope fixture from Channel Gateway, trace collector, and replay verifier.

### Given / When / Then

Given a canonical inbound chat envelope from a verified provider account on a provider thread that is already bound to one open canonical thread,
When Identity and Thread Management resolves the user through the verified channel-account binding, validates the active provider-thread binding in the same workspace namespace, applies session policy, and emits `resolutionDisposition = "start_run"` with `sessionState = "attached"`,
Then Agent Runtime receives a valid `RuntimeStartEnvelope` whose `PreRunEnvelope` carries the original `inboundEventId`, the selected `userId`, the attached `threadId`, and the effective `collaborativeScopeId`.

### Required assertions

`Required fixtures:`

* The inbound provider account is linked to exactly one active verified `ChannelAccount`.
* The inbound provider thread key matches an active binding in the same workspace namespace.
* The attached thread remains `open` and eligible for reuse under session policy.
* The recorded runtime fixture returns the expected model-only completion after start.

`Required observability artifacts:`

* Canonical inbound envelope ref and original provider payload ref.
* `inbound_identity_resolution_started`, `inbound_identity_resolved`, `thread_resolution_started`, `thread_attached`, and `session_policy_applied` events.
* `IdentityResolutionRecord`, `ThreadResolutionRecord`, and `ResolutionAuditRefs`.
* `RuntimeStartEnvelope` or equivalent run-start handoff evidence linked to the same `inboundEventId`.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views for the resulting run.

`Required replay artifacts:`

* Inbound event ref and canonical inbound envelope ref.
* Matching inputs and reason codes proving the verified account and provider-thread binding were selected.
* Selected `userId`, `threadId`, `collaborativeScopeId`, and session-policy snapshot ref.
* Replay manifest or equivalent run-entry evidence showing runtime started from recorded identity/thread outputs rather than re-inferring them.

`Pass/fail oracle:`

* The inbound event resolves to one canonical user and the pre-bound thread, runtime starts exactly once on that thread, and replay-visible evidence reconstructs the attach decision from stored resolution artifacts.

### Required harness capabilities

* Synthetic chat channel driver
* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service
* Recorded model adapter mode
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Same user continues on a second channel but gets a new thread by default
* `Risk level:` Medium
* `Rationale:` Proves the documented separation of user continuity from thread continuity: one real-world user may resolve to the same canonical `userId` across channels, while thread reuse remains conservative unless explicit cross-channel bridging is enabled.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Identity and Thread Management universal identity across channels, conservative cross-channel thread continuity, `created` thread outcome, and `RuntimeStartEnvelope`
* Layer 2: Channel Gateway canonical inbound envelope handoff from a second channel
* Layer 2: Agent Runtime run-start requirement for the new canonical thread
* Layer 2: Observability config snapshot and identity/thread decision events

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one canonical user `user_identity_cross_channel` with verified channel accounts on email and chat, one existing open email thread `thread_identity_email`, one active collaborative scope `scope_identity_cross_channel`, and deterministic config with `allowCrossChannelThreadContinuity = false`.
* Seeded policy rules: allow runtime start for the resolved user and scope on the second channel; no cross-scope or cross-tenant override is involved.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: recorded model adapter mode with one model-only completion after runtime start.
* Selected tool implementations: none invoked.
* Expected capability set: no extra capability exposure is needed.
* Execution-space posture: none required.
* Approval or replay fixtures: one canonical chat inbound envelope for the second channel and config snapshot refs.

### Given / When / Then

Given a user who already has an open email thread sends a new message from a different chat channel through a verified second channel-account binding,
When Identity and Thread Management resolves the same canonical `userId` across channels, evaluates thread continuity with `allowCrossChannelThreadContinuity = false`, and applies the documented conservative default,
Then it emits `resolutionDisposition = "start_run"` with a newly created thread on the second channel instead of attaching the existing email thread.

### Required assertions

`Required fixtures:`

* The inbound second-channel account is verified and mapped to the same canonical user as the first channel.
* No explicit cross-channel bridge metadata exists between the old and new thread candidates.
* The effective configuration snapshot shows `allowCrossChannelThreadContinuity = false`.

`Required observability artifacts:`

* Identity-resolution and thread-resolution records for the inbound event.
* `inbound_identity_resolved`, `thread_created`, and `session_policy_applied` events.
* Config snapshot ref or equivalent source refs that explain why cross-channel thread reuse was not permitted.
* Runtime start evidence carrying the same `userId` but a newly created `threadId`.

`Required replay artifacts:`

* Inbound event ref and canonical envelope ref.
* Channel-account refs for both provider identities tied to the same `userId`.
* Config snapshot ref showing the cross-channel continuity posture.
* Resolution outputs proving same-user continuity and new-thread creation.

`Pass/fail oracle:`

* The same canonical user is selected across channels, a new thread is created for the second channel, and replay-visible config evidence shows that conservative thread isolation, not missing identity continuity, drove the outcome.

### Required harness capabilities

* Synthetic email and chat channel drivers
* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service
* Layered configuration fixture service with snapshot refs
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Paused thread is reopened within the configured dormant window
* `Risk level:` Medium
* `Rationale:` Proves the resumable thread path before runtime start: a paused thread may become `reopened` when provider-thread continuity and session policy both still allow it.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Identity and Thread Management session policy engine, paused-thread reopen handling, `reopened` session state, and `RuntimeStartEnvelope`
* Layer 2: Channel Gateway canonical inbound envelope and provider-thread linkage
* Layer 2: Agent Runtime run-start on a reopened thread
* Layer 2: Observability thread lifecycle and session-policy events

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_identity_reopen`, one paused canonical thread `thread_identity_reopen`, one active collaborative scope `scope_identity_reopen`, one active provider-thread binding, and deterministic config with `maxDormantReopenWindow` large enough for the seeded last-activity timestamp.
* Seeded policy rules: allow runtime start on reopened threads for this scope and channel.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: recorded model adapter mode with one direct response after runtime start.
* Selected tool implementations: none invoked.
* Expected capability set: no tool or skill capability is needed.
* Execution-space posture: none required.
* Approval or replay fixtures: canonical inbound envelope, thread-state fixture with paused status, and trace collector.

### Given / When / Then

Given a canonical inbound reply arrives on a provider thread whose mapped canonical thread is paused but still within the configured dormant reopen window,
When Identity and Thread Management resolves the user, validates the provider-thread binding, applies session policy, and determines the paused thread may be reopened,
Then it emits `sessionState = "reopened"` with `resolutionDisposition = "start_run"` and the existing thread is returned to runtime as the active conversation thread.

### Required assertions

`Required fixtures:`

* The paused thread remains within the configured dormant reopen window.
* The provider-thread binding still points to the same canonical thread.
* No higher-precedence config forbids reopen for this channel or scope.

`Required observability artifacts:`

* `thread_resolution_started`, `thread_reopened`, and `session_policy_applied` events.
* Identity-resolution and thread-resolution records with reason codes explaining the reopen decision.
* Runtime-start evidence carrying the reopened `threadId`.

`Required replay artifacts:`

* Inbound event ref, provider-thread binding ref, and prior thread-state ref.
* Session-policy snapshot ref proving reopen eligibility.
* Resolution outputs showing `sessionState = "reopened"` and the preserved `threadId`.

`Pass/fail oracle:`

* The paused thread is reused through a documented `reopened` outcome, no new thread is created, and the replay-visible session-policy evidence explains why reopen was legal.

### Required harness capabilities

* Synthetic inbound channel driver
* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service with paused-thread state control
* Layered configuration fixture service
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Scope change forces new-thread creation by higher-precedence configuration
* `Risk level:` Medium
* `Rationale:` Proves the configuration-precedence and scope-isolation contract on the inbound path: lower-precedence continuity signals cannot override a higher-precedence rule that requires a new thread when effective collaborative scope changes.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Identity and Thread Management scope resolution, thread precedence, and `forceNewThreadOnScopeChange`
* Layer 2: Channel Gateway canonical inbound-envelope handoff
* Layer 2: Agent Runtime run-start on the newly created scope-correct thread
* Layer 2: Observability config snapshot, scope-attachment, and thread-resolution evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_identity_scope_change`, one recent open thread `thread_identity_scope_a` in `scope-A`, a new inbound event that resolves to `scope-B`, and layered config where lower-precedence continuity settings favor reuse but a higher-precedence collaborative-scope setting sets `forceNewThreadOnScopeChange = true`.
* Seeded policy rules: allow runtime start in `scope-B`; no cross-scope reuse approval exists for the old thread.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: recorded model adapter mode with one model-only completion.
* Selected tool implementations: none invoked.
* Expected capability set: no extra capability exposure is needed.
* Execution-space posture: none required.
* Approval or replay fixtures: scope-membership fixture service, config snapshot refs, and canonical inbound envelope.

### Given / When / Then

Given an inbound interaction from a verified user would normally qualify for recent-thread reuse but the effective collaborative scope resolves from `scope-A` to `scope-B`,
When Identity and Thread Management applies configuration sources in precedence order, records the effective snapshot, denies reuse of the old thread across the scope change, and creates a new thread in `scope-B`,
Then runtime starts on the new thread and the old `scope-A` thread is not reused.

### Required assertions

`Required fixtures:`

* No explicit provider-thread binding exists that would outrank session-policy continuity.
* The inbound user is a valid member of `scope-B`.
* Lower-precedence continuity settings would have allowed reuse absent the higher-precedence scope rule.
* The effective config snapshot shows `forceNewThreadOnScopeChange = true`.

`Required observability artifacts:`

* Scope-resolution evidence selecting `scope-B`.
* `scope_attached`, `thread_created`, and `session_policy_applied` events with config snapshot refs.
* Thread-resolution record whose reason codes reference the scope-change restriction.
* Runtime-start evidence carrying the new `threadId` and `collaborativeScopeId = scope-B`.

`Required replay artifacts:`

* Inbound event ref and canonical envelope ref.
* Config snapshot refs or source refs showing the applied precedence order.
* Scope-resolution and thread-resolution records with reason codes.
* Resolution outputs proving the old thread was not reused.

`Pass/fail oracle:`

* A new thread is created in `scope-B`, the old `scope-A` thread is not reused despite lower-precedence continuity-friendly settings, and replay-visible config evidence shows the higher-precedence scope rule was decisive.

### Required harness capabilities

* Synthetic inbound channel driver
* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service
* Scope-membership fixture service
* Layered configuration fixture service with snapshot refs
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 5

### Scenario summary

* `Title:` Unresolved inbound identity starts a guest run only when product policy allows it
* `Risk level:` Medium
* `Rationale:` Proves the guarded guest-entry path: unresolved identity does not automatically block the platform when explicit product policy allows a guest run, but the guest posture remains replay-visible and bounded.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Identity and Thread Management unresolved-to-guest fallback, `identityState = "guest"`, and `RuntimeStartEnvelope`
* Layer 2: Channel Gateway canonical inbound-envelope input contract
* Layer 2: Agent Runtime run-start requirement with a guest-compatible `PreRunEnvelope`
* Layer 2: Observability unresolved-identity and thread-creation evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: no verified channel-account binding exists for the inbound provider identity, no allowed fallback matcher resolves the user, and deterministic config sets `allowGuestRuntimeStart = true` for the seeded channel or agent.
* Seeded policy rules: allow guest runtime start on this channel and scope posture; no cross-scope access is granted.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: recorded model adapter mode with one direct response after runtime start.
* Selected tool implementations: none invoked.
* Expected capability set: no extra capability exposure is needed.
* Execution-space posture: none required.
* Approval or replay fixtures: canonical inbound envelope, config snapshot refs, and trace collector.

### Given / When / Then

Given a canonical inbound message from a provider identity that has no verified channel-account binding and no safe fallback identity match,
When Identity and Thread Management applies the configured guest-start policy, records `identityState = "guest"`, creates a new canonical thread, and emits `resolutionDisposition = "start_run"`,
Then runtime starts only because guest execution is explicitly allowed for this deterministic fixture set.

### Required assertions

`Required fixtures:`

* No verified channel-account binding exists for the inbound identity.
* Allowed fallback matchers produce no safe canonical user.
* The effective configuration snapshot shows `allowGuestRuntimeStart = true`.
* The resulting runtime-start envelope includes a valid `threadId`.

`Required observability artifacts:`

* `inbound_identity_unresolved`, `thread_created`, and `session_policy_applied` events.
* Identity-resolution and thread-resolution records showing `identityState = "guest"` and `resolutionDisposition = "start_run"`.
* Runtime-start evidence linked to the same `inboundEventId`.

`Required replay artifacts:`

* Inbound event ref and canonical envelope ref.
* Identity-resolution record explaining why no verified or heuristic match was selected.
* Config snapshot ref proving guest start was explicitly enabled.
* Resolution outputs showing guest start plus created thread.

`Pass/fail oracle:`

* The inbound event does not resolve to a normal canonical user, but runtime still starts because guest mode was explicitly enabled and replay-visible evidence explains that policy and configuration choice.

### Required harness capabilities

* Synthetic inbound channel driver
* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service
* Layered configuration fixture service with snapshot refs
* Recorded model adapter mode
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module black-box scenarios

## Scenario 6

### Scenario summary

* `Title:` Verified account binding outranks heuristic identity matches
* `Risk level:` Medium
* `Rationale:` Proves identity matching precedence: an exact verified binding must dominate any lower-priority heuristic or product-specific matcher that would otherwise point to a different canonical user.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Identity and Thread Management matching precedence and no-silent-merge rule
* Layer 2: Channel Gateway canonical inbound-envelope identity hints
* Layer 2: Observability identity-resolution records and reason codes

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified `ChannelAccount` maps the inbound provider identity to `user_verified`, a lower-priority approved secondary matcher would map the same inbound hints to `user_heuristic`, and deterministic config enables the secondary matcher but keeps precedence unchanged.
* Seeded policy rules: allow normal runtime start after identity resolution; no guest path is used.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the scenario stops at identity resolution correctness.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: canonical inbound envelope plus matching-fixture data for both the verified and heuristic candidates.

### Given / When / Then

Given an inbound envelope whose verified provider identity is already linked to one canonical user while an approved fallback matcher would suggest a different user,
When Identity and Thread Management applies matching precedence,
Then it resolves the inbound event to the verified-bound user and does not emit an ambiguous result or silently merge the competing user records.

### Required assertions

`Required fixtures:`

* The verified binding is active and unique.
* The heuristic candidate remains lower precedence than the verified binding.
* No explicit administrative merge exists between the two candidate users.

`Required observability artifacts:`

* `inbound_identity_resolution_started` and `inbound_identity_resolved` events.
* Identity-resolution record with reason codes proving the verified binding won.
* Explicit absence of `inbound_identity_ambiguous` for this case.

`Required replay artifacts:`

* Inbound event ref and canonical envelope ref.
* Verified channel-account ref and heuristic matcher input refs.
* Identity-resolution record showing the selected user and precedence reason codes.

`Pass/fail oracle:`

* The selected `userId` is the verified-bound user, no merge or ambiguity is introduced, and replay-visible reason codes show that precedence rather than heuristic confidence determined the outcome.

### Required harness capabilities

* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service
* Matching-fixture service for verified and heuristic candidates
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Ambiguous identity returns `requires_disambiguation` and never auto-links
* `Risk level:` High
* `Rationale:` Proves the fail-safe ambiguity path: when multiple candidates remain after allowed matching, the subsystem must stop short of auto-linking or fabricating a runnable result.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Identity and Thread Management ambiguous-identity handling, `requires_disambiguation`, and no-auto-link rule
* Layer 2: Observability ambiguity events and replay-visible audit evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: no verified binding exists for the inbound identity, two approved fallback matchers each return one plausible canonical user, and deterministic config allows the matchers but not any auto-link shortcut.
* Seeded policy rules: no guest start or safe fallback is enabled for this scenario.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because runtime must not start.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: canonical inbound envelope plus deterministic ambiguous matcher outputs.

### Given / When / Then

Given an inbound envelope with no verified binding and two equally safe fallback identity candidates,
When Identity and Thread Management runs the allowed matchers and detects ambiguity,
Then it emits an ambiguous identity result with `resolutionDisposition = "requires_disambiguation"` and does not auto-link, auto-merge, or start runtime.

### Required assertions

`Required fixtures:`

* No verified or explicit product binding exists for the inbound identity.
* Two fallback candidates remain after matcher evaluation.
* Guest start is disabled for this scenario.

`Required observability artifacts:`

* `inbound_identity_resolution_started` and `inbound_identity_ambiguous` events.
* Identity-resolution record with `resolutionOutcome = "ambiguous"` and reason codes.
* Explicit absence of `RuntimeStartEnvelope`.

`Required replay artifacts:`

* Inbound event ref and canonical envelope ref.
* Matcher input refs and ambiguity reason codes.
* Identity-resolution record and audit refs showing no canonical user was selected.

`Pass/fail oracle:`

* No user is auto-linked, no runtime start occurs, and the stored audit evidence is sufficient for a later disambiguation workflow without re-running hidden heuristics.

### Required harness capabilities

* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service
* Ambiguous-matching fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Same provider thread key in a different workspace does not cross-tenant attach
* `Risk level:` High
* `Rationale:` Proves the cross-tenant isolation rule: provider-thread reuse must remain scoped to the provider workspace or tenant namespace and must not attach a thread merely because raw thread keys happen to match.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Identity and Thread Management provider-thread binding uniqueness by `(provider, providerWorkspaceKey, providerThreadKey)` and cross-tenant no-attach rule
* Layer 2: Channel Gateway pre-resolution provider namespace propagation
* Layer 2: Observability thread-resolution evidence and config refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one canonical user `user_identity_tenant`, one open thread `thread_identity_workspace_a` bound to provider thread key `T-42` in `workspace-A`, one inbound event from the same provider thread key `T-42` but `workspace-B`, and deterministic config that allows a new thread in `workspace-B` if the user is otherwise valid.
* Seeded policy rules: allow runtime start in `workspace-B`; no cross-tenant reuse override exists.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the scenario stops at thread-resolution correctness.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: canonical inbound envelope with workspace metadata plus stored provider-thread binding fixture from `workspace-A`.

### Given / When / Then

Given a provider thread key that already maps to a canonical thread in one workspace and a new inbound event from a different workspace that reuses the same raw provider thread key,
When Identity and Thread Management applies provider-thread lookup using the documented workspace namespace rule,
Then it does not attach the `workspace-A` thread and instead produces a fresh thread outcome appropriate to `workspace-B`.

### Required assertions

`Required fixtures:`

* The provider thread binding exists only in `workspace-A`.
* The inbound event carries `providerWorkspaceKey = workspace-B`.
* The user is otherwise eligible to start a run in `workspace-B`.

`Required observability artifacts:`

* Thread-resolution record showing that the existing binding was not reused across tenants.
* Reason codes or namespace metadata proving the workspace mismatch drove the outcome.
* `thread_created` or equivalent new-thread outcome event for `workspace-B`.

`Required replay artifacts:`

* Inbound event ref and canonical envelope ref with workspace metadata.
* Stored provider-thread binding ref for `workspace-A`.
* Resolution output showing a different `threadId` for `workspace-B`.

`Pass/fail oracle:`

* The old thread in `workspace-A` is not attached, a new thread is created in `workspace-B`, and replay-visible namespace evidence explains why cross-tenant attachment was rejected.

### Required harness capabilities

* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service with provider-thread binding controls
* Workspace or tenant fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Duplicate inbound delivery reuses the prior resolution result and creates no duplicate thread
* `Risk level:` Medium
* `Rationale:` Proves the subsystem's idempotent inbound behavior: repeated delivery of the same canonical inbound event must not create duplicate identity or thread facts.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Identity and Thread Management duplicate-inbound handling and result reuse
* Layer 2: Channel Gateway canonical inbound-event identity through `providerMessageKey`
* Layer 2: Observability duplicate-resolution evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_identity_duplicate`, one open thread `thread_identity_duplicate`, one prior resolution result already persisted for the canonical inbound event, and deterministic config that enables duplicate-result reuse.
* Seeded policy rules: any original runtime-start policy already applied to the first delivery; the duplicate should not cause a fresh start decision.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used for the duplicate path.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: repeated canonical inbound envelope with the same provider namespace and `providerMessageKey`.

### Given / When / Then

Given an inbound event has already been resolved to one canonical user and thread and the same canonical inbound event arrives again,
When Identity and Thread Management recognizes the duplicate via provider namespace plus `providerMessageKey` and reuses the persisted resolution output,
Then it does not create a second thread, second resolution lineage, or second runtime-start basis.

### Required assertions

`Required fixtures:`

* The repeated inbound event matches the original provider namespace and `providerMessageKey`.
* The prior resolution result is still present and valid for reuse.
* No thread-closure or scope-change event invalidated reuse between deliveries.

`Required observability artifacts:`

* Original resolution records plus duplicate-attempt evidence.
* Explicit duplicate or reused-result observability evidence.
* Absence of any new thread-creation event for the duplicate path.

`Required replay artifacts:`

* Original inbound event ref, resolution records, and audit refs.
* Duplicate-event evidence linked back to the original resolution result.
* Absence of duplicate thread or runtime-start artifacts.

`Pass/fail oracle:`

* The prior resolution output remains authoritative, the duplicate path creates no new thread, and replay-visible evidence shows that result reuse, not re-resolution drift, handled the second delivery.

### Required harness capabilities

* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service
* Duplicate-delivery fixture controls
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Revoked scope membership blocks runtime start when fallback is disabled
* `Risk level:` High
* `Rationale:` Proves the scope-isolation path at the boundary between identity and policy-aware scope membership: a resolved user is not sufficient to start runtime when collaborative-scope entitlement has been revoked and product policy forbids user-only fallback.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Identity and Thread Management scope resolution, scope-denial handling, and blocked inbound outcome
* Layer 2: Observability `scope_denied` and resolution audit evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_identity_scope_denied`, one inbound event that maps to `scope_revoked`, and deterministic config or product policy that blocks runtime start instead of falling back to a user-only thread when scope attachment is invalid.
* Seeded policy rules: collaborative-scope membership for the user is revoked or expired.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because runtime must not start.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: scope-membership fixture service plus canonical inbound envelope.

### Given / When / Then

Given an inbound message from a verified user whose effective collaborative scope has been revoked,
When Identity and Thread Management resolves the user, attempts scope attachment, applies the configured product policy that forbids user-only fallback, and denies scope attachment,
Then it emits a blocked resolution result and does not return a runnable `RuntimeStartEnvelope`.

### Required assertions

`Required fixtures:`

* The inbound provider identity resolves to a valid canonical user.
* The collaborative-scope membership is revoked or expired at resolution time.
* The effective product policy disables fallback to a user-only thread.

`Required observability artifacts:`

* `scope_denied` event and related identity or thread decision events.
* Resolution records and reason codes explaining why runtime start was blocked.
* Explicit absence of `RuntimeStartEnvelope`.

`Required replay artifacts:`

* Inbound event ref and canonical envelope ref.
* Scope-membership record or entitlement evidence.
* Resolution outputs showing a blocked disposition and denied scope attachment.

`Pass/fail oracle:`

* The user resolves successfully, but runtime start is blocked because scope attachment is invalid and fallback is disabled, and replay-visible evidence makes the scope-denial reason explicit.

### Required harness capabilities

* Channel Gateway canonical-envelope fixture service
* Identity and thread fixture service
* Scope-membership fixture service
* Layered configuration fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Replay reuses recorded resolution outputs instead of fresh live matching
* `Risk level:` Medium
* `Rationale:` Proves the subsystem's default replay contract: deterministic replay should reconstruct the run entry point from stored identity/thread outputs rather than from mutable live identity data.

### Contracts validated

* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Identity and Thread Management replay rule to reuse recorded outputs unless fresh-resolution diagnostic mode is explicitly requested
* Layer 2: Observability and replay audit evidence for run entry

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one completed prior inbound-resolution flow already stored with selected `userId`, `threadId`, `collaborativeScopeId`, provider binding refs, and session-policy snapshot; live identity data has since changed in a way that would produce a different answer if matched fresh.
* Seeded policy rules: none beyond the historical snapshot already stored for the original resolution.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the scenario focuses on replay entry.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: replay request in normal mode, plus stored resolution records and mutated live identity fixtures.

### Given / When / Then

Given a supported deterministic run whose identity and thread resolution outputs were already recorded and the live identity directory has changed since that run completed,
When replay reconstructs the run entry point in normal mode,
Then it reuses the recorded resolution outputs instead of re-running live matching against the mutated directory.

### Required assertions

`Required fixtures:`

* The original resolution records and session-policy snapshot remain retrievable.
* The live identity data differs from the historical state in a way that would change fresh matching.
* The replay request is not marked as fresh-resolution diagnostic mode.

`Required observability artifacts:`

* Replay request evidence and read-path lineage to the stored resolution outputs.
* Original resolution audit refs and session-policy snapshot ref.
* Explicit evidence that live re-resolution was not used in normal replay mode.

`Required replay artifacts:`

* Inbound event ref and stored canonical resolution outputs.
* Provider binding refs, selected IDs, and reason codes from the original run entry.
* Replay-entry evidence proving the stored outputs were reused.

`Pass/fail oracle:`

* Replay reconstructs the historical run entry from stored resolution data, not from changed live identity state, and the evidence chain shows exactly which recorded outputs were reused.

### Required harness capabilities

* Identity and thread fixture service
* Replay verifier
* Historical-resolution artifact store
* Mutated live-directory fixture service
* Trace collector

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Historical user merge preserves alias lineage and future inbound resolves to the merged user
* `Risk level:` Medium
* `Rationale:` Proves the high-trust administrative lineage rule: a later user merge must preserve historical audit facts while causing future inbound resolution to land on the merged canonical user.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Identity and Thread Management `MergeUsers`, alias-lineage preservation, and future inbound resolution compatibility
* Layer 2: Observability `identity_merge_recorded` and future resolution evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: two historical users `user_primary` and `user_alias` already have inbound history, one provider identity is currently linked to `user_alias`, and deterministic admin fixtures allow a merge into `user_primary` while preserving historical audit refs.
* Seeded policy rules: the merge workflow is administratively allowed in the deterministic lab; no guest path or heuristic matching is needed after the merge.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the scenario focuses on identity lineage and next inbound resolution.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: merge command fixture, stored historical resolution records, and one future canonical inbound envelope on the formerly alias-bound provider identity.

### Given / When / Then

Given two historical users are later determined to be the same real-world subject and an operator executes `MergeUsers` to merge `user_alias` into `user_primary`,
When Identity and Thread Management records the merge lineage and a future inbound message arrives on the formerly alias-bound provider identity,
Then the future inbound resolves to `user_primary` while historical audit records remain preserved rather than destructively rewritten.

### Required assertions

`Required fixtures:`

* Historical inbound and resolution records exist for both pre-merge users.
* The merged user record for `user_alias` points to `mergedIntoUserId = user_primary`.
* The future inbound uses a provider identity that previously mapped to `user_alias`.

`Required observability artifacts:`

* `identity_merge_recorded` event.
* Merge result record or lineage ref preserving old and new user ids.
* Future identity-resolution record showing the inbound event now resolves to `user_primary`.

`Required replay artifacts:`

* Historical resolution refs for both pre-merge users.
* Merge lineage refs or alias mapping evidence.
* Future inbound event ref and resolution record proving forward compatibility after merge.

`Pass/fail oracle:`

* Historical audit facts remain intact, the merge lineage is replay-visible, and future inbound resolution lands on the merged canonical user rather than the deprecated alias user.

### Required harness capabilities

* Identity and thread fixture service
* Administrative merge fixture
* Historical-resolution artifact store
* Channel Gateway canonical-envelope fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module coverage map

* Core run-start and continuity coverage: Scenarios 1, 2, 3, 4, and 5
* Identity precedence and ambiguity coverage: Scenarios 6 and 7
* Scope, tenant, and duplicate-isolation coverage: Scenarios 8, 9, and 10
* Replay and audit-lineage coverage: Scenarios 11 and 12
* Configuration-precedence coverage: Scenarios 2, 4, 5, and 10
