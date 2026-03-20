# Team and Collaboration System E2E Cases

This document proposes twelve deterministic E2E scenarios for the Team and Collaboration System subsystem.
It covers both end-to-end user or operator journeys and module smoke scenarios so the same suite can validate deterministic collaborative-scope attachment, invitation and membership activation, cross-scope approval boundaries, suspended-scope live blocking with historical replay readability, ambiguous and no-scope outcomes, membership-state enforcement, role-history preservation, binding lifecycle history, broken resource-ref handling, and configuration-precedence no-widening.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic channel ingress plus operator scope-management, audit-read, and replay drivers
* seeded identity, thread, collaborative-scope, membership, scope-binding, configuration, policy, and historical-run fixtures
* recorded model adapter mode only where a live run is needed after scope attachment
* replay-visible scope refs, membership refs, binding refs, change records, config snapshots, policy decisions, approvals, checkpoints, inbound-resolution artifacts, and final run outputs
* trace collector, run-view materializer, scope snapshot harness, binding-history harness, and replay verifier

## Suite structure

### User-journey scenarios

1. active member inbound interaction auto-attaches to one bound collaborative scope and propagates the exact scope lineage into run start
2. invitation acceptance explicitly activates membership, and the next inbound interaction attaches to the newly joined scope
3. a run attached to one scope requests data from another scope, waits for explicit approval, and resumes under an exact cross-scope access contract
4. a suspended scope blocks new live attachment while a historical run still replays against the exact prior scope, membership, and binding snapshot

### Module smoke scenarios

