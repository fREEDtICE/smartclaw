# Model Routing and Access E2E Cases

This document proposes fourteen deterministic E2E scenarios for the Model Routing and Access subsystem.
It covers both end-to-end user journeys and module black-box flows driven through the routing boundary, including pre-assembly budget planning, final target resolution, capability and policy hard filters, continuity rules, bounded failover, delegated child access narrowing, replay authority, and configuration-precedence enforcement.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic runtime step intents with seeded route profiles, target catalogs, pricing metadata, and health snapshots
* seeded user, thread, collaborative-scope, execution-space, policy, and configuration fixtures
* deterministic Context Assembly token-count outputs and fake provider fixtures for route-actionable failure classes
* replay-visible budget envelopes, routing decisions, candidate summaries, configuration snapshots, and policy refs
* trace, checkpoint, and replay capture for every meaningful planning, selection, and failover action

## Suite structure

### User-journey scenarios

1. default conversational step routes to one compliant primary target and succeeds
2. tool-required step selects a tool-capable target over a cheaper text-only target
3. large-context step uses `PlanBudget` and `ResolveRoute` to choose a wide-window target after final sizing
4. repeated compatible step honors `prefer_sticky` continuity and keeps the prior healthy target
5. primary target rate limit advances through the bounded fallback chain and the next target succeeds

### Module black-box scenarios

6. delegated child run uses an explicit narrower child route profile and child budget
7. unsupported capability combination across all candidates returns `no_eligible_target`
8. context-window or cost-envelope mismatch returns `budget_blocked`
9. policy, region, or data-handling restrictions blocking all candidates return `policy_blocked`
10. `require_sticky` fails explicitly when the prior target is no longer eligible
11. provider capability drift with no alternate eligible target returns `catalog_inconsistent`
12. bounded cross-target failovers eventually return `fallback_exhausted`
13. historical replay prefers the stored routing decision and marks live recompute as best-effort only
14. run-level routing overrides may narrow choices but must not widen upstream restrictions

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Default conversational step routes to one compliant primary target and succeeds
* `Risk level:` Low
* `Rationale:` Proves the baseline routing path: runtime requests a pre-assembly budget envelope, Context Assembly returns actual token sizing within that envelope, routing emits one authoritative `RoutingDecision`, and downstream provider execution uses only the selected primary target.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access `PlanBudget`, `ResolveRoute`, bounded fallback emission, and replay-visible decision capture
* Layer 2: Context Assembly consumption of `RoutingBudgetEnvelope` before final sizing
* Layer 2: Agent Runtime model-step orchestration and post-route provider authorization boundary
* Layer 2: Observability route-decision, candidate-summary, and downstream execution linkage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_route_default`, one open thread `thread_route_default`, one active collaborative scope `scope_route_default`, and one route profile `rp_general_text` whose allowed targets are `target_text_primary` and `target_text_backup`.
* Seeded policy rules: both targets are allowed for the thread's collaborative scope, data class, and region posture; no premium escalation or approval is required.
* Seeded memory and retrieval stores: both stores exist and stay empty so the route decision depends on the step intent, profile, and config rather than large retrieved context.
* Selected model mode: plain conversational text generation with no tool calls, structured output, or streaming.
* Selected tool implementations: none.
* Expected capability set: text generation only.
* Execution-space posture: no execution-space-specific restrictions are present.
* Approval or replay fixtures: deterministic target catalog, pricing snapshot, health snapshot, configuration snapshot, provider spy fixture, and replay verifier.

### Given / When / Then

Given Agent Runtime receives a simple inbound user message and asks Model Routing and Access to plan and resolve one ordinary text step under `rp_general_text`,
When routing emits a `RoutingBudgetEnvelope`, Context Assembly returns final token counts that fit both allowed targets, and `ResolveRoute` ranks the compliant candidates,
Then routing returns one authoritative `RoutingDecision` whose primary target is `target_text_primary`, whose ordered fallback chain is bounded, and whose selected target is the only target later used for provider execution.

### Required assertions

`Required fixtures:`

* The target catalog lists both candidate targets as text-capable and healthy, with deterministic pricing and latency metadata.
* The `RoutingBudgetEnvelope` produced before Context Assembly is sufficient for the final assembled prompt without silent truncation.
* The provider execution spy records the exact target identity later used downstream.

`Required observability artifacts:`

* `RoutingBudgetEnvelope` artifact linked to the same `requestId`, `runId`, and `stepId` as the final `RoutingDecision`.
* `RoutingDecision` fields including `routeDecisionId`, `primaryTarget`, `fallbackTargets`, `reasonCodes`, `budgetEnvelopeRef`, `selectionSnapshotRef`, and `policyDecisionRef` when present.
* Candidate-summary evidence showing why `target_text_primary` ranked ahead of `target_text_backup`.
* Downstream provider-attempt trace proving execution began only after routing completed.

`Required replay artifacts:`

* Canonical step-intent envelope and propagated identity or scope envelope.
* Configuration snapshot ref, pricing snapshot ref, and health snapshot ref used by selection.
* Stored `RoutingDecision` and downstream provider-attempt evidence referencing the same selected primary target.

`Pass/fail oracle:`

* Routing emits one replay-visible execution plan before any provider call occurs, the selected primary target is deterministic under the seeded catalog and policy posture, and downstream execution never bypasses the route decision.

### Required harness capabilities

* Runtime step fixture
* Context Assembly token-sizing fixture
* Deterministic routing fixture service
* Provider target spy
* Trace collector, route-explanation materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Tool-required step selects a tool-capable target over a cheaper text-only target
* `Risk level:` Medium
* `Rationale:` Proves that required model capabilities are hard filters, not soft preferences: a cheaper text-only target must be rejected when the step requires `toolCalls`.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access capability-fit filtering and stable ranking after hard filters pass
* Layer 2: Agent Runtime propagation of capability requirements into the routing request
* Layer 2: Tool Execution boundary through routing-only capability selection, not tool execution
* Layer 2: Observability candidate rejections and selected-capability evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_route_tools`, one open thread `thread_route_tools`, one scope `scope_route_tools`, and one route profile `rp_general_or_tool`.
* Seeded policy rules: both candidate targets are regionally and commercially allowed for this scope.
* Seeded memory and retrieval stores: not material to the scenario.
* Selected model mode: a reasoning step that must be able to request tools.
* Selected tool implementations: one deterministic tool descriptor is attached at runtime so the request truthfully requires `toolCalls`.
* Expected capability set: `toolCalls = true`; no strict schema or streaming is required.
* Execution-space posture: no special restrictions.
* Approval or replay fixtures: target catalog fixture where `target_text_cheap` lacks `toolCalls` and `target_tool_balanced` supports them, plus trace and replay fixtures.

