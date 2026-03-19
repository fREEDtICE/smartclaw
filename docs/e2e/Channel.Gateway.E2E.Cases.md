# Channel Gateway E2E Cases

This document proposes thirteen deterministic E2E scenarios for the Channel Gateway subsystem.
It covers both end-to-end user journeys and module black-box flows driven through the Channel Gateway contract surface and its adjacent seams with Identity and Thread Management, Agent Runtime, Policy and Approval, and Observability.

The suite follows the Layer 1 > Layer 1.5 > Layer 2 hierarchy and uses the deterministic integration lab posture from the E2E RFC:

* synthetic webhook and polling channel drivers
* seeded identity, thread, collaborative-scope, policy, and configuration fixtures where the flow proceeds past ingress
* recorded model decisions where runtime participates in the journey
* lab-backed payload capture, attachment fetch, receipt, callback, and provider-lookup fixtures
* trace, checkpoint, delivery, and replay capture for every meaningful gateway action

## Suite structure

### User-journey scenarios

1. webhook chat message becomes one canonical run and one delivered reply
2. polling email with partial attachment failure still becomes a runnable inbound interaction
3. attachment-bearing outbound email reply is validated, authorized, and delivered
4. streaming chat reply emits chunk UX signals but finalizes one authoritative outbound result

### Module black-box scenarios

5. duplicate inbound retry is suppressed before identity or runtime work is duplicated
6. failed provider authentication blocks runnable forwarding
7. webhook and polling paths normalize the same provider event into the same canonical contract
8. attachment-only inbound event with no usable attachment refs becomes `unsupported_event`
9. route-mismatched or expired delivery authorization is rejected before provider send
10. non-streaming route rejects streaming delivery before provider send
11. mandatory raw payload capture failure fails closed instead of degrading replay silently
12. uncertain outbound send timeout uses idempotent recovery instead of blind resend
13. callback or receipt mismatch records an anomaly and avoids silent delivery-state mutation

## User-journey scenarios

## Scenario 1

### Scenario summary