5. `ResolveScopeAttachment` returns an explicit ambiguous outcome when multiple scopes match the same inbound boundary
6. `ResolveScopeAttachment` returns a no-scope outcome when no scope matches and attachment is optional
7. required scope attachment blocks run start when no valid scope matches
8. non-active membership states never behave as active attachment rights even when a channel or tenant binding exists
9. membership role changes emit durable history with actor provenance rather than mutating the past invisibly
10. `ListScopeBindings` preserves superseded and disabled bindings for historical inspection while live resolution uses only the active binding set
11. broken `ScopeResourceBinding` refs produce explicit diagnostics and never silently substitute another resource
12. lower-precedence configuration cannot widen `scopeAttachmentMode`, `allowedScopeTypes`, or disabled binding restrictions

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Active member inbound interaction auto-attaches to one bound collaborative scope and propagates the exact scope lineage into run start
* `Risk level:` Low
* `Rationale:` Proves the baseline collaborative-scope path. The Team subsystem must return one explicit scope attachment from authoritative bindings and active membership, and Identity plus Runtime must carry that exact scope lineage into the live run without inventing alternate scopes.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Team explicit collaborative-scope attachment, active-membership requirement, and replay-visible binding resolution
* Layer 2: Identity and Thread inbound scope association, `PreRunEnvelope`, and deterministic inbound-resolution output
* Layer 2: Observability correlation by `userId`, `threadId`, `runId`, and `collaborativeScopeId`

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_scope_attach`, one inbound provider workspace `ws_acme_support`, one active scope `scope_acme_support`, one active membership for that user in that scope, one active `provider_workspace` attachment binding, and one config snapshot with `scopeAttachmentMode = required` and `allowedScopeTypes = [team]`.
* Seeded policy rules: allow ordinary same-scope conversation start and normal low-risk response generation.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model returns a deterministic no-tool answer after run start.
* Selected tool implementations: none.
* Expected capability set: not material beyond successful run start under one explicit `collaborativeScopeId`.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve inbound event ref, scope ref, membership ref, binding ref, config snapshot ref, inbound-resolution artifacts, `PreRunEnvelope`, final run refs, and final output.

### Given / When / Then

Given a verified user sends an inbound message from one provider workspace that is explicitly bound to one active collaborative scope,
When the Team subsystem resolves scope attachment, Identity and Thread Management produces the runtime-start handoff, and Runtime starts the run,
Then the run starts with the exact attached `collaborativeScopeId`, no alternate scope is guessed, and the same scope lineage remains visible in run-time observability and replay artifacts.

### Required assertions

`Required fixtures:`

* Exactly one active scope matches the inbound boundary and active membership state.
* No stale, suspended, or duplicate binding competes with the selected scope.

`Required observability artifacts:`

* Scope-attachment resolution output showing the selected `collaborativeScopeId`.
* Membership lookup evidence and binding ref used for attachment.
* `InboundResolutionResult` and `RuntimeStartEnvelope` records carrying the attached scope.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the same `collaborativeScopeId` on the created run.

`Required replay artifacts:`

* Inbound event ref, scope ref, membership ref, binding ref, config snapshot ref, `PreRunEnvelope`, `RunEnvelope`, model input and output refs, and final output ref.

`Pass/fail oracle:`

* The scenario passes only if one explicit attached scope is selected deterministically and the same scope lineage is preserved from inbound resolution through run completion.

### Required harness capabilities

* Synthetic channel driver
* Identity and thread fixture service
* Scope registry and binding fixture service
* Recorded model adapter mode
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Invitation acceptance explicitly activates membership, and the next inbound interaction attaches to the newly joined scope
* `Risk level:` Medium
* `Rationale:` Proves invitation-driven collaboration is explicit rather than inferred. The system must preserve invite and acceptance history, and only active membership may later support automatic scope attachment.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Team invitation posture, explicit membership activation, change-record durability, and later attachment after activation
* Layer 2: Identity and Thread scope attachment after authoritative membership activation
* Layer 2: Observability audit-read views for membership timeline and later run correlation

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one user `user_scope_invite`, one active application scope `scope_product_alpha`, one invited membership for that user in that scope, one active `application_tenant` binding, and one config snapshot that allows required scope attachment on this product path.
* Seeded policy rules: allow the operator-managed invite acceptance workflow and allow normal low-risk run start after membership becomes active.
* Seeded memory and retrieval stores: not material.
* Selected model mode: recorded model returns a deterministic confirmation reply after the post-acceptance run starts.
* Selected tool implementations: none.
* Expected capability set: not material beyond successful attachment after activation.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve invite change record, acceptance change record, activated membership ref, binding ref, inbound-resolution artifacts, and final run output.

### Given / When / Then

Given a user has an invitation into one collaborative scope but is not yet an active member,
When an explicit invite-acceptance workflow activates membership and the user later sends a new inbound message on the bound product path,
Then the later inbound interaction may attach to that scope, and the invite plus acceptance history remains replay-visible instead of being collapsed into a single mutable membership state.

### Required assertions

`Required fixtures:`

* The pre-acceptance membership state is `invited`.
* Acceptance creates or activates membership explicitly rather than inferring access from the binding alone.

`Required observability artifacts:`

* Invite-created and invite-accepted change records with actor provenance.
* Membership timeline view showing the transition from `invited` to `active`.
* Later scope-attachment result, `InboundResolutionResult`, and run views carrying the attached scope id.

`Required replay artifacts:`

* Scope ref, membership refs before and after acceptance, change-record refs, binding ref, config snapshot ref, inbound-resolution artifacts, and final output ref.

`Pass/fail oracle:`

* The scenario passes only if invitation history remains explicit and automatic attachment begins only after membership is active.

### Required harness capabilities

* Operator scope-management driver
* Synthetic channel driver
* Identity and thread fixture service
* Scope registry and membership fixture service
* Recorded model adapter mode
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` A run attached to one scope requests data from another scope, waits for explicit approval, and resumes under an exact cross-scope access contract
* `Risk level:` High
* `Rationale:` Proves that multi-membership does not create an implicit bridge. The Team subsystem may expose membership facts for multiple scopes, but cross-scope access still requires explicit policy evaluation and, in this case, approval bound to one exact transition.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Team cross-scope posture, explicit current scope context, and non-bridging multi-membership rules
* Layer 2: Policy `cross_scope_access` evaluation, `require_approval`, exact approval binding, and no silent widening
* Layer 2: Observability replay-critical policy, approval, checkpoint, and run-view evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one user `user_multi_scope`, one open thread already attached to `scope_support`, one second active scope `scope_billing`, one active membership in both scopes, and one config snapshot that allows multi-membership but requires explicit policy review for cross-scope access.
* Seeded policy rules: same-scope conversation is allowed; `cross_scope_access` from `scope_support` into `scope_billing` returns `require_approval` with exact target-scope and data-slice conditions.
* Seeded memory and retrieval stores: one target data slice exists only under `scope_billing`.
* Selected model mode: recorded model asks for the cross-scope read once and produces a final answer after approval and resumed execution.
* Selected tool implementations: one safe fake data-read implementation behind the governed cross-scope path.
* Expected capability set: the run remains attached to `scope_support`; the request to use `scope_billing` data is represented as an explicit cross-scope access target rather than an implicit second attached scope.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve current-scope lineage, target-scope refs, policy decision ref, approval request and resolution refs, checkpoint ref before `waiting_approval`, downstream read result refs, and final output.