### Given / When / Then

Given runtime submits a step intent that requires tool-call capability and provides one effective tool descriptor set,
When `ResolveRoute` evaluates `target_text_cheap` and `target_tool_balanced` under the same route profile,
Then routing rejects `target_text_cheap` as ineligible on capability grounds and selects `target_tool_balanced` even though it is not the cheapest candidate.

### Required assertions

`Required fixtures:`

* The request explicitly marks `toolCalls` as required.
* `target_text_cheap` is otherwise healthy and allowed so the test proves capability filtering, not policy blocking.
* `target_tool_balanced` is healthy, allowed, and supports the required capability.

`Required observability artifacts:`

* Routing request artifact that records the required capability set.
* Candidate-summary evidence showing `toolCalls` capability rejection for `target_text_cheap`.
* Final `RoutingDecision` selecting `target_tool_balanced` with no ambiguity about why the cheaper target lost.

`Required replay artifacts:`

* Capability-request envelope and effective tool-exposure summary.
* Catalog snapshot ref showing each candidate's declared capabilities.
* Stored route decision and route-explanation artifact.

`Pass/fail oracle:`

* Any route that chooses the cheaper text-only target fails; the selected target must satisfy the declared capability requirements before cost or latency ranking is allowed to matter.

### Required harness capabilities