* `Title:` Webhook chat message becomes one canonical run and one delivered reply
* `Risk level:` Medium
* `Rationale:` Proves the baseline Channel Gateway happy path end to end: authenticated webhook ingress becomes one immutable canonical inbound envelope, the inbound event links deterministically into identity and runtime work, provider egress is policy-authorized before send, and final delivery evidence remains replay-visible and attributable to the original inbound event.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway authenticated webhook ingress, canonical `InboundPlatformEvent` and `InboundMessageEnvelope` construction, outbound `Send`, and delivery-receipt capture
* Layer 2: Identity and Thread Management `InboundMessageEnvelope -> InboundResolutionResult -> RuntimeStartEnvelope -> PreRunEnvelope`
* Layer 2: Agent Runtime standard run-start path and provider-egress request handoff
* Layer 2: Policy and Approval provider-egress decision plus runtime-issued exact-bound `DeliveryAuthorization`
* Layer 2: Observability required gateway spans, delivery evidence, `RunTimeline`, `ExecutionGraph`, and replay-manifest completeness

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_channel_webhook`, one open canonical thread `thread_channel_webhook`, one active collaborative scope `scope_channel_chat`, and deterministic system/channel config with `verifyProviderSignatures = true`, `preserveRawProviderPayloads = true`, and streaming disabled for this route.
* Seeded policy rules: allow one exact provider-egress decision for the resolved same-thread reply route; deny route changes and attachment or streaming expansion for this run.
* Seeded memory and retrieval stores: both stores exist and are empty so the journey proves Channel Gateway behavior without memory or RAG interference.
* Selected model mode: recorded model adapter mode with one model-only completion and one final output artifact.
* Selected tool implementations: none invoked.
* Expected capability set: no model-visible tool, skill, or subagent capability is needed; the relevant executable capability is the channel capability profile for non-streaming chat egress.
* Execution-space posture: no execution-space-backed action is requested; any `executionSpaceId` remains absent or lineage-only.
* Approval or replay fixtures: webhook signature fixture, raw payload artifact store, outbound provider receipt simulator, trace collector, and replay verifier.

### Given / When / Then

Given a signed inbound chat webhook from a verified provider account on an existing provider thread and a recorded model fixture that returns a direct final answer,
When the Channel Gateway verifies the signature, records a dedupe miss, captures the raw inbound provider payload, emits one `InboundPlatformEvent` plus one immutable `InboundMessageEnvelope`, Identity and Thread Management returns `resolutionDisposition = "start_run"`, Agent Runtime creates the run and final output, Policy and Approval returns an `allow` decision for provider egress, runtime issues an exact-bound `DeliveryAuthorization`, and the Channel Gateway sends the outbound reply and later reconciles the provider receipt,
Then the platform produces exactly one canonical run and one outbound delivery result that remain linked to the original `inboundEventId`.

### Required assertions

`Required fixtures:`

* The webhook signature fixture validates the inbound request successfully.
* The verified channel account remains linked to `user_channel_webhook`.
* The route capability profile supports outbound delivery but not streaming for this scenario.
* The recorded model fixture returns the expected final response without tool or subagent requests.

`Required observability artifacts:`

* `channel.ingress_receive`, `channel.ingress_dedupe`, `channel.normalize`, `channel.outbound_validate`, `channel.outbound_send`, and `channel.delivery_callback` spans.
* Raw inbound provider payload ref with `direction = inbound` and capture posture metadata.
* Canonical `InboundPlatformEvent` and `InboundMessageEnvelope` refs.
* Identity resolution record, thread resolution record, and runtime start evidence carrying the same `inboundEventId`.
* Policy decision ref, runtime-issued `DeliveryAuthorization`, outbound `OutboundDeliveryRequest`, `DeliveryResult`, and receipt ref.
* `RunTimeline`, `ExecutionGraph`, and `RunSummary` views linking inbound event, run, and outbound delivery.

`Required replay artifacts:`

* Raw inbound and outbound provider payload refs where policy permits capture.
* Immutable canonical inbound envelope ref.
* Final output ref, policy snapshot ref, decision ref, and `DeliveryAuthorization` ref.
* Outbound delivery request and result refs with provider message key or equivalent receipt.
* Replay manifest with authoritative posture for the run and explicit linkage to the outbound delivery record.

`Pass/fail oracle:`

* One `InboundMessageEnvelope`, one run, and one outbound send exist for the inbound event; provider send occurs only after a replay-visible egress decision and exact-bound authorization; and replay-visible evidence links the final delivery state back to the originating `inboundEventId`.

### Required harness capabilities

* Synthetic webhook chat driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy fixture service for provider egress
* Raw payload artifact store fixture
* Provider receipt and callback simulator
* Trace collector, run-view materializer, and replay verifier

### Open questions / contract gaps

* None

## Scenario 2

### Scenario summary

* `Title:` Polling email with partial attachment failure still becomes a runnable inbound interaction
* `Risk level:` Medium
* `Rationale:` Proves the documented attachment-degradation path on polling ingress: the gateway preserves raw provider evidence, emits placeholder attachment lineage when text remains usable, and still produces a canonical inbound envelope that downstream systems can process deterministically.

### Contracts validated

* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Channel Gateway polling ingress, attachment normalization, placeholder handling, and canonical `InboundMessageEnvelope` emission
* Layer 2: Identity and Thread Management canonical inbound-envelope consumption
* Layer 2: Agent Runtime standard no-tool response path after degraded but runnable ingress
* Layer 2: Observability attachment-resolution, payload-capture, and replay-evidence requirements

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified email user `user_channel_email`, one open canonical thread `thread_channel_email`, one active collaborative scope `scope_channel_email`, and deterministic system/channel config with `supportsPollingIngress = true`, `preserveRawProviderPayloads = true`, and attachment fetch enabled.
* Seeded policy rules: allow the normal final email reply route for the resolved thread; no attachment-bearing outbound egress is requested in this scenario.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: recorded model adapter mode with one direct answer acknowledging the inbound message contents.
* Selected tool implementations: none invoked.
* Expected capability set: no runtime tool capability is needed; the relevant gateway capability is inbound attachment support on the polling channel.
* Execution-space posture: none required.
* Approval or replay fixtures: polling cursor fixture, attachment fetch simulator with one deterministic timeout, payload artifact store, and replay verifier.

### Given / When / Then

Given a polling batch containing one email-style inbound message with usable text plus two attachments, where one attachment resolves successfully and the other times out during provider fetch,
When the Channel Gateway polls the provider, records a dedupe miss, captures the raw provider payload, normalizes the message body, emits one resolved `AttachmentRef` plus one placeholder `AttachmentNormalizationResult`, and forwards the canonical `InboundMessageEnvelope` to identity and runtime,
Then downstream execution still starts normally on the canonical inbound envelope and the run completes, while replay-visible attachment lineage shows exactly which attachment was resolved and which one degraded to a placeholder.

### Required assertions

`Required fixtures:`

* The polling fixture returns one deterministic batch containing the seeded provider message.
* The inbound message body remains usable even if one attachment fetch fails.
* One attachment fetch succeeds and one deterministically times out.
* The resolved thread remains `thread_channel_email`.

`Required observability artifacts:`

* `channel.ingress_receive`, `channel.ingress_dedupe`, `channel.normalize`, and `channel.attachment_resolve` spans.
* Raw inbound provider payload ref plus attachment metadata refs where applicable.
* One `InboundPlatformEvent` and one `InboundMessageEnvelope`.
* Attachment normalization records showing one `status = resolved` and one `status = placeholder`.
* Identity resolution, thread resolution, runtime lifecycle, and final output evidence for the resulting run.

`Required replay artifacts:`

* Raw inbound payload ref and canonical inbound envelope ref.
* Attachment refs and normalization-outcome refs preserving provider lineage.
* Model input and output refs for the single final-response step.
* Replay manifest or downstream run-start evidence showing the canonical envelope was sufficient even with degraded attachment fidelity.

`Pass/fail oracle:`

* The inbound interaction remains runnable, exactly one canonical envelope reaches downstream systems, the placeholder attachment remains replay-visible instead of disappearing silently, and the final run completes without inventing missing attachment content.

### Required harness capabilities

* Synthetic polling email driver
* Attachment fetch and timeout injector
* Identity and thread fixture service
* Recorded model adapter mode
* Raw payload and attachment artifact store fixtures
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 3

### Scenario summary

* `Title:` Attachment-bearing outbound email reply is validated, authorized, and delivered
* `Risk level:` Medium
* `Rationale:` Proves the governed outbound attachment happy path: the gateway accepts only an exact-bound authorization, validates attachment capability limits before send, preserves replay-visible outbound evidence, and records a final delivery state with receipt lineage.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway `Send`, attachment validation, receipt tracking, and outbound payload preservation
* Layer 2: Agent Runtime final-output handoff into `OutboundDeliveryRequest`
* Layer 2: Policy and Approval provider-egress decision plus exact-bound authorization with `allowAttachments = true`
* Layer 2: Observability outbound validation, send, receipt, and replay-manifest evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified email user `user_channel_attachment_reply`, one open canonical thread `thread_channel_attachment_reply`, one active collaborative scope `scope_channel_attachment_reply`, and deterministic config with outbound attachments enabled for this email-capable route and conservative size limits that the seeded attachment satisfies.
* Seeded policy rules: allow one exact outbound email reply to the existing route with one attachment and deny route change, streaming, or additional attachments.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: recorded model adapter mode that produces one final response artifact plus one seeded outbound attachment ref.
* Selected tool implementations: none invoked.
* Expected capability set: the relevant executable capability is the channel capability profile advertising attachments on the resolved route.
* Execution-space posture: none required.
* Approval or replay fixtures: provider receipt simulator, outbound payload capture store, and replay verifier.

### Given / When / Then

Given an inbound email thread where runtime has produced a final textual reply plus one attachment artifact that fits the route capability profile,
When Policy and Approval returns an `allow` decision for the exact email reply request, runtime issues a `DeliveryAuthorization` with `allowAttachments = true`, the Channel Gateway validates the route, attachment count, and attachment size before provider send, and the provider returns a message key and delivery receipt,
Then the gateway delivers the email exactly once with the approved attachment and records replay-visible outbound request, receipt, and final delivery-state evidence.

### Required assertions

`Required fixtures:`

* The seeded attachment artifact exists and remains within the configured count and size limits.
* The capability profile for the email route advertises `supportsAttachments = true`.
* The authorization is bound to the exact route, thread, delivery mode, and reply target.
* The provider receipt simulator returns a deterministic message key and receipt ref.

`Required observability artifacts:`

* `channel.outbound_validate` and `channel.outbound_send` spans plus any receipt-update span.
* Outbound capability profile ref or snapshot-visible capability evidence used at validation time.
* Policy decision ref and exact-bound `DeliveryAuthorization`.
* `OutboundDeliveryRequest`, outbound provider payload ref, `DeliveryResult`, provider message key, and receipt ref.
* Run and delivery views linking the final output artifact to the outbound delivery record.

`Required replay artifacts:`

* Final output ref and outbound attachment artifact ref.
* Policy snapshot ref, decision ref, and `DeliveryAuthorization` ref.
* Outbound provider payload ref, delivery request ref, result ref, and receipt ref.
* Replay manifest or delivery record proving the outbound attachment send path is reconstructable without live re-send.

`Pass/fail oracle:`

* One outbound delivery occurs after an exact-bound authorization, the delivered attachment matches the authorized artifact set and capability limits, and the final delivery record remains replay-visible with provider receipt lineage.

### Required harness capabilities

* Synthetic inbound and outbound email driver
* Identity and thread fixture service
* Recorded model adapter mode
* Policy fixture service for provider egress with attachment bounds
* Outbound payload artifact store
* Provider receipt simulator
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 4

### Scenario summary

* `Title:` Streaming chat reply emits chunk UX signals but finalizes one authoritative outbound result
* `Risk level:` Medium
* `Rationale:` Proves the streaming-delivery contract: stream chunks are allowed only on a route and authorization that both permit streaming, chunk evidence remains non-authoritative, and the explicit finalize path seals the single authoritative outbound result for replay and observability.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 2: Channel Gateway `OpenStream`, `AppendStream`, `FinalizeStream`, and stream-session tracking
* Layer 2: Agent Runtime streaming output as non-authoritative side channel plus final output artifact
* Layer 2: Policy and Approval provider-egress decision with `allowStreaming = true`
* Layer 2: Observability stream-open, chunk, finalize, and final-authoritative-output evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_channel_stream`, one open canonical thread `thread_channel_stream`, one active collaborative scope `scope_channel_stream`, and deterministic channel config with `allowStreamingDelivery = true` for the seeded route.
* Seeded policy rules: allow one exact outbound streaming reply on the resolved route and deny any attachment expansion or route change.
* Seeded memory and retrieval stores: both stores exist and are empty.
* Selected model mode: recorded streaming runtime fixture that emits three deterministic chunk payloads followed by one final output artifact.
* Selected tool implementations: none invoked.
* Expected capability set: no tool or skill capability is needed; the relevant executable capability is chat-route streaming support.
* Execution-space posture: none required.
* Approval or replay fixtures: stream-capable provider driver, stream-session simulator, outbound payload store, and replay verifier.