### Given / When / Then

Given a run is attached to one collaborative scope and the user is also a member of a second scope,
When the run requests access to data in the second scope, policy evaluates `cross_scope_access`, returns `require_approval`, and runtime later resumes after approval bound to that exact request,
Then no cross-scope read occurs before approval, the run does not collapse into a generic “all my scopes” context, and the resumed action uses only the approved target scope transition and data slice.

### Required assertions

`Required fixtures:`

* The run has one current attached `collaborativeScopeId`.
* The approval resolution binds to the original request hash, current scope, target scope, and policy snapshot.

`Required observability artifacts:`

* Current-scope attachment evidence for the run.
* `cross_scope_access` policy decision ref, approval request ref, approval resolution ref, and policy snapshot ref.
* Checkpoint ref before `waiting_approval` and resumed execution evidence after approval.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views showing the approval wait and resumed same-run completion.

`Required replay artifacts:`

* Current scope ref, target scope ref, relevant membership refs, policy decision ref, approval request and resolution refs, checkpoint ref, downstream data-read refs, and final output ref.

`Pass/fail oracle:`

* The scenario passes only if multi-membership alone does not authorize the cross-scope read, approval binds to the exact cross-scope request, and the resumed run preserves one explicit attached scope plus one explicit approved target.

### Required harness capabilities