* Runtime capability-requirement fixture
* Deterministic routing fixture service
* Target-catalog fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Large-context step uses `PlanBudget` and `ResolveRoute` to choose a wide-window target after final sizing
* `Risk level:` High
* `Rationale:` Proves the two-phase routing contract: budget planning must happen before final context assembly, but authoritative target choice must wait until actual token posture is known.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access `PlanBudget`, final context-fit filtering, and authoritative `ResolveRoute`
* Layer 2: Context Assembly bounded prompt construction from a routing-provided envelope
* Layer 2: Agent Runtime sequencing of plan-budget, context assembly, and final route resolution
* Layer 2: Observability budget-envelope and final-selection lineage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_route_longctx`, one thread `thread_route_longctx`, one scope `scope_route_longctx`, and one route profile `rp_long_context`.
* Seeded policy rules: both candidate targets are allowed for the request's scope and data posture.
* Seeded memory and retrieval stores: retrieval returns a deterministic large evidence pack that materially increases prompt size after `PlanBudget`.
* Selected model mode: non-streaming summarization over a large retrieved corpus.
* Selected tool implementations: none.
* Expected capability set: plain text generation, but with large context-window fit requirements after final sizing.
* Execution-space posture: none required.
* Approval or replay fixtures: `target_small_ctx` with a smaller context window, `target_large_ctx` with a wider window, deterministic retrieval pack, and replay fixtures.

### Given / When / Then

Given runtime asks routing for a pre-assembly budget envelope before Context Assembly materializes retrieval results,
When Context Assembly builds the final prompt and reports an actual input-token count that no longer fits `target_small_ctx`,
Then `ResolveRoute` must choose `target_large_ctx` as the authoritative primary target instead of silently truncating the context or pretending the smaller target is still valid.

### Required assertions

`Required fixtures:`

* The `PlanBudget` output is generated before final context assembly.
* The final assembled token count exceeds `target_small_ctx` capacity but remains within `target_large_ctx` capacity and budget.
* The deterministic retrieval pack is replay-visible so the final token posture is reproducible.

`Required observability artifacts:`

* `RoutingBudgetEnvelope` with pre-assembly bounds linked to the final `RoutingDecision`.
* Context Assembly output showing the authoritative final token counts used by routing.
* Candidate-summary evidence showing `target_small_ctx` rejected on context-window fit.
* Final route decision selecting `target_large_ctx`.

`Required replay artifacts:`

* Stored retrieval-pack refs and final assembled-context hash or refs.
* Budget-envelope ref and final token-count record.
* `RoutingDecision` and route-explanation artifact proving why the smaller target became ineligible.

`Pass/fail oracle:`

* The route is determined from actual post-assembly token posture, not guesses; no silent truncation, hidden downgrade, or budget overrun is allowed.

### Required harness capabilities

* Runtime step fixture
* Context Assembly deterministic retrieval and sizing fixture
* Deterministic routing fixture service
* Trace collector, route explainer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Repeated compatible step honors `prefer_sticky` continuity and keeps the prior healthy target
* `Risk level:` Medium
* `Rationale:` Proves the route-stability rule: when requirements are unchanged and the prior target is still eligible, routing should prefer continuity over arbitrary target churn.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access continuity rules, stable ranking, and affinity boundaries
* Layer 2: Agent Runtime repeated-step route requests within one run
* Layer 2: Observability prior-target lineage and continuity evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_route_sticky`, one active run `run_route_sticky`, one thread `thread_route_sticky`, one scope `scope_route_sticky`, and one route profile `rp_balanced_continuity` with `defaultAffinityMode = prefer_sticky`.
* Seeded policy rules: both candidate targets are allowed and healthy for both the prior step and the current step.
* Seeded memory and retrieval stores: not material to the scenario.
* Selected model mode: plain conversational text generation on two successive compatible steps.
* Selected tool implementations: none.
* Expected capability set: unchanged between the prior step and the current step.
* Execution-space posture: no scope or execution-space change occurs between the two steps.
* Approval or replay fixtures: one stored prior successful `RoutingDecision` selecting `target_balanced_a`, plus catalog and health snapshots in which `target_balanced_a` remains eligible and `target_balanced_b` is a viable alternative.

### Given / When / Then

Given one run already executed a compatible prior step successfully on `target_balanced_a`,
When runtime requests routing for the next compatible step under `prefer_sticky` continuity and both `target_balanced_a` and `target_balanced_b` remain eligible,
Then routing prefers `target_balanced_a` again instead of churning to `target_balanced_b`.

### Required assertions

`Required fixtures:`

* The prior and current steps share the same collaborative scope, execution space, and effective capability requirements.
* The prior selected target remains healthy and policy-eligible.
* The alternate target is also eligible so the scenario proves continuity preference rather than absence of choice.

`Required observability artifacts:`

* Prior route-decision ref linked to the new request through run or step lineage.
* Current request artifact recording `prefer_sticky` continuity posture.
* Final `RoutingDecision` selecting the prior target and, when present, `stickyUntil` or equivalent continuity evidence.

`Required replay artifacts:`

* Stored prior `RoutingDecision`.
* Current configuration snapshot and health snapshot showing the prior target remained eligible.
* Current route explanation proving continuity preference influenced ranking only after hard filters passed.

`Pass/fail oracle:`

* If requirements are unchanged and the prior target is still eligible, routing should remain stable; gratuitous target churn fails this scenario.

### Required harness capabilities

* Multi-step runtime fixture
* Deterministic routing fixture service
* Prior-route lineage fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 5

### Scenario summary

* `Title:` Primary target rate limit advances through the bounded fallback chain and the next target succeeds
* `Risk level:` High
* `Rationale:` Proves the controlled failover path: routing owns cross-target advancement after a route-actionable provider failure, preserves attempt lineage, and stops after one bounded next-target selection rather than permitting silent provider-layer target switching.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access ordered fallback chain and `AdvanceRoute`
* Layer 2: LLM Provider Abstraction boundary that same-target retries happen before routing-level failover
* Layer 2: Agent Runtime step ownership and decision to continue after failure
* Layer 2: Observability failover-attempt lineage and final selected target evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified user `user_route_failover`, one thread `thread_route_failover`, one scope `scope_route_failover`, and one route profile `rp_failover_text` with `maxCrossTargetFallbacks = 1`.
* Seeded policy rules: both `target_region_a` and `target_region_b` are allowed for the same scope and request posture.
* Seeded memory and retrieval stores: not material to the scenario.
* Selected model mode: plain text generation.
* Selected tool implementations: none.
* Expected capability set: both candidate targets satisfy the request.
* Execution-space posture: no special restrictions.
* Approval or replay fixtures: initial route decision with `target_region_a` primary and `target_region_b` fallback, deterministic provider fixture returning a normalized `rate_limit` failure for `target_region_a`, and success for `target_region_b`.