### Given / When / Then

Given an inbound chat turn that runtime answers through a streaming-capable route with one final output artifact and three deterministic incremental chunks,
When Policy and Approval returns an `allow` decision for streaming egress, runtime issues a `DeliveryAuthorization` with `allowStreaming = true`, the Channel Gateway opens one `StreamDeliverySession`, accepts three `StreamChunkRequest` values tied to the current `stepId`, and then receives one `StreamFinalizeRequest` carrying the final output ref,
Then the user sees incremental chunk delivery as non-authoritative UX signals, but replay and delivery-state authority attach only to the explicit finalize result and any terminal provider receipt.

### Required assertions

`Required fixtures:`

* The route capability profile advertises `supportsStreaming = true`.
* The authorization explicitly permits streaming for this exact route and delivery mode.
* The streaming fixture emits deterministic chunk ordering and a deterministic final output artifact.
* No attachment or route mutation is requested during the session.

`Required observability artifacts:`

* `channel.stream_open`, `channel.stream_chunk`, `channel.stream_finalize`, and `channel.outbound_send` or equivalent final-send spans.
* One `StreamDeliverySession` ref plus chunk acknowledgements keyed by `streamSessionId`, `chunkIndex`, and `stepId`.
* Policy decision ref and exact-bound `DeliveryAuthorization`.
* Final output ref, `DeliveryResult`, and provider receipt or final provider message key.
* Run and delivery views showing chunk events as non-authoritative and finalization as authoritative.