* Synthetic channel driver
* Identity and thread fixture service
* Scope registry and membership fixture service
* Policy and approval fixture service
* Recorded model adapter mode
* Checkpoint and resume fixture service
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` A suspended scope blocks new live attachment while a historical run still replays against the exact prior scope, membership, and binding snapshot
* `Risk level:` High
* `Rationale:` Proves the suspension contract is fail-closed for live use but replay-safe for history. New interactions must not attach to a suspended scope, while historical runs must still recover the exact scope state that applied when they originally executed.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Team scope lifecycle, suspension blocking for new live attachment, and historical snapshot readability
* Layer 2: Identity and Thread inbound blocking when required scope attachment cannot be satisfied
* Layer 2: Observability replay manifest, historical read views, and run lineage preservation

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one historical run `run_scope_before_suspend` that completed while `scope_ops` was active, one historical membership snapshot captured by that run, one active `provider_workspace` binding recorded in that historical run, one later lifecycle transition that suspends `scope_ops`, and one current config snapshot with `scopeAttachmentMode = required`.
* Seeded policy rules: ordinary same-scope use was allowed in the historical run; new live attachment to the suspended scope is blocked by lifecycle state before downstream execution proceeds.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none for the blocked live inbound; replay uses stored model refs from the historical run only.
* Selected tool implementations: none.
* Expected capability set: not material for the blocked live path; replay reads stored run evidence only.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the historical scope snapshot, membership snapshot, binding refs, suspension change record, blocked live inbound-resolution evidence, historical run manifest, and historical final output.

### Given / When / Then

Given one scope was active for a past run and is later suspended,
When a new inbound interaction arrives on the same bound live path and an operator separately replays the historical run,
Then the new live interaction is blocked from attaching to the suspended scope, while replay still resolves the exact historical scope, membership, and binding snapshot from the original run.

### Required assertions

`Required fixtures:`

* The historical run completed before suspension.
* Live attachment requires an active scope on the current path.

`Required observability artifacts:`

* Suspension change record and scope lifecycle timeline entry.
* Blocked inbound-resolution artifact for the new live interaction.
* Historical `RunTimeline`, `ExecutionGraph`, `RunSummary`, and replay-manifest artifacts for the original run.
* Operator read views showing one historical scope snapshot suitable for replay attachment analysis.

`Required replay artifacts:`

* Historical scope ref, membership snapshot ref, binding refs, model refs, final output ref, replay manifest, and suspension change record.

`Pass/fail oracle:`

* The scenario passes only if suspension blocks new live attachment without erasing the historical scope state needed for audit and replay.

### Required harness capabilities

* Synthetic channel driver
* Operator replay driver
* Identity and thread fixture service
* Scope registry, lifecycle, and snapshot fixture service
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Module smoke scenarios

## Scenario 5

### Scenario summary

* `Title:` `ResolveScopeAttachment` returns an explicit ambiguous outcome when multiple scopes match the same inbound boundary
* `Risk level:` High
* `Rationale:` Proves the Team subsystem fails explicit rather than guessing when more than one scope is attachable for the same inbound context.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Team ambiguous-attachment rule and deterministic attachment behavior
* Layer 2: Identity and Thread disambiguation posture for inbound resolution

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one user `user_ambiguous_scope`, two active scopes `scope_red` and `scope_blue`, one active membership in both scopes, two active attachment bindings that both match the same inbound boundary, and one config snapshot that requires explicit attachment rather than best-guess selection.
* Seeded policy rules: not material because attachment must fail explicit before runtime starts.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve both candidate scope refs, both membership refs, both binding refs, the ambiguous attachment result, and inbound-resolution audit refs.

### Given / When / Then

Given two active scopes both match the same inbound boundary for the same user,
When `ResolveScopeAttachment` runs during inbound resolution,
Then it returns an explicit ambiguous or multi-candidate outcome rather than silently selecting one scope.

### Required assertions

`Required fixtures:`

* Each candidate scope is valid on its own so ambiguity is the only failure reason.

`Required observability artifacts:`

* Scope-attachment result showing the ambiguous outcome and candidate scope refs.
* `InboundResolutionResult` with a disambiguation-required or equivalent blocked outcome.
* Explicit absence of a `PreRunEnvelope.collaborativeScopeId` and absence of live run creation.

`Required replay artifacts:`

* Both scope refs, both membership refs, both binding refs, config snapshot ref, and inbound-resolution audit refs.

`Pass/fail oracle:`

* The scenario passes only if ambiguous attachment remains explicit and no run starts on a guessed scope.

### Required harness capabilities

* Synthetic channel driver
* Identity and thread fixture service
* Scope registry and binding fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` `ResolveScopeAttachment` returns a no-scope outcome when no scope matches and attachment is optional
* `Risk level:` Medium
* `Rationale:` Proves the Team subsystem can return an explicit no-scope result without inventing shared context when the product path allows no-scope behavior.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Team no-scope attachment outcome when no valid scope applies
* Layer 2: Identity and Thread no-scope run-start handoff

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_optional_scope`, no matching scope binding for the inbound boundary, and one config snapshot with `scopeAttachmentMode = optional`.
* Seeded policy rules: allow ordinary no-scope run start on this path.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the explicit no-scope attachment result, inbound-resolution artifacts, config snapshot ref, and resulting no-scope `PreRunEnvelope`.

### Given / When / Then

Given no valid collaborative scope matches one inbound interaction,
When `ResolveScopeAttachment` runs under `scopeAttachmentMode = optional`,
Then the subsystem returns an explicit no-scope outcome and downstream inbound resolution may proceed without a `collaborativeScopeId`.

### Required assertions

`Required fixtures:`

* No matching scope exists by binding or membership.

`Required observability artifacts:`

* No-scope attachment result.
* `InboundResolutionResult` and `RuntimeStartEnvelope` showing a no-scope run start.
* Explicit absence of any invented scope id in downstream run metadata.

`Required replay artifacts:`

* No-scope attachment result, config snapshot ref, inbound-resolution artifacts, and the resulting `PreRunEnvelope`.

`Pass/fail oracle:`

* The scenario passes only if the subsystem returns no-scope explicitly and no synthetic collaborative scope is created.

### Required harness capabilities

* Synthetic channel driver
* Identity and thread fixture service
* Scope registry fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Required scope attachment blocks run start when no valid scope matches
* `Risk level:` High
* `Rationale:` Proves the scope-attachment mode is real enforcement input. When scope attachment is required, a missing valid scope must block the inbound path rather than degrade into a no-scope live run.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Team required-attachment posture and explicit failure on missing scope
* Layer 2: Identity and Thread blocked inbound-resolution behavior

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_required_scope`, no valid matching scope for the inbound boundary, and one config snapshot with `scopeAttachmentMode = required`.
* Seeded policy rules: not material because inbound resolution must stop before runtime start.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the blocked attachment outcome, config snapshot ref, and inbound-resolution audit refs.