### Given / When / Then

Given routing already selected `target_region_a` as primary with `target_region_b` as the next fallback,
When provider execution on `target_region_a` ends in a route-actionable `rate_limit` failure and runtime asks routing to advance,
Then `AdvanceRoute` returns `target_region_b` as the next eligible target, preserves attempt lineage, and the step succeeds on that fallback target.

### Required assertions

`Required fixtures:`

* The provider fixture returns a normalized `rate_limit` outcome after any same-target retries are complete.
* The fallback chain is bounded and deterministic.
* The second target remains healthy and policy-eligible at failover time.

`Required observability artifacts:`

* Original `RoutingDecision` showing ordered fallback targets.
* Failure record for the primary attempt with provider error class `rate_limit`.
* `AdvanceRoute` output preserving `routeDecisionId` or explicit lineage to the prior decision and incrementing attempt numbering.
* Downstream provider execution record showing the succeeding attempt used `target_region_b`.

`Required replay artifacts:`

* Stored original route decision and provider failure artifact.
* Route-advance artifact or lineage record for the fallback selection.
* Final provider-attempt record and step-completion evidence.

`Pass/fail oracle:`

* Cross-target failover occurs only through routing-visible advancement, not through hidden adapter-side switching, and the entire failover sequence is reconstructable in replay order.

### Required harness capabilities

* Runtime failover fixture
* Deterministic routing fixture service with `AdvanceRoute`
* Deterministic provider failure and success fixtures
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module black-box scenarios

## Scenario 6

### Scenario summary

* `Title:` Delegated child run uses an explicit narrower child route profile and child budget
* `Risk level:` High
* `Rationale:` Proves the delegation boundary that child runs do not inherit broad parent model access automatically; routing must resolve the child step using explicit delegated route and budget posture.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access child-route-profile and child-budget narrowing
* Layer 2: Subagent Profiles and Delegation child capability delegation rules
* Layer 2: Agent Runtime delegated child creation and lineage propagation
* Layer 2: Observability parent-child route lineage and delegated-budget evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one parent run `run_parent_route`, one child run request `child_run_route`, one shared scope `scope_route_child`, parent route profile `rp_parent_broad`, and delegated child route profile `rp_child_narrow`.
* Seeded policy rules: the parent profile may access `target_standard` and `target_premium_reasoning`, but the child delegated profile may access only `target_standard`.
* Seeded memory and retrieval stores: not material to the routing decision.
* Selected model mode: one delegated child reasoning step with ordinary text generation.
* Selected tool implementations: none.
* Expected capability set: text generation only.
* Execution-space posture: the child stays within the parent lineage but receives its own explicit delegated routing posture.
* Approval or replay fixtures: one delegation profile or explicit child capability envelope showing child budget `10k input / 3k output` as a subset of the parent's broader budget.

### Given / When / Then

Given a parent run delegates one bounded child task with an explicit child route profile and child budget,
When the child step enters Model Routing and Access,
Then routing must resolve the child step only against the delegated child profile and child budget, not against the full parent route profile or parent budget posture.

### Required assertions

`Required fixtures:`

* The parent route profile includes at least one target the child is not allowed to use.
* The child budget is an explicit subset of the parent-delegated budget.
* The child request carries parent lineage refs plus the delegated route profile ref.

`Required observability artifacts:`

* Child routing request showing delegated route-profile and budget refs.
* Candidate summary proving parent-only targets were not eligible for child selection.
* Final child `RoutingDecision` linked to the parent run or step lineage.

`Required replay artifacts:`

* Delegation profile ref or child capability envelope ref.
* Parent and child budget artifacts.
* Stored child route decision and route explanation.

`Pass/fail oracle:`

* Any child route that can see or select parent-only targets fails; delegated routing must be narrower by construction and replay-visible as such.

### Required harness capabilities

* Parent-child runtime lineage fixture
* Delegation profile fixture service
* Deterministic routing fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 7

### Scenario summary