`Required replay artifacts:`

* Stream-session ref and ordered chunk refs marked as non-authoritative or best-effort replay data.
* Final output ref and `FinalizeStream` result ref as authoritative outbound evidence.
* Policy snapshot ref, decision ref, and streaming authorization ref.
* Replay manifest or delivery record that distinguishes chunk evidence from the final committed outbound result.

`Pass/fail oracle:`

* Streaming occurs only after an authorization and capability profile that both permit it, chunk evidence remains non-authoritative, and exactly one finalized outbound result becomes the authoritative delivery state for replay.

### Required harness capabilities

* Synthetic streaming chat driver
* Identity and thread fixture service
* Recorded streaming runtime fixture
* Policy fixture service for streaming egress
* Stream-session and receipt simulator
* Outbound payload artifact store
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module black-box scenarios

## Scenario 5

### Scenario summary

* `Title:` Duplicate inbound retry is suppressed before identity or runtime work is duplicated
* `Risk level:` High
* `Rationale:` Proves the most important ingress safety boundary: duplicate webhook retries or repeated poll reads must not create duplicate canonical inbound interactions, duplicate thread work, or duplicate run-start side effects.

### Contracts validated

* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway inbound dedupe before downstream forwarding and replay-visible dedupe decisions
* Layer 2: Identity and Thread Management duplicate-inbound handling expectation that prior resolution results are reused when safe
* Layer 2: Agent Runtime deduplicated inbound start expectation where configured
* Layer 2: Observability dedupe-hit evidence and causal linkage to prior canonical refs

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one verified chat user `user_channel_dedupe`, one open thread `thread_channel_dedupe`, one active collaborative scope `scope_channel_dedupe`, and deterministic config with a replay-visible inbound dedupe window active for the seeded provider.
* Seeded policy rules: normal reply policy exists for the original first delivery, but the duplicate retry should not reach a fresh policy or runtime start path.
* Seeded memory and retrieval stores: both stores exist and are unused.
* Selected model mode: not used for the duplicate retry itself because the scenario stops before a second runtime start.
* Selected tool implementations: none invoked.
* Expected capability set: not applicable; the key gateway capability is dedupe before downstream work.
* Execution-space posture: none required.
* Approval or replay fixtures: one previously accepted canonical inbound event already stored, plus a second identical webhook or polling delivery carrying the same dedupe inputs.

### Given / When / Then

Given one provider event has already been accepted, normalized, and linked to prior canonical ids, and the provider sends the same event again within the configured dedupe window,
When the Channel Gateway receives the retry, computes the same dedupe inputs, detects a dedupe hit before downstream forwarding, and returns or references the previously created canonical ids,
Then no new `InboundMessageEnvelope`, identity-resolution path, runtime start, or outbound reply is created for the duplicate retry.

### Required assertions

`Required fixtures:`

* The second delivery matches the first on provider, event kind, provider message or event identity, and provider workspace namespace where applicable.
* The original canonical event and any downstream run already exist in fixture storage.
* The dedupe window remains active for the second arrival.

`Required observability artifacts:`

* One original ingress record set and one duplicate-attempt record.
* A dedupe decision or equivalent observable evidence marking the second arrival as suppressed.
* Trace evidence showing the second path stops before canonical runnable forwarding.
* Prior canonical refs returned or linked where the contract allows.

`Required replay artifacts:`

* Original raw inbound payload ref and canonical envelope ref.
* Replay-visible dedupe metadata for the suppressed retry, including the prior canonical ids when available.
* Absence of any second runnable canonical envelope or second run-start artifact.

`Pass/fail oracle:`

* The first arrival remains authoritative, the retry produces zero new runnable downstream artifacts, and the gateway records the dedupe hit with linkage to the prior canonical ids.

### Required harness capabilities