### Given / When / Then

Given no valid collaborative scope matches one inbound interaction,
When `ResolveScopeAttachment` runs under `scopeAttachmentMode = required`,
Then inbound resolution is blocked and no live run starts.

### Required assertions

`Required fixtures:`

* The missing-scope condition is the only blocker.

`Required observability artifacts:`

* Blocked scope-attachment result and inbound-resolution audit refs.
* Explicit absence of `RuntimeStartEnvelope` and absence of run creation.

`Required replay artifacts:`

* Blocked attachment result, config snapshot ref, inbound event ref, and audit refs.

`Pass/fail oracle:`

* The scenario passes only if required scope attachment blocks run start instead of silently degrading into no-scope execution.

### Required harness capabilities

* Synthetic channel driver
* Identity and thread fixture service
* Scope registry fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Non-active membership states never behave as active attachment rights even when a channel or tenant binding exists
* `Risk level:` High
* `Rationale:` Proves membership-state enforcement is not bypassed by bindings. `invited`, `left`, `revoked`, `expired`, and `rejected` must never be treated as active access.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Team membership-state rules for attachment and no-bypass binding posture

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one scope `scope_membership_matrix`, one valid matching attachment binding, and five deterministic fixture variants where the same user has membership state `invited`, `left`, `revoked`, `expired`, or `rejected`.
* Seeded policy rules: not material because attachment must not proceed on non-active membership.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the membership-state refs, change records where applicable, and attachment outcomes for each state.

### Given / When / Then

Given one inbound boundary matches a valid collaborative-scope binding,
When `ResolveScopeAttachment` checks membership for each non-active membership-state fixture,
Then none of those states behaves as active attachment access even though the binding itself is valid.

### Required assertions

`Required fixtures:`

* Membership state is the only varied factor across the fixture matrix.

`Required observability artifacts:`

* Membership-state lookup evidence for each fixture.
* Attachment outcomes showing no auto-attachment for `invited`, `left`, `revoked`, `expired`, and `rejected`.
* Explicit absence of live run creation for the no-attachment variants.