* `Title:` Unsupported capability combination across all candidates returns `no_eligible_target`
* `Risk level:` Medium
* `Rationale:` Proves the hard-filter error boundary: when no candidate satisfies the requested capability set, routing must fail closed instead of degrading silently to a weaker target.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Model Routing and Access hard capability filtering and normalized error model
* Layer 2: Observability candidate rejection summaries and terminal routing failure evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one route profile `rp_capability_gap` with three allowed targets.
* Seeded policy rules: all three targets are allowed by scope, region, and cost posture so the failure is purely capability-driven.
* Seeded memory and retrieval stores: not material.
* Selected model mode: strict structured-output request that also requires `toolCalls`.
* Selected tool implementations: one deterministic tool descriptor set is present to make the `toolCalls` requirement real.
* Expected capability set: `toolCalls = true`, `structuredOutput = true`, and `strictJSONSchema = true`.
* Execution-space posture: none required.
* Approval or replay fixtures: catalog fixture where no single target supports the entire combination.

### Given / When / Then

Given routing receives one step that requires a capability combination no configured target can satisfy,
When `ResolveRoute` applies hard capability filters across the entire candidate set,
Then it returns `no_eligible_target` and no provider execution plan is produced.

### Required assertions

`Required fixtures:`

* At least one candidate supports tools only, at least one supports structured output only, and none support the full required combination.
* Policy and budget posture would otherwise allow the targets.
* No hidden fallback target outside the route profile exists.

`Required observability artifacts:`

* Routing request artifact with the full required capability set.
* Candidate-summary evidence showing per-candidate capability rejection reasons.
* Terminal `RoutingError` with code `no_eligible_target`.

`Required replay artifacts:`

* Capability-request envelope.
* Catalog snapshot ref showing declared capabilities.
* Terminal error artifact and candidate-summary ref.

`Pass/fail oracle:`

* Routing must not pick any target that lacks a required capability; the only valid outcome is a terminal `no_eligible_target` failure with observable rejection evidence.

### Required harness capabilities

* Capability-combination request fixture
* Deterministic routing fixture service
* Target-catalog fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Context-window or cost-envelope mismatch returns `budget_blocked`
* `Risk level:` High
* `Rationale:` Proves the budget-fit boundary: routing must reject requests whose actual token posture or predicted cost exceeds every allowed target's envelope instead of overrunning budget or silently dropping context.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access budget posture, context-fit filtering, and normalized error model
* Layer 2: Context Assembly final-token posture handoff to routing
* Layer 2: Observability budget-envelope, token-count, and candidate rejection evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one route profile `rp_budget_tight` with otherwise-allowed targets `target_mid_ctx` and `target_large_ctx`.
* Seeded policy rules: both targets are allowed by scope and policy.
* Seeded memory and retrieval stores: final context assembly yields a deterministic token count and estimated output size that exceed the configured predicted cost or context fit of every allowed target.
* Selected model mode: non-streaming text generation.
* Selected tool implementations: none.
* Expected capability set: plain text generation only.
* Execution-space posture: none required.
* Approval or replay fixtures: deterministic pricing metadata and final token-count fixture that keeps the failure in the budget domain, not the capability or policy domain.

### Given / When / Then

Given a valid route profile and valid capability request,
When the authoritative final token posture and predicted cost are evaluated against all allowed candidates and none fit the configured envelope,
Then routing returns `budget_blocked`.

### Required assertions

`Required fixtures:`

* At least one candidate would be eligible if the request were smaller or the cost cap were higher.
* The final token counts and predicted cost are deterministic and replay-visible.
* Policy and capability filters do not eliminate the candidates first.

`Required observability artifacts:`

* `RoutingBudgetEnvelope` and final token-count evidence.
* Candidate-summary rejection counts showing budget or context-window fit failures.
* Terminal `RoutingError` with code `budget_blocked`.

`Required replay artifacts:`

* Final assembled-context size artifact.
* Pricing snapshot and budget-posture artifact.
* Terminal routing-error artifact with candidate-summary ref.

`Pass/fail oracle:`

* Routing fails closed on budget posture and records why; silent context truncation, hidden budget overrun, or provider execution despite budget failure all fail the scenario.

### Required harness capabilities

* Context Assembly token-sizing fixture
* Pricing and budget fixture service
* Deterministic routing fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Policy, region, or data-handling restrictions blocking all candidates return `policy_blocked`
* `Risk level:` High
* `Rationale:` Proves that routing is a security and compliance control boundary: region, provider-account, and data-handling restrictions must behave as hard filters and must fail closed when they eliminate all candidates.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Model Routing and Access policy-derived hard filters and error model
* Layer 2: Policy and Approval System route-restriction lineage into routing
* Layer 2: Observability policy decision refs, rejection counts, and terminal failure evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one scope `scope_route_compliance` with `preferredRegions = eu-west` and strict no-cross-border posture, plus route profile `rp_compliance_sensitive`.
* Seeded policy rules: every target in the route profile is either outside the allowed region, on a denied provider-account path, or missing the required compliance tag for the request's data class.
* Seeded memory and retrieval stores: not material.
* Selected model mode: ordinary text generation.
* Selected tool implementations: none.
* Expected capability set: plain text generation.
* Execution-space posture: one data-handling classification requiring in-region processing.
* Approval or replay fixtures: deterministic policy decision fixture, target catalog with explicit region and compliance metadata, and route explanation fixture.