* Synthetic webhook and polling retry drivers
* Fixture store seeded with an original canonical inbound event
* Dedupe-window and idempotency-key fixture controls
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 6

### Scenario summary

* `Title:` Failed provider authentication blocks runnable forwarding
* `Risk level:` High
* `Rationale:` Proves the edge-security fail-closed rule: spoofed or unauthenticated inbound traffic must never become a runnable canonical inbound interaction.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `State Must Be Recoverable`
* Layer 2: Channel Gateway provider-auth or trust-classification boundary and ingress rule that authentication failures stop runnable forwarding
* Layer 2: Observability security-visible ingress evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: no canonical user or thread is resolved because the scenario stops before identity; deterministic system/channel config sets `verifyProviderSignatures = true` for the seeded webhook route.
* Seeded policy rules: none beyond the configured ingress trust requirement because the event must not proceed to policy-evaluated downstream side effects.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: webhook request with an invalid signature or token and a trace collector that records ingress failure evidence.

### Given / When / Then

Given an inbound webhook request for a route that requires signature verification and a deterministic fixture that makes the signature invalid,
When the Channel Gateway authenticates or trust-classifies the source and the check fails,
Then the gateway rejects runnable forwarding and records security-visible ingress failure evidence without emitting a runnable canonical inbound envelope.

### Required assertions

`Required fixtures:`

* Signature verification is mandatory for the seeded route.
* The signature or token fixture is invalid in a deterministic way.
* No prior canonical event exists for this request.

`Required observability artifacts:`

* `channel.ingress_receive` span and a security-visible auth-failure log or event.
* Trace evidence that normalization and downstream forwarding do not proceed as a runnable path.
* Operator-visible failure metadata keyed to the ingress attempt.

`Required replay artifacts:`

* Failure evidence sufficient to explain why the request was rejected.
* Explicit absence of a runnable `InboundPlatformEvent` or `InboundMessageEnvelope`.

`Pass/fail oracle:`

* No runnable canonical inbound artifact is emitted, no identity or runtime work begins, and the failed authentication remains visible to operators and audit tooling.

### Required harness capabilities

* Synthetic webhook driver with signature controls
* Ingress auth validator fixture
* Trace collector and security-event sink

### Open questions / contract gaps

* `contract gap:` The Channel Gateway design requires authentication failure to stop runnable forwarding and to emit security-visible evidence, but it does not specify whether failed-auth raw request bodies must be retained by reference, hashed only, or discarded entirely.

## Scenario 7

### Scenario summary

* `Title:` Webhook and polling paths normalize the same provider event into the same canonical contract
* `Risk level:` Medium
* `Rationale:` Proves the transport-neutral normalization requirement: webhook and polling ingress must converge on the same canonical event and message-envelope shape for equivalent provider traffic.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway `ReceiveWebhook` and `Poll` convergence on one canonical normalization contract and replay-visible dedupe inputs
* Layer 2: Identity and Thread Management stable inbound-envelope consumption contract
* Layer 2: Observability path-specific ingress evidence plus common canonical artifacts

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: no canonical user or thread is required because the comparison stops at the gateway boundary; two isolated ingress fixture namespaces use identical system/channel config and identical provider capability profiles.
* Seeded policy rules: none because the scenario stops before runtime and provider egress.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: one provider event fixture rendered once as a webhook request and once as a polling batch item in isolated namespaces so dedupe does not suppress the comparison lane.

### Given / When / Then

Given one logical provider message fixture is presented once through `ReceiveWebhook` and once through `Poll` in separate isolated test namespaces,
When the Channel Gateway processes both paths under the same provider/channel configuration,
Then both paths emit the same canonical `InboundPlatformEvent` and `InboundMessageEnvelope` fields except for the documented `ingressSource` distinction, and they compute equivalent replay-visible dedupe inputs for the same logical event.

### Required assertions

`Required fixtures:`

* The webhook and polling fixtures carry equivalent provider message identity, thread identity, workspace identity, and normalized content.
* The two executions run in isolated namespaces so the comparison measures normalization rather than dedupe suppression.
* Attachment posture and payload-capture configuration are identical across both lanes.

`Required observability artifacts:`

* One webhook ingress trace set and one polling ingress trace set.
* Canonical event refs and message-envelope refs for both lanes.
* Explicit `ingressSource` values distinguishing `webhook` and `polling`.
* Comparable dedupe metadata or idempotency fields for both lanes.

`Required replay artifacts:`

* Raw inbound payload refs for both lanes.
* Canonical inbound-event and message-envelope refs for both lanes.
* Field-level comparison evidence showing canonical equivalence except for documented path metadata.

`Pass/fail oracle:`

* Webhook and polling produce the same runnable canonical contract for the same logical provider message, with no path-specific drift beyond the documented `ingressSource` distinction.

### Required harness capabilities

* Synthetic webhook driver
* Synthetic polling driver
* Isolated fixture namespaces or databases
* Canonical-artifact comparator
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 8

### Scenario summary