`Required replay artifacts:`

* Scope ref, binding ref, membership refs for each state, relevant change-record refs, and attachment outcomes.

`Pass/fail oracle:`

* The scenario passes only if every non-active membership state is denied attachment regardless of matching bindings.

### Required harness capabilities

* Synthetic channel driver
* Scope registry and membership fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Membership role changes emit durable history with actor provenance rather than mutating the past invisibly
* `Risk level:` Medium
* `Rationale:` Proves role changes are audit-grade lifecycle events. Current role may change, but the prior role and actor provenance must remain recoverable in historical views.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Team role-change rules, `RecordScopeChange`, and membership timeline readability

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one active scope `scope_role_history`, one active membership for `user_role_history` with role `member`, and one operator action that changes the role to `admin`.
* Seeded policy rules: allow the operator-managed role-change action.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: not material.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the original membership ref, role-change `ScopeChangeRecord`, actor provenance, updated membership ref, and historical snapshot refs.

### Given / When / Then

Given one active member’s role changes from `member` to `admin`,
When the Team subsystem records that role change,
Then current membership reads return the new role while historical views preserve the prior role and the actor provenance for the change.

### Required assertions

`Required fixtures:`

* The role-change action is the only lifecycle mutation in the scenario.

`Required observability artifacts:`

* `ScopeChangeRecord` for the role change with actor provenance.
* Membership timeline read view showing both the prior and current role states.
* Current `GetMembership` output returning the new role.

`Required replay artifacts:`

* Original membership ref, updated membership ref, role-change change record, actor ref, and snapshot refs.

`Pass/fail oracle:`

* The scenario passes only if role history is append-only and replay-visible instead of overwritten in place.

### Required harness capabilities