### Given / When / Then

Given routing receives a request whose collaborative scope and policy posture allow no candidate target under the current data-handling constraints,
When `ResolveRoute` applies region, provider-account, and compliance-tag filters,
Then it returns `policy_blocked`.

### Required assertions

`Required fixtures:`

* All candidate targets are rejected by policy or compliance constraints rather than by budget or capability.
* The request carries the user, thread, and scope identifiers needed for policy evaluation.
* The policy fixture exposes a replay-visible decision ref or equivalent lineage artifact.

`Required observability artifacts:`

* Policy decision ref linked to the routing request.
* Candidate-summary evidence showing policy, region, or compliance rejection counts.
* Terminal `RoutingError` with code `policy_blocked`.

`Required replay artifacts:`

* Identity and scope envelope.
* Configuration and policy snapshot refs.
* Terminal routing-error artifact and route explanation.

`Pass/fail oracle:`

* If all candidates are blocked by policy or compliance posture, routing must fail closed and record the governing policy lineage; any selection of a blocked target fails the scenario.

### Required harness capabilities

* Policy decision fixture service
* Deterministic routing fixture service
* Target-catalog region or compliance fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` `require_sticky` fails explicitly when the prior target is no longer eligible
* `Risk level:` High
* `Rationale:` Proves the stronger continuity mode boundary: when `require_sticky` is active and the prior target becomes ineligible, routing must fail explicitly instead of silently switching to another compatible target.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access continuity modes and hard enforcement of `require_sticky`
* Layer 2: Observability prior-target eligibility evidence and terminal routing failure capture

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one active run `run_route_require_sticky`, one prior route decision selecting `target_affinity_locked`, and one route profile `rp_require_sticky` whose effective affinity mode is `require_sticky`.
* Seeded policy rules: an alternate target `target_affinity_alt` is allowed and healthy, but the prior target is no longer eligible because of a seeded quarantine or newly incompatible requirement.
* Seeded memory and retrieval stores: not material.
* Selected model mode: ordinary text generation.
* Selected tool implementations: none.
* Expected capability set: unchanged except for the condition that makes the prior target ineligible.
* Execution-space posture: no scope or execution-space change; the failure is about affinity enforcement.
* Approval or replay fixtures: prior route artifact, target-health or policy snapshot showing the prior target is ineligible, and trace fixtures.

### Given / When / Then

Given a new step is routed under `require_sticky` continuity and the prior target `target_affinity_locked` is no longer eligible,
When routing evaluates the request and sees that another compatible target is available,
Then it must still fail explicitly rather than switching to `target_affinity_alt`.

### Required assertions

`Required fixtures:`

* The prior target was used successfully on an earlier compatible step.
* The prior target is now ineligible for a deterministic reason visible to routing.
* At least one alternate compatible target is available so the test proves explicit failure rather than absence of options.

`Required observability artifacts:`

* Prior route-decision ref and current request artifact showing `require_sticky`.
* Evidence of the prior target's ineligibility, such as health, quarantine, or capability mismatch snapshots.
* Terminal routing failure artifact showing no alternate target was selected.

`Required replay artifacts:`

* Stored prior route decision.
* Current health or policy snapshot that made the prior target ineligible.
* Terminal failure artifact and route explanation.

`Pass/fail oracle:`

* Any automatic switch to a non-sticky target fails; the only valid behavior is an explicit routing failure with replay-visible proof that the required sticky target was no longer eligible.

### Required harness capabilities

* Multi-step runtime fixture
* Prior-route lineage fixture
* Deterministic routing fixture service
* Health or policy snapshot fixture
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The design says `require_sticky` must "fail explicitly" when the prior target is no longer eligible, but it does not define the normalized error code for this condition. The implementation could map it to `no_eligible_target`, `policy_blocked`, or a future dedicated continuity error, and the suite should be updated once that contract is fixed.

## Scenario 11

### Scenario summary

* `Title:` Provider capability drift with no alternate eligible target returns `catalog_inconsistent`
* `Risk level:` High
* `Rationale:` Proves the fail-closed drift boundary: when the catalog says a selected target supports a required feature but the provider rejects the request as `unsupported_feature`, routing must treat that as material catalog drift and avoid blind downgrade.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access catalog-drift classification and error model
* Layer 2: LLM Provider Abstraction normalized `unsupported_feature` error boundary
* Layer 2: Observability catalog snapshot, provider failure, and terminal routing-error evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one route profile `rp_strict_schema_only` with one selected primary target `target_schema_claimed`.
* Seeded policy rules: `target_schema_claimed` is allowed by scope and budget.
* Seeded memory and retrieval stores: not material.
* Selected model mode: strict structured output requiring a feature the catalog says the target supports.
* Selected tool implementations: none.
* Expected capability set: `structuredOutput = true` and `strictJSONSchema = true`.
* Execution-space posture: none required.
* Approval or replay fixtures: catalog snapshot claiming the target supports the required feature, provider fixture returning normalized `unsupported_feature`, and no alternate eligible target in the route profile.

### Given / When / Then

Given routing selected a target because the catalog declared support for the required strict-schema capability,
When provider execution returns normalized `unsupported_feature` for that exact request and no separate eligible target exists,
Then routing classifies the situation as `catalog_inconsistent` and fails closed.

### Required assertions

`Required fixtures:`

* The original routing decision was valid under the stored catalog snapshot.
* Provider abstraction returns normalized `unsupported_feature` rather than a transport error.
* No alternate target in the effective candidate set clearly satisfies the request.

`Required observability artifacts:`

* Original route decision and catalog snapshot ref.
* Provider failure artifact showing `unsupported_feature`.
* Terminal routing failure artifact with code `catalog_inconsistent`.
* Drift evidence linking the observed provider behavior to the stored catalog claim.

`Required replay artifacts:`

* Stored routing decision and selection snapshot ref.
* Provider failure record.
* Terminal routing-error artifact and route explanation.

`Pass/fail oracle:`

* Routing must not silently downgrade to a weaker or unverified target after capability drift; with no alternate eligible target, the only valid outcome is fail-closed `catalog_inconsistent`.

### Required harness capabilities

* Deterministic routing fixture service
* Deterministic provider error fixture
* Catalog snapshot fixture service
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The design says `unsupported_feature` should fail closed unless another eligible target clearly satisfies the request, but it does not define whether that alternate-target branch should consume the existing fallback chain, require a fresh `ResolveRoute`, or annotate the successful path with a persisted catalog-drift marker.

## Scenario 12

### Scenario summary

* `Title:` Bounded cross-target failovers eventually return `fallback_exhausted`
* `Risk level:` High
* `Rationale:` Proves that failover is ordered, bounded, and replay-visible: routing must stop after the configured number of cross-target attempts and return a terminal error with attempt evidence.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access fallback ordering, target non-reuse, and error model
* Layer 2: Agent Runtime retry or failover boundary
* Layer 2: Observability failover-attempt capture and terminal exhaustion evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one route profile `rp_fallback_bounded` with one primary target and two ordered fallback targets, and `maxCrossTargetFallbacks = 2`.
* Seeded policy rules: all targets are allowed and initially eligible.
* Seeded memory and retrieval stores: not material.
* Selected model mode: ordinary text generation.
* Selected tool implementations: none.
* Expected capability set: all targets satisfy the request before failure.
* Execution-space posture: none required.
* Approval or replay fixtures: deterministic provider failure fixtures returning route-actionable failures across all three targets in order.

### Given / When / Then

Given routing produced one primary target and two ordered fallbacks for a single step,
When each target fails in order with route-actionable failures and runtime repeatedly asks routing to advance within the configured bounds,
Then routing eventually returns `fallback_exhausted` with attempt evidence instead of looping, revisiting failed targets, or inventing new candidates.

### Required assertions

`Required fixtures:`

* Failures are route-actionable and normalized before routing sees them.
* The fallback bound is deterministic and lower than the total number of hypothetical retries an unbounded system could make.
* Failed targets are marked so they are not revisited during the step.

`Required observability artifacts:`

* Original route decision with ordered fallback targets.
* Ordered failure records and route-advance records for each attempt.
* Terminal `RoutingError` with code `fallback_exhausted`.
* Attempt-count evidence tied to the same step and route lineage.

`Required replay artifacts:`

* Stored original route decision.
* Failure artifacts and route-advance artifacts for each consumed fallback.
* Terminal exhaustion artifact.

`Pass/fail oracle:`

* Routing stops exactly at the configured bound, does not revisit failed targets, and emits one replay-visible `fallback_exhausted` error when no further allowed fallback remains.

### Required harness capabilities

* Runtime failover fixture
* Deterministic routing fixture service with `AdvanceRoute`
* Deterministic provider failure fixtures
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 13

### Scenario summary

* `Title:` Historical replay prefers the stored routing decision and marks live recompute as best-effort only
* `Risk level:` High
* `Rationale:` Proves routing's authoritative replay boundary: normal replay must reconstruct the historical route from stored artifacts, while any live recompute under changed conditions is diagnostic only.

### Contracts validated

* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Model Routing and Access replay rules and routing-snapshot dependencies
* Layer 2: Observability authoritative-vs-best-effort replay posture evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one historical run record already contains a stored `RoutingDecision` that selected `target_historical_a`.
* Seeded policy rules: historical policy and config snapshots remain retrievable even though current live catalog or health inputs have changed.
* Seeded memory and retrieval stores: not material.
* Selected model mode: not material because the scenario focuses on replaying routing evidence.
* Selected tool implementations: none.
* Expected capability set: same as the historical run.
* Execution-space posture: same as the historical run.
* Approval or replay fixtures: historical selection snapshot refs, changed live health or pricing fixtures that would now prefer `target_live_b`, normal replay mode, and optional diagnostic best-effort recompute mode.

### Given / When / Then

Given a completed historical run has stored routing artifacts and current live routing conditions have drifted,
When replay reconstructs the historical model step in normal authoritative mode,
Then it reuses the stored `RoutingDecision` rather than recalculating a new live route, and any optional live recompute is clearly marked best-effort rather than authoritative.

### Required assertions

`Required fixtures:`

* The historical `RoutingDecision` and referenced snapshots are retrievable.
* The live catalog or health inputs differ enough that a fresh route would choose another target.
* Normal replay mode is distinct from diagnostic live-recompute mode.

`Required observability artifacts:`

* Replay request artifact declaring authoritative historical mode.
* Read-path evidence showing replay reused stored routing artifacts.
* If diagnostic recompute is enabled, separate evidence marking it as best-effort and non-authoritative.

`Required replay artifacts:`

* Historical `RoutingDecision`, selection snapshot ref, and budget-envelope ref where applicable.
* Replay reconstruction artifact showing stored-route reuse.
* Optional best-effort recompute artifact clearly separated from the authoritative replay chain.

`Pass/fail oracle:`

* Normal replay must preserve the historical route even when live inputs changed; any live recompute must never masquerade as the authoritative historical decision.

### Required harness capabilities

* Historical routing-artifact store
* Replay verifier
* Live-catalog drift fixture
* Route-explanation materializer
* Trace collector

### Open questions / contract gaps

* None

## Scenario 14

### Scenario summary

* `Title:` Run-level routing overrides may narrow choices but must not widen upstream restrictions
* `Risk level:` High
* `Rationale:` Proves configuration-precedence enforcement: a run may request a narrower subset or tighter cost cap, but it must not silently expand beyond higher-precedence system, scope, or agent restrictions.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Model Routing and Access configuration precedence and effective-candidate derivation
* Layer 2: Agent Runtime run-level override propagation into routing
* Layer 2: Observability effective configuration snapshot and target-selection lineage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: system or collaborative-scope allowlist permits only `target_basic_a` and `target_basic_b`; provider denylist excludes `target_premium_x`; route profile `rp_general_text` would otherwise include all three.
* Seeded policy rules: the higher-precedence allowlist and denylist are active and replay-visible.
* Seeded memory and retrieval stores: not material.
* Selected model mode: ordinary text generation.
* Selected tool implementations: none.
* Expected capability set: plain text generation.
* Execution-space posture: none required.
* Approval or replay fixtures: one run-level override requests preferred targets `{target_basic_b, target_premium_x}` and applies a tighter cost cap than the agent default.

### Given / When / Then

Given upstream configuration restricts the effective target set to `target_basic_a` and `target_basic_b`,
When a run-level override requests the narrower subset that includes allowed `target_basic_b` plus disallowed `target_premium_x`,
Then routing must compute the effective candidate set as the intersection of upstream restrictions and run-level narrowing, apply the tighter run-level cost posture, and never treat `target_premium_x` as eligible.

### Required assertions

`Required fixtures:`

* The higher-precedence allowlist and denylist are both present in the configuration snapshot.
* The run-level override includes one allowed target and one upstream-disallowed target.
* `target_basic_b` remains eligible under the tighter run-level cost posture so the scenario proves narrowing without widening.

`Required observability artifacts:`

* Effective configuration snapshot showing the precedence chain and resulting candidate set.
* Candidate-summary evidence showing `target_premium_x` excluded by upstream restrictions before ranking.
* Final `RoutingDecision` selecting `target_basic_b`.

`Required replay artifacts:`

* System or scope config refs, route-profile ref, and run-override artifact.
* Effective route-explanation artifact showing intersection semantics.
* Stored route decision and candidate-summary ref.

`Pass/fail oracle:`

* Run-level overrides may remove choices or tighten budgets, but they must never widen access beyond upstream restrictions; if the disallowed premium target becomes eligible, the scenario fails.

### Required harness capabilities

* Configuration precedence fixture service
* Deterministic routing fixture service
* Route-explanation materializer
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module coverage map

* Core planning and selection coverage: Scenarios 1, 2, 3, and 14
* Continuity and delegated-access coverage: Scenarios 4, 6, and 10
* Failover and drift coverage: Scenarios 5, 11, and 12
* Hard-filter and terminal-error coverage: Scenarios 7, 8, 9, 10, 11, and 12
* Replay and audit-lineage coverage: Scenarios 1, 3, 5, 6, 13, and 14