* `Title:` Attachment-only inbound event with no usable attachment refs becomes `unsupported_event`
* `Risk level:` Medium
* `Rationale:` Proves the documented non-runnable attachment boundary: when no text exists and no usable attachment refs can be produced, the gateway must not fabricate runnable user content.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway attachment degradation rule for attachment-only messages and `unsupported_event` classification
* Layer 2: Observability unsupported-event audit evidence and attachment-failure lineage

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: no canonical user or thread is required because the event should remain non-runnable; deterministic channel config supports inbound attachments and raw payload preservation.
* Seeded policy rules: none because the event must not proceed to runtime or provider egress.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: inbound provider payload with no usable text and deterministic attachment fetch failures for every attachment.

### Given / When / Then

Given an inbound provider event whose user-visible content is attachment-only and every attachment fetch fails or remains unsupported,
When the Channel Gateway captures the raw provider payload, attempts attachment normalization, and determines that no usable attachment refs can be produced,
Then it records the event as `unsupported_event` for audit and observability and does not emit a runnable `InboundMessageEnvelope`.

### Required assertions

`Required fixtures:`

* The inbound content contains no usable text or subject that could carry user intent independently.
* All attachment normalization attempts deterministically fail or return `unsupported`.
* Raw payload capture succeeds so the unsupported classification remains auditable.

`Required observability artifacts:`

* `channel.normalize` and `channel.attachment_resolve` spans.
* Raw inbound provider payload ref.
* `InboundPlatformEvent` or equivalent canonical audit record classified as `unsupported_event`.
* Attachment normalization records showing no usable attachment refs were produced.
* Explicit absence of any runnable `InboundMessageEnvelope`.

`Required replay artifacts:`

* Raw inbound payload ref and unsupported-event record.
* Attachment normalization-outcome refs for all attempted attachments.
* Evidence that no runnable downstream ingress artifact was emitted.

`Pass/fail oracle:`

* The event remains auditable and replay-visible, but no runnable canonical message is fabricated and no downstream run-start path begins.

### Required harness capabilities

* Synthetic inbound channel driver
* Attachment failure injector
* Raw payload artifact store
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 9

### Scenario summary

* `Title:` Route-mismatched or expired delivery authorization is rejected before provider send
* `Risk level:` High
* `Rationale:` Proves the outbound governance boundary: the gateway must verify exact-bound authorization locally and must not broaden or reinterpret an authorization into a different route, recipient, or still-expired send.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Identity Must Be Propagated`
* Layer 2: Channel Gateway local authorization verification and fail-closed outbound validation
* Layer 2: Policy and Approval exact-bound decision and authorization semantics for provider egress
* Layer 2: Observability outbound-validation failure evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one resolved user `user_channel_bad_auth`, one thread `thread_channel_bad_auth`, one collaborative scope `scope_channel_bad_auth`, and deterministic outbound route config for a chat provider.
* Seeded policy rules: one prior `allow` decision exists only for a different route or an earlier unexpired window; the request under test presents either a route-mismatched authorization or an expired authorization.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the scenario begins at `Send`.
* Selected tool implementations: none.
* Expected capability set: the route itself supports outbound delivery, so failure must come from authorization mismatch rather than capability absence.
* Execution-space posture: none required.
* Approval or replay fixtures: one malformed or stale `DeliveryAuthorization`, one outbound request fixture, and a provider adapter spy that would detect any forbidden send attempt.

### Given / When / Then

Given an `OutboundDeliveryRequest` whose route is otherwise valid but whose `DeliveryAuthorization` is expired or bound to a different route hash,
When the Channel Gateway performs local outbound validation,
Then it rejects the send before any provider call and records replay-visible evidence that authorization was missing, expired, or mismatched for the concrete outbound context.

### Required assertions

`Required fixtures:`

* The route itself is syntactically valid and send-capable.
* The authorization fixture is deterministically expired or route-mismatched.
* The provider adapter spy starts empty and records any accidental send attempt.

`Required observability artifacts:`

* `channel.outbound_validate` span and explicit validation-failure evidence.
* Outbound request ref and rejected authorization ref.
* Reason codes or normalized error indicating expiration or route mismatch.
* Explicit absence of a provider send span or outbound provider payload ref.

`Required replay artifacts:`

* Outbound request ref.
* Authorization ref plus rejection record explaining why it was unenforceable.
* Evidence that no outbound provider interaction was committed.

`Pass/fail oracle:`

* The gateway rejects the request locally, the provider adapter spy records zero sends, and replay-visible evidence shows the authorization failure rather than any downstream provider behavior.

### Required harness capabilities

* Synthetic outbound provider driver with send spy
* Authorization-fixture generator
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 10

### Scenario summary

* `Title:` Non-streaming route rejects streaming delivery before provider send
* `Risk level:` Medium
* `Rationale:` Proves explicit capability enforcement on egress: the gateway must reject a streaming request when the route capability profile does not support streaming, even if upstream content generation could otherwise proceed.

### Contracts validated

* Layer 1.5: `Exposed Capabilities Must Be Executable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Policy First`
* Layer 2: Channel Gateway capability-profile validation for `OpenStream` and explicit failure on unsupported streaming
* Layer 2: Policy and Approval exact-bound egress decision that still does not override route capability constraints
* Layer 2: Observability outbound-validation failure evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one resolved user `user_channel_capability_mismatch`, one thread `thread_channel_capability_mismatch`, one collaborative scope `scope_channel_capability_mismatch`, and deterministic channel config for a route with `supportsStreaming = false`.
* Seeded policy rules: the provider-egress policy decision may allow the exact route, but the route capability profile itself does not permit streaming.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the scenario begins at `OpenStream`.
* Selected tool implementations: none.
* Expected capability set: the effective route capability profile excludes streaming.
* Execution-space posture: none required.
* Approval or replay fixtures: one `OutboundDeliveryRequest` and `DeliveryAuthorization` that request streaming, plus a provider adapter spy.

### Given / When / Then

Given an otherwise valid outbound request that asks the Channel Gateway to open a stream on a route whose capability profile declares `supportsStreaming = false`,
When the gateway validates the request and capability profile,
Then it rejects the streaming path explicitly before provider send instead of pretending the route can stream or silently degrading into an undocumented behavior.

### Required assertions

`Required fixtures:`

* The route capability profile is snapshot-visible and sets `supportsStreaming = false`.
* The request explicitly asks for streaming so the mismatch is real rather than inferred.
* The provider adapter spy records any accidental stream-open or send call.

`Required observability artifacts:`

* `channel.outbound_validate` span and explicit capability-mismatch error or reason code.
* Capability profile ref or snapshot evidence used for the decision.
* Explicit absence of `channel.stream_open` or provider send activity.

`Required replay artifacts:`

* Streaming request ref, authorization ref, and capability profile ref.
* Rejection evidence showing that capability validation failed before provider interaction.

`Pass/fail oracle:`

* Streaming is rejected locally, no provider stream session is created, and the failure is attributable to a documented capability mismatch rather than ambiguous downstream behavior.

### Required harness capabilities

* Synthetic outbound provider driver with stream spy
* Capability-profile fixture service
* Authorization-fixture generator
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 11

### Scenario summary

* `Title:` Mandatory raw payload capture failure fails closed instead of degrading replay silently
* `Risk level:` High
* `Rationale:` Proves the replay-critical fail-closed rule for the gateway boundary: when higher-precedence configuration makes raw provider capture mandatory, the gateway must not continue with an under-specified payload ref or a silently degraded replay posture.

### Contracts validated

* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 1.5: `Configuration Must Be Predictable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 2: Channel Gateway payload-capture and evidence-handoff rules plus fail-closed behavior for mandatory capture
* Layer 2: Observability failure evidence and replay-critical persistence expectations

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: no canonical user or thread is required because the failure occurs before runnable forwarding; deterministic configuration sets `preserveRawProviderPayloads = true` at a higher-precedence layer and lower-precedence channel or run overrides do not disable it.
* Seeded policy rules: raw payload capture is mandatory for this route and scenario.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used.
* Selected tool implementations: none.
* Expected capability set: not applicable.
* Execution-space posture: none required.
* Approval or replay fixtures: valid inbound provider request plus an injected outage in the payload artifact store.