* Operator scope-management driver
* Scope registry and membership fixture service
* Scope snapshot and membership-timeline harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` `ListScopeBindings` preserves superseded and disabled bindings for historical inspection while live resolution uses only the active binding set
* `Risk level:` Medium
* `Rationale:` Proves binding lifecycle is replay-safe. Superseded and disabled bindings must remain queryable historically, but the live path must narrow to the active binding set only.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Team binding lifecycle, historical binding readability, and active-only live binding resolution

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one active scope `scope_binding_history`, three resource bindings for the same `resourceKind` where `binding_v1` is `superseded`, `binding_v2` is `disabled`, and `binding_v3` is `active`, and one config snapshot with no special overrides.
* Seeded policy rules: not material.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: downstream consumers may only see the active binding in live resolution.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve all three binding refs, their lifecycle states, and historical snapshots.

### Given / When / Then

Given one scope has superseded, disabled, and active resource bindings for the same shared resource kind,
When callers request current live bindings and historical binding history,
Then live resolution returns only the active binding while historical inspection preserves the superseded and disabled bindings and their exact refs.

### Required assertions

`Required fixtures:`

* All bindings point to distinct immutable resource refs so lifecycle-state effects are attributable.

`Required observability artifacts:`

* Binding history read view showing all binding lifecycle states.
* Live `ListScopeBindings` output narrowed to the active binding set.
* Change records for the supersede and disable transitions.

`Required replay artifacts:`

* All binding refs, relevant change-record refs, scope snapshot refs, and current-versus-historical read results.

`Pass/fail oracle:`

* The scenario passes only if historical bindings remain readable while live binding resolution uses only active bindings.

### Required harness capabilities

* Scope registry and binding fixture service
* Binding-history harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Broken `ScopeResourceBinding` refs produce explicit diagnostics and never silently substitute another resource
* `Risk level:` High
* `Rationale:` Proves the shared binding layer fails closed. A binding that points to a missing or disabled downstream resource must produce a clear diagnostic outcome, and the Team subsystem must preserve the broken historical ref for replay rather than silently swapping in a different resource.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 2: Team broken-resource-ref failure mode and replay preservation of historical binding refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one active scope `scope_broken_binding`, one active resource binding `binding_missing_skill` whose `resourceRef` no longer resolves in the owning subsystem, and one config snapshot with no widening overrides.
* Seeded policy rules: not material.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: the broken ref must not be replaced implicitly by another candidate resource.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the broken binding ref, diagnostic outcome, and historical snapshot refs.

### Given / When / Then

Given one active scope resource binding points to a missing or disabled downstream resource,
When that binding is read on the live path for downstream use,
Then the flow produces an explicit diagnostic outcome and does not silently substitute another resource ref.

### Required assertions

`Required fixtures:`

* The binding ref itself is valid and stable; only the downstream resource target is broken.

`Required observability artifacts:`

* Binding read evidence showing the broken target ref.
* Diagnostic outcome identifying that the bound resource cannot be resolved on the live path.
* Explicit absence of any substituted resource ref in the same resolution flow.

`Required replay artifacts:`

* Broken binding ref, scope snapshot ref, diagnostic evidence, and historical refs proving the original binding still exists for audit.

`Pass/fail oracle:`

* The scenario passes only if broken bindings fail explicit and preserve their historical refs instead of silently drifting to another resource.

### Required harness capabilities

* Scope registry and binding fixture service
* Historical snapshot harness
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 12

### Scenario summary

* `Title:` Lower-precedence configuration cannot widen `scopeAttachmentMode`, `allowedScopeTypes`, or disabled binding restrictions
* `Risk level:` High
* `Rationale:` Proves collaboration configuration follows the platform precedence contract. Lower-precedence layers may narrow behavior, but they must not re-enable disallowed scope types, relax required attachment, or override disabled bindings.

### Contracts validated

* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Team configuration precedence for `scopeAttachmentMode`, `allowedScopeTypes`, `scopeBindingPins`, and `disabledScopeBindings`
* Layer 2: Identity and Thread inbound behavior under narrowed effective scope-attachment config

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one system-level config with `scopeAttachmentMode = required` and `allowedScopeTypes = [application]`, one collaborative-scope config with `scopeBindingPins` that pins `binding_v3`, one agent-level override attempting to set `scopeAttachmentMode = optional`, one run-level override attempting to allow `team` scope usage, and one disabled binding listed in `disabledScopeBindings`.
* Seeded policy rules: not material because the configuration seam is resolved before downstream policy-sensitive work.
* Seeded memory and retrieval stores: not material.
* Selected model mode: none.
* Selected tool implementations: none.
* Expected capability set: only the higher-precedence allowed scope type and non-disabled pinned bindings remain effective.
* Execution-space posture: not material.
* Approval or replay fixtures: replay must preserve the effective config snapshot, rejected widening inputs, binding refs, and filtered attachment or binding results.

### Given / When / Then

Given higher-precedence configuration requires scope attachment, limits attachment to `application` scopes, pins one exact binding, and disables another binding,
When lower-precedence layers attempt to relax required attachment, allow `team` scope use, or revive the disabled binding,
Then the effective configuration remains narrowed by the higher-precedence rules and the live path does not widen.

### Required assertions

`Required fixtures:`

* The only conflict is widening from lower-precedence layers.

`Required observability artifacts:`

* Effective config snapshot ref showing the retained higher-precedence restrictions.
* Attachment or binding-resolution outputs showing the disallowed scope type and disabled binding are excluded.
* Audit evidence tying the final effective behavior to explicit config precedence rather than hidden defaults.

`Required replay artifacts:`

* Higher-precedence and lower-precedence config refs, effective config snapshot ref, relevant scope and binding refs, and filtered live outputs.

`Pass/fail oracle:`

* The scenario passes only if lower-precedence configuration cannot broaden attachment or binding behavior beyond higher-precedence restrictions.

### Required harness capabilities

* Scope registry and binding fixture service
* Config snapshot fixture service
* Identity and thread fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None