### Given / When / Then

Given a route whose higher-precedence configuration and policy posture make raw provider payload capture mandatory,
When the Channel Gateway receives a valid inbound request but payload capture fails because the artifact store is unavailable,
Then the gateway fails closed instead of emitting an under-specified payload ref, degraded runnable envelope, or silent replay downgrade.

### Required assertions

`Required fixtures:`

* The effective configuration snapshot shows raw payload capture is mandatory and not weakened by lower-precedence settings.
* The payload artifact store outage is deterministic and occurs before a valid payload ref can be committed.
* The request is otherwise valid so the failure is attributable to mandatory capture, not auth or normalization.

`Required observability artifacts:`

* Payload-capture failure evidence and config-snapshot lineage showing why fail-closed behavior was required.
* Trace evidence that runnable forwarding does not proceed after capture failure.
* Operator-visible failure metadata for the ingress attempt.

`Required replay artifacts:`

* Effective config snapshot ref or equivalent precedence evidence showing capture was mandatory.
* Failure evidence explaining why no replay-critical payload ref could be committed.
* Explicit absence of any under-specified provider payload ref or runnable canonical inbound envelope.

`Pass/fail oracle:`

* The gateway does not continue past the replay-critical capture boundary, no runnable ingress artifact is emitted, and the recorded evidence makes the fail-closed reason attributable to mandatory-capture policy and configuration.

### Required harness capabilities

* Synthetic inbound channel driver
* Layered configuration fixture service with snapshot refs
* Payload artifact store outage injector
* Trace collector and replay verifier

### Open questions / contract gaps

* `contract gap:` The design defines that mandatory payload-capture failure must fail closed, but it does not specify whether the gateway should persist a non-runnable canonical ingress-attempt record or rely only on logs, traces, and operator-visible failure metadata.

## Scenario 12

### Scenario summary

* `Title:` Uncertain outbound send timeout uses idempotent recovery instead of blind resend
* `Risk level:` High
* `Rationale:` Proves the gateway recovery rule at the provider boundary: when send success is uncertain after a timeout, recovery must rely on idempotent retry or provider lookup rather than a blind duplicate send.

### Contracts validated

* Layer 1.5: `Policy First`
* Layer 1.5: `State Must Be Recoverable`
* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway outbound idempotency, uncertain-send recovery, attempt history, and final-state recording
* Layer 2: Observability delivery-attempt and recovery evidence

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one resolved user `user_channel_uncertain_send`, one thread `thread_channel_uncertain_send`, one collaborative scope `scope_channel_uncertain_send`, and deterministic outbound config with bounded retry enabled.
* Seeded policy rules: allow the exact outbound delivery request under one valid authorization.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used because the scenario begins at `Send`.
* Selected tool implementations: none.
* Expected capability set: the route supports normal outbound delivery.
* Execution-space posture: none required.
* Approval or replay fixtures: one valid `OutboundDeliveryRequest`, one valid `DeliveryAuthorization`, one provider adapter that times out after an uncertain boundary, and one provider lookup or idempotent retry fixture.

### Given / When / Then

Given a valid outbound delivery request with a stable `deliveryId` or equivalent idempotency key,
When the Channel Gateway attempts provider send, the provider times out without a receipt after the request may already have crossed the provider boundary, and the gateway performs recovery through idempotent retry or provider lookup,
Then the gateway resolves the delivery using replay-visible attempt history without issuing a blind duplicate send.

### Required assertions

`Required fixtures:`

* The delivery request carries a stable idempotency key or `deliveryId`.
* The first provider attempt reaches an uncertain completion boundary before timeout.
* A provider lookup or idempotent retry path is available in deterministic lab mode.

`Required observability artifacts:`

* One initial outbound-send attempt record plus one recovery record.
* Attempt-history evidence on the delivery record rather than one overwritten final state.
* Explicit recovery metadata showing provider lookup or idempotent retry instead of blind resend.
* Final delivery-state evidence with any provider message key or terminal failure reason.

`Required replay artifacts:`

* Outbound request ref, authorization ref, and attempt-history refs.
* Timeout evidence for the uncertain first attempt.
* Lookup or idempotent retry evidence and final delivery result ref.

`Pass/fail oracle:`

* Recovery completes without a blind duplicate send, the delivery record preserves attempt history, and at most one provider-side message is attributable to the request.

### Required harness capabilities

* Synthetic outbound provider driver with uncertain-timeout mode
* Provider lookup or idempotent retry simulator
* Authorization-fixture generator
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Scenario 13

### Scenario summary

* `Title:` Callback or receipt mismatch records an anomaly and avoids silent delivery-state mutation
* `Risk level:` Medium
* `Rationale:` Proves the delivery-state integrity rule: a callback that cannot be mapped safely must not silently convert an existing delivery into a false success or false terminal state.

### Contracts validated

* Layer 1.5: `Execution Must Be Observable`
* Layer 1.5: `Deterministic Replay Must Be Supported`
* Layer 2: Channel Gateway callback reconciliation, anomaly recording, and final-state integrity
* Layer 2: Observability delivery-callback evidence and operator-review visibility

### Preconditions and fixtures

* Seeded user, thread, collaborative scope, and config: one resolved user `user_channel_callback_mismatch`, one thread `thread_channel_callback_mismatch`, one collaborative scope `scope_channel_callback_mismatch`, and deterministic outbound config with receipts enabled.
* Seeded policy rules: none beyond the already completed authorized send that produced the existing delivery record under test.
* Seeded memory and retrieval stores: not used.
* Selected model mode: not used.
* Selected tool implementations: none.
* Expected capability set: the route supports receipts and callbacks.
* Execution-space posture: none required.
* Approval or replay fixtures: one existing delivery record in a non-terminal or sent state plus one provider callback fixture whose identifiers do not map to the known delivery safely.

### Given / When / Then

Given an existing replay-visible delivery record and a later provider callback whose receipt identifiers cannot be mapped safely to that delivery,
When the Channel Gateway processes the callback,
Then it records an anomaly, preserves the callback evidence for audit and replay, and avoids silently mutating the delivery into an incorrect final state.

### Required assertions

`Required fixtures:`

* The existing delivery record is present before callback processing begins.
* The callback identifiers are deterministically mismatched or ambiguous.
* The provider route supports receipt callbacks in the normal path.

`Required observability artifacts:`

* `channel.delivery_callback` span and explicit anomaly record.
* Existing delivery record before and after callback processing.
* Callback payload ref or equivalent callback evidence where capture is allowed.
* Operator-visible marker that review may be required.

`Required replay artifacts:`

* Existing delivery record ref.
* Callback evidence ref and anomaly record.
* Evidence that no silent final-state mutation occurred.

`Pass/fail oracle:`

* The mismatch remains visible, the delivery record is not silently mutated into an incorrect terminal state, and replay-visible evidence preserves both the callback anomaly and the original delivery lineage.

### Required harness capabilities

* Synthetic provider callback driver
* Seeded delivery-record fixture
* Callback-mismatch injector
* Trace collector and replay verifier

### Open questions / contract gaps

* None

## Module coverage map

* Contract and happy-path coverage: Scenarios 1, 2, 3, 4, 7, 9, and 10
* Dedupe and idempotency coverage: Scenarios 5, 7, and 12
* Attachment coverage: Scenarios 2, 3, and 8
* Replay and observability coverage: Scenarios 1, 2, 3, 4, 11, 12, and 13
* Failure-injection and fail-closed coverage: Scenarios 5, 6, 8, 9, 10, 11, 12, and 13
