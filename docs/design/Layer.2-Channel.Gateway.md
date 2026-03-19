# SmartClaw Agent Platform — Layer 2

## Channel and Channel Gateway Design

Based on the platform architecture and contracts defined from the blueprint document.

**Language rule:** This document must remain language-neutral. It may define contract tables, field inventories, state models, and behavioral rules, but it must not define implementation-language interfaces or code snippets. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs after the Layer 2 design stabilizes.

---

## 1. Document Metadata

**Subsystem Name:** Channel Gateway  
**Document Version:** v1.0-draft  
**Status:** Draft  
**Owners:** Platform Channels Team  
**Related Docs:**

* Layer 1 Overview Architecture
* Layer 1.5 Cross-Cutting Contracts and System Invariants
* Identity and Thread Management
* Agent Runtime Subsystem Design
* Context Assembly Subsystem Design
* Policy and Approval System Design
* Observability, Replay, and Cost Control Design
* Sandbox / Execution Space Design

---

## 2. Purpose

The Channel Gateway is the platform subsystem that turns provider-specific inbound and outbound traffic into **canonical, replay-visible channel interactions**.

It exists because channel integration is not just transport glue.
The platform must support:

* webhook and polling-based ingress
* canonical normalization of messages, attachments, and provider metadata
* stable provider-neutral envelopes for downstream identity and runtime work
* outbound delivery, including streaming where supported
* provider payload preservation for replay and debugging
* deduplication, delivery-state tracking, and channel capability validation

This subsystem owns:

* provider adapters and channel capability profiles
* raw inbound and outbound payload capture
* canonical inbound envelope construction
* attachment reference normalization
* outbound delivery orchestration and receipt tracking

This subsystem does **not** own:

* identity resolution
* canonical thread resolution
* agent reasoning
* policy authoring
* memory or retrieval logic

It is the transport and canonicalization boundary between external channels and the rest of the platform.

This document intentionally defines subsystem design and contracts only. It does **not** include an implementation or rollout plan.

---

## 3. Scope

### In Scope

The Channel Gateway is responsible for:

* receiving inbound provider events through webhook or polling integrations
* validating provider authenticity where the channel supports signatures, tokens, or trusted credentials
* deduplicating repeated inbound deliveries and normalizing retry behavior
* capturing raw provider payloads as governed artifact refs
* normalizing actionable inbound messages into canonical envelopes
* normalizing attachment metadata and attachment storage refs
* classifying unsupported or non-actionable provider events without forwarding them as runtime inputs
* delivering outbound responses and notifications to providers
* supporting incremental streaming delivery where the target channel supports it
* recording outbound receipts, delivery states, and normalized delivery errors
* exposing stable channel capability metadata to upstream callers

### Out of Scope

The Channel Gateway does **not** own:

* deciding which user an inbound interaction belongs to
* deciding which canonical thread should receive an inbound interaction
* generating assistant content
* deciding whether an outbound response is allowed
* analyzing attachment meaning beyond canonical metadata extraction
* replay execution logic beyond preserving payloads and delivery evidence

This subsystem gets messages into and out of the platform safely.
It does not decide what the platform should do with them.

---

## 4. Architectural Role

The Channel Gateway sits at the system edge for inbound and outbound communication.

```text
Inbound Provider Event
  -> Channel Gateway
       -> provider auth / trust check
       -> dedupe
       -> raw payload capture
       -> message and attachment normalization
       -> canonical inbound envelope
  -> Identity and Thread Management
  -> Agent Runtime

Agent Runtime / approved system workflow
  -> Channel Gateway
       -> route and capability validation
       -> provider-specific render and send
       -> stream management where supported
       -> receipt capture and delivery-state updates
  -> external channel
```

### Upstream inputs

* raw provider webhook requests
* polling cursors and provider event batches
* attachment metadata and provider fetch handles
* outbound delivery requests from runtime or other explicitly approved internal callers
* delivery authorization envelopes or refs and route metadata
* channel configuration and capability constraints

### Downstream outputs

* canonical inbound envelopes for identity and thread resolution
* ignored or unsupported event records for audit and observability
* outbound delivery results and receipt refs
* provider payload refs for replay and debugging
* channel capability profiles

### Primary consumers

* Identity and Thread Management
* Agent Runtime
* Observability, Replay, and Cost Control
* operator tooling

---

## 5. Goals and Non-Goals

### Goals

The Channel Gateway must optimize for:

* provider-neutral canonical messaging contracts
* predictable inbound deduplication
* reliable outbound delivery with explicit status
* replay-visible raw payload preservation
* clean attachment normalization boundaries
* safe support for both webhook and polling channels
* low latency for live channels without losing auditability
* clean separation between channel transport and identity or runtime logic

### Non-Goals

The subsystem is not trying to optimize for:

* embedding identity heuristics directly in channel adapters
* hiding provider capability gaps behind inaccurate abstractions
* silently dropping duplicate or malformed provider events without audit evidence
* treating streaming delivery as authoritative final output state
* performing deep OCR, transcription, or semantic extraction of attachments
* becoming a general notification workflow engine

---

## 6. Cross-Layer Contract Coverage

This subsystem must fully implement the channel-related features declared in Layer 1 and the applicable global contracts from Layer 1.5.

### From Layer 1

The subsystem must support:

* channel integration and canonical message normalization
* inbound event and message ingestion
* attachment normalization
* webhook and polling integrations
* outbound response delivery, including streaming where supported
* provider payload preservation for debugging and replay support
* modular integration through stable internal interfaces

### From Layer 1.5

The subsystem must implement:

* policy-first execution for outbound delivery and other side-effecting channel actions
* recoverable and observable execution for channel ingress and egress
* replay-visible preservation of meaningful provider payloads and delivery outcomes
* identity propagation rules, with a controlled pre-resolution ingress exception before canonical identity exists
* deterministic linkage between inbound events, downstream run creation, and outbound delivery refs

### Pre-resolution ingress exception

Layer 1.5 requires propagated identity fields such as `userId`, `threadId`, and `runId`, but the Channel Gateway sits before identity and thread resolution on inbound entry.

For inbound ingress, the sanctioned pre-resolution identifiers are:

* `inboundEventId`
* `provider`
* `providerMessageKey`
* `providerAccountKey` when available
* `providerThreadKey` when available
* `providerWorkspaceKey` when available

Once Identity and Thread Management resolves canonical identity and thread metadata, downstream records must preserve the linkage back to the original `inboundEventId`.

If this document conflicts with Layer 1 or Layer 1.5, the higher-layer document wins.

---

## 7. Canonical Responsibilities

The Channel Gateway must:

* authenticate or trust-classify inbound provider traffic where the channel supports it
* assign stable canonical ingress ids to inbound provider events
* deduplicate inbound retries and repeated poll results without creating duplicate downstream work
* preserve raw provider payloads as governed refs
* normalize supported inbound interactions into canonical envelopes
* normalize attachment references without taking ownership of semantic analysis
* expose capability metadata such as streaming, attachment, thread, and size limits
* validate outbound route, capability compatibility, and delivery authorization before provider send
* deliver outbound content or streams through the correct provider adapter
* persist outbound attempt records, receipts, and normalized failure results
* attach redaction and retention posture metadata to provider payload refs before replay or observability handoff
* emit replay-grade logs, traces, and payload refs for ingress and egress

---

## 8. Core Invariants

The subsystem must obey the global platform invariants.

Additional channel-specific invariants:

1. **Provider payloads are preserved before canonicalization hides detail.**  
   Raw inbound and outbound provider payloads must be retained by reference when policy and configuration require it.

2. **Inbound dedupe happens before downstream run-start side effects.**  
   Repeated webhooks, retries, and poll re-reads must not create duplicate canonical inbound interactions.

3. **Canonical envelopes do not perform identity or thread decisions.**  
   The gateway may carry provider hints, but it must not claim canonical user or thread ownership.

4. **Outbound delivery is a governed side effect.**  
   The gateway must not send messages without a valid authorization or equivalent approved internal contract.

5. **Authorization is enforced locally, not authored locally.**  
   The gateway must verify that outbound authorization is present, unexpired, route-compatible, and still enforceable, but it must not issue or broaden authorization on its own.

6. **Streaming is non-authoritative until final delivery commit.**  
   Partial stream chunks are user-experience signals, not the authoritative final output artifact.

7. **Capability mismatches fail explicitly.**  
   The gateway must not pretend a channel supports attachments, threads, edits, or streaming when it does not.

8. **Attachment refs remain attributable to the originating provider event or delivery.**  
   Attachment normalization must preserve provider lineage and storage refs for audit and replay.

9. **Payload classification precedes broad evidence visibility.**  
   Provider payload refs emitted by the gateway must carry the redaction and retention posture needed by downstream observability and replay systems.

---

## 9. Channel Model and Capability Profiles

The platform needs a stable model of “channel” that is broader than one provider SDK.

### Canonical channel concepts

| Concept | Meaning |
| --- | --- |
| `provider` | The external system such as Slack, email, Discord, WeChat, or SMS. |
| `channelType` | The interaction style such as chat, email, messaging, or forum-style thread. |
| `channelRoute` | The provider-specific delivery target and context needed to send or correlate one interaction. |
| `capabilityProfile` | The declared feature set and limits for a provider/channel combination. |

### Capability profile

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `ChannelCapabilityProfile` | `provider`, `channelType`, `supportsWebhookIngress`, `supportsPollingIngress`, `supportsOutboundDelivery`, `supportsStreaming`, `supportsAttachments`, `supportsProviderThreads` | `maxTextBytes`, `maxAttachmentCount`, `maxAttachmentBytes`, `supportsMessageEdit`, `supportsReceipts` | Exposed to callers so they can validate rendering and delivery expectations. |
| `ChannelRoute` | `provider`, `channelType` | `providerWorkspaceKey`, `providerThreadKey`, `providerRecipientKey`, `providerChannelKey` | Canonical route descriptor for one inbound or outbound interaction. |
| `ProviderPayloadRef` | `payloadRef`, `provider`, `direction`, `capturedAt` | `redactionClass`, `retentionClass`, `hash`, `captureState` | Replay-visible pointer to raw provider request or response material. `captureState` may indicate `captured`, `redacted`, or explicitly degraded capture where policy permits forwarding. The gateway classifies posture metadata; downstream evidence systems enforce storage and read rules. |

### Capability rules

* capability profiles must be versioned or snapshot-visible for replay
* provider-specific route fields must remain explicit rather than packed into one opaque string
* unsupported features must be rejected or degraded explicitly rather than silently dropped

---

## 10. Inbound Interaction Model

The gateway may receive many provider event shapes, but only a subset become runnable inbound interactions.

### Canonical inbound event model

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `InboundPlatformEvent` | `inboundEventId`, `provider`, `eventKind`, `channelType`, `receivedAt`, `providerPayloadRef` | `providerMessageKey`, `providerThreadKey`, `providerAccountKey`, `providerWorkspaceKey`, `normalizedMessage` | General canonical record for one inbound provider event. |
| `InboundMessageEnvelope` | `inboundEventId`, `provider`, `providerMessageKey`, `channelType`, `receivedAt`, `normalizedMessage`, `providerPayloadRef` | `providerThreadKey`, `providerAccountKey`, `providerWorkspaceKey`, `eventKind`, `ingressSource`, `idempotencyKey` | Canonical inbound envelope passed to Identity and Thread Management. Required fields intentionally align with the existing identity/thread contract. `ingressSource` should distinguish paths such as `webhook` or `polling`. |
| `NormalizedMessage` | `attachments` | `text`, `subject`, `contentParts`, `replyToProviderMessageKey`, `mentions`, `languageHints` | Carries normalized user-visible content and attachment references. `attachments` may be empty. |

### Supported canonical event kinds

Recommended canonical event kinds include:

* `message_created`
* `message_edited`
* `message_deleted`
* `interaction_callback`
* `delivery_callback`
* `unsupported_event`

Only provider events that map to a runnable or auditable canonical kind should become `InboundPlatformEvent` records.
Only actionable message-like events should be forwarded as `InboundMessageEnvelope` values.

### Inbound rules

* the gateway must assign a stable `inboundEventId` before forwarding anything downstream
* canonical inbound envelopes must be immutable once emitted
* unsupported provider events should be recorded for audit and observability, not passed to runtime as synthetic messages
* edited or deleted messages should preserve linkage to the original provider message key when the provider exposes it

---

## 11. Attachment Normalization

Attachment handling belongs at the channel boundary because provider attachment formats and fetch rules vary widely.

### Canonical attachment contract

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `AttachmentRef` | `attachmentId`, `kind`, `mimeType`, `storageRef`, `sourceDirection`, `createdAt` | `filename`, `bytes`, `sha256`, `providerAttachmentKey`, `previewRef`, `transcriptRef`, `fetchState` | Provider-neutral ref to one attachment or uploaded file. |
| `AttachmentNormalizationResult` | `attachmentId`, `status` | `reasonCode`, `storageRef`, `metadataRef` | `status` uses `resolved`, `placeholder`, `failed`, or `unsupported`. |

### Attachment rules

* raw attachment metadata from providers must be preserved by reference when needed for replay
* attachment normalization may produce placeholders when provider fetch fails but metadata exists
* semantic analysis such as OCR, speech-to-text, or indexing belongs to downstream subsystems, not the gateway
* outbound attachments must be validated against channel capability limits before send
* attachment refs must record whether they originated inbound or outbound

### Degradation rules

* if text is present and one attachment fails to resolve, the gateway may still emit the message envelope with a placeholder attachment ref
* if the message is attachment-only and no usable attachment refs can be produced, the gateway should reject or mark the event unsupported rather than fabricate empty user content

---

## 12. Inbound Flow

### Standard ingress flow

```text
provider webhook or poll batch
  -> authenticate or trust-classify source
  -> assign ingress attempt id
  -> dedupe against provider event/message identity
  -> capture raw provider payload ref
  -> classify provider event kind
  -> normalize message and attachment refs
  -> emit `InboundPlatformEvent`
  -> if actionable message:
       emit `InboundMessageEnvelope`
       forward to Identity and Thread Management
```

### Ingress rules

* webhook and polling paths must converge on the same canonical dedupe and normalization contracts
* authentication failures must stop runnable forwarding
* dedupe hits must remain observable even when the event is suppressed
* provider retries must not create duplicate `InboundMessageEnvelope` values
* any normalization degradation that changes replay fidelity must be recorded explicitly

---

## 13. Outbound Delivery Model

Outbound delivery is a policy-gated side effect and must remain separate from content generation.

### Canonical outbound contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `DeliveryAuthorization` | `authorizationId`, `decisionRef`, `expiresAt`, `allowedRouteHash` | `runId`, `threadId`, `stepId`, `userId`, `collaborativeScopeId`, `allowStreaming`, `allowAttachments`, `replyToProviderMessageKey`, `deliveryMode` | Runtime-issued or policy-derived authorization envelope for one concrete outbound delivery context. The gateway must verify it, not reinterpret it. |
| `OutboundDeliveryRequest` | `deliveryId`, `route`, `content`, `authorization`, `runId`, `threadId`, `deliveryMode` | `userId`, `collaborativeScopeId`, `stepId`, `replyToProviderMessageKey`, `attachments`, `idempotencyKey`, `finalOutputRef` | Canonical request to deliver one outbound message or final response. `authorization` must satisfy the `DeliveryAuthorization` contract. |
| `OutboundContent` | `parts` | `subject`, `attachments`, `formatHints`, `locale` | Provider-neutral outbound content prepared for channel rendering. |
| `DeliveryResult` | `deliveryId`, `status`, `attemptedAt` | `providerMessageKey`, `providerPayloadRef`, `receiptRef`, `error`, `deliveredAt` | `status` uses `accepted`, `streaming`, `sent`, `delivered`, `failed`, or `rate_limited`. |
| `DeliveryError` | `code`, `message`, `retryable` | `providerStatus`, `providerRequestId` | Normalized error for outbound failure handling. |

### Outbound rules

* the gateway must not select a different recipient or route than the supplied `ChannelRoute` without an explicit upstream decision
* authorization must be present, unexpired, and bound to the concrete outbound delivery context
* the gateway must verify that authorization matches at minimum the route, run, thread, delivery mode, and any reply-target semantics that materially affect where content is sent
* the gateway must reject delivery when authorization is missing, expired, mismatched, or otherwise unenforceable
* the gateway must not broaden an authorization decision into a different route, recipient, attachment set, or streaming mode
* capability validation must happen before provider send
* delivery attempts must be idempotent for duplicate `deliveryId` or equivalent idempotency key
* successful delivery must return a replay-visible provider message key or equivalent receipt when the provider supplies one

---

## 14. Streaming Delivery Semantics

Some channels support incremental output while the run is still executing.

### Canonical streaming contracts

| Contract | Required fields | Optional fields | Notes |
| --- | --- | --- | --- |
| `StreamDeliverySession` | `streamSessionId`, `deliveryId`, `route`, `status`, `startedAt` | `providerStreamKey`, `lastChunkAt`, `finalizedAt` | Tracks one provider-backed streaming session. |
| `StreamChunkRequest` | `streamSessionId`, `chunkIndex`, `contentPart`, `stepId` | `isFinalHint` | One incremental outbound chunk. |
| `StreamFinalizeRequest` | `streamSessionId`, `deliveryId`, `finalOutputRef` | `finalContentOverride` | Explicit finalization for the stream-backed response. |

### Streaming rules

* streaming is allowed only when both the channel capability profile and the runtime request allow it
* stream chunks must remain associated with a `stepId` and `streamSessionId`
* stream chunks are non-authoritative UX signals
* final delivery state must depend on the explicit finalize path or terminal provider receipt, not on chunk emission alone
* if a channel does not support true streaming, the gateway may simulate progress only if the upstream contract explicitly allows it and the behavior is clearly non-authoritative

---

## 15. Delivery State, Dedupe, and Ordering

Both inbound and outbound channel work are exposed to retries, provider duplication, and uncertain network boundaries.

### Inbound dedupe

Recommended dedupe inputs:

* `provider`
* `eventKind`
* `providerMessageKey` or provider event id
* `providerWorkspaceKey` when applicable
* retry or delivery token when the provider supplies one

Rules:

* dedupe must work across webhook and polling paths for the same underlying provider message
* a dedupe hit should return the previously created canonical ids where possible
* dedupe windows and exact keys must be replay-visible

### Outbound idempotency

* delivery attempts must carry a stable `deliveryId` or provider idempotency key
* uncertain send outcomes after timeout should prefer idempotent retry or provider lookup over blind resend
* retryable errors must remain explicit in `DeliveryError`

### Ordering

* per-route ordering should be preserved best-effort for sequential outbound messages
* ordering violations caused by provider behavior or retries must be recorded rather than hidden
* canonical causal order for replay must rely on delivery ids, attempt ids, and linked runtime refs, not only wall-clock timestamps

---

## 16. Replay and Observability

The Channel Gateway is a major replay boundary because it is the only subsystem that sees raw provider traffic before normalization.

### Required logs

The subsystem must emit structured logs for:

* inbound source authentication or trust classification
* dedupe hit or miss
* payload-capture success or degradation
* message and attachment normalization outcome
* outbound delivery validation and send result
* stream open, chunk, finalize, and close events
* provider callback or receipt updates

### Required trace spans

At minimum:

* `channel.ingress_receive`
* `channel.ingress_dedupe`
* `channel.normalize`
* `channel.attachment_resolve`
* `channel.outbound_validate`
* `channel.outbound_send`
* `channel.stream_open`
* `channel.stream_chunk`
* `channel.stream_finalize`
* `channel.delivery_callback`

### Replay capture

The subsystem must preserve:

* raw inbound provider payload refs
* raw outbound provider payload refs where policy permits capture
* canonical inbound envelopes
* normalized attachment refs and normalization outcomes
* outbound delivery requests and results
* provider message keys, delivery receipts, and stream-session refs
* dedupe decisions and idempotency metadata

### Evidence handoff rules

* the gateway owns provider-adapter capture, canonicalization, and initial payload classification
* observability and replay systems own durable retention enforcement, redaction enforcement, artifact access control, and scope-aware reads after handoff
* payload refs emitted by the gateway must carry enough metadata for downstream enforcement, including direction, linkage ids, `redactionClass`, `retentionClass`, and `captureState`
* if required payload classification or mandatory replay-critical capture cannot be completed safely, the gateway must fail closed rather than emit an under-specified ref

### Replay rules

* raw provider payloads should remain the authoritative source for ingress debugging when retained
* canonical inbound envelopes should be sufficient for replay of downstream run-start logic even when raw payload access is restricted
* stream chunks are best-effort replay data; final committed outbound results are authoritative
* if raw payload capture is required by policy and capture fails, the gateway should fail closed rather than silently downgrade replay support

---

## 17. Configuration Direction

The subsystem must obey the platform configuration contract:

```text
System -> Environment -> Collaborative Scope -> Agent -> Channel -> User -> Run
```

### Representative configuration

| Config | Purpose | Type | Default | Override Level |
| --- | --- | --- | --- | --- |
| `enabledChannels` | enable or disable named providers or channel types | list | explicit | system |
| `verifyProviderSignatures` | require webhook signature or token validation when supported | boolean | true where supported | system or channel |
| `preserveRawProviderPayloads` | retain raw inbound and outbound provider payload refs | boolean | true or conservative | system or channel |
| `defaultPayloadRetentionClass` | default retention posture for captured provider payload refs | string | replay-aware conservative | system or channel |
| `defaultPayloadRedactionClass` | default redaction posture for captured provider payload refs before downstream enforcement | string | conservative | system or channel |
| `inboundDedupeWindow` | bound duplicate suppression interval | duration | short | system or channel |
| `maxInboundPayloadBytes` | cap accepted inbound payload size before reject or truncation policy | integer | conservative | system or channel |
| `maxAttachmentBytes` | cap per-attachment fetch or upload size | integer | conservative | system or channel |
| `eagerAttachmentFetch` | fetch attachment bodies during normalization instead of lazy resolution | boolean | channel-dependent | system or channel |
| `allowStreamingDelivery` | permit streaming responses for eligible channels | boolean | channel-dependent | channel or agent |
| `outboundRetryLimit` | cap retry count for retryable delivery failures | integer | conservative | system or channel |
| `channelKillSwitches` | immediately disable selected providers, routes, or delivery modes | list | empty | system |

### Configuration rules

* all channel configuration must declare scope explicitly
* lower-level overrides must not weaken provider authentication or payload-preservation requirements that a higher layer marked mandatory
* lower-level overrides must not weaken mandatory payload redaction or retention posture required by higher-level policy or evidence configuration
* channel-level configuration may tighten attachment, size, or streaming behavior to match provider limits
* effective dedupe, retry, and capture settings must be replay-visible

---

## 18. Contract Sketch

This section defines the language-neutral subsystem contract. Exact Go interfaces, DTOs, package layout, and error types belong to later iteration-level implementation specs.

### Operations

| Operation | Purpose | Input contract | Output contract |
| --- | --- | --- | --- |
| `ReceiveWebhook` | Accept and normalize one inbound webhook request. | provider id plus raw request envelope | one or more `InboundPlatformEvent` values and zero or more `InboundMessageEnvelope` values |
| `Poll` | Pull and normalize new provider events for polling-based channels. | provider id plus cursor or checkpoint | bounded batch of `InboundPlatformEvent` values and actionable message envelopes |
| `GetCapabilityProfile` | Read the capability profile for one provider/channel pair. | `provider`, `channelType` | `ChannelCapabilityProfile` |
| `Send` | Deliver one outbound message or final response. | `OutboundDeliveryRequest` | `DeliveryResult` |
| `OpenStream` | Start one streaming delivery session. | `OutboundDeliveryRequest` | `StreamDeliverySession` |
| `AppendStream` | Send one incremental chunk on an open stream session. | `StreamChunkRequest` | chunk acknowledgement or updated stream session state |
| `FinalizeStream` | Commit the final streamed response state. | `StreamFinalizeRequest` | `DeliveryResult` |
| `GetDelivery` | Read one replay-visible delivery record. | `deliveryId` | delivery record and receipts |

### Behavioral expectations

* `ReceiveWebhook` and `Poll` must converge on the same canonical inbound contracts
* `ReceiveWebhook` must not emit runnable downstream envelopes for failed-auth or duplicate events
* `Send` must reject missing, expired, mismatched, or unenforceable delivery authorization before provider send
* `Send` must reject capability-incompatible content before provider send
* `OpenStream` must fail when the route or capability profile does not permit streaming
* `OpenStream` must also fail when delivery authorization does not explicitly permit the requested streaming posture
* `FinalizeStream` must seal the authoritative outbound result for replay and observability
* `GetDelivery` must return the delivery attempt history and final known state, not only the latest provider receipt

---

## 19. Failure Modes and Recovery

The subsystem must fail closed for unsafe ingress ambiguity and explicit outbound side-effect risk.

| Failure Mode | Detection | Impact | Recovery Strategy |
| --- | --- | --- | --- |
| webhook signature validation failure | auth or signature mismatch | spoofed inbound risk | reject and emit security-visible event |
| duplicate webhook or poll event | dedupe hit | duplicate run-start risk | suppress downstream forwarding and return prior canonical refs where possible |
| raw payload capture failure | artifact persistence failure | replay degradation or policy violation | fail closed when capture is mandatory, otherwise mark degraded capture explicitly |
| attachment fetch failure | provider fetch error or timeout | incomplete user content | emit placeholder ref when safe or reject unsupported attachment-only event |
| provider rate limit on outbound send | provider error | delayed delivery | retry within bounded policy or return rate-limited result |
| timeout after uncertain outbound send | network timeout without receipt | duplicate-send risk | use idempotent retry or provider lookup rather than blind resend |
| unsupported capability request | validation failure | message cannot be rendered or delivered as requested | reject before send with explicit capability error |
| stream interrupted mid-response | provider disconnect or runtime cancel | partial user-visible output | close session explicitly, preserve partial-delivery evidence, and rely on runtime recovery policy |
| callback or receipt mismatch | provider callback cannot map to known delivery | delivery-state ambiguity | record anomaly, avoid silent state transition, require operator review when needed |

### Recovery principles

* fail closed on spoofed or unauthenticated inbound traffic
* preserve raw evidence when available even when normalization or delivery fails
* prefer idempotent recovery over speculative resend
* never fabricate successful delivery when no provider acknowledgement or safe prior result exists

---

## 20. Test and Validation Strategy

This subsystem requires transport, contract, replay, and failure-injection validation.

### Contract tests

* canonical webhook and polling normalization produce identical envelopes for the same provider event
* `InboundMessageEnvelope` matches the input contract consumed by Identity and Thread Management
* unsupported event kinds are audited but not forwarded as runnable messages
* outbound capability validation rejects unsupported streaming, attachment, or route combinations

### Dedupe and idempotency tests

* duplicate webhook delivery does not create duplicate inbound envelopes
* webhook and polling paths dedupe the same provider event correctly
* repeated outbound `deliveryId` values return idempotent behavior
* timeout and retry flows do not produce blind duplicate sends

### Attachment tests

* attachment metadata is preserved with replay-visible lineage
* partial attachment failure yields placeholder refs when allowed
* attachment-only unsupported messages fail explicitly
* outbound attachment validation enforces channel capability limits

### Replay and observability tests

* raw payload refs are persisted when required
* canonical inbound envelopes are sufficient to replay downstream ingress behavior
* stream chunk records remain non-authoritative while final delivery results are authoritative
* receipt and callback records reconcile into the correct final delivery state

### Failure-injection tests

* signature verification failure
* raw payload store outage
* provider attachment fetch timeout
* outbound rate limiting
* uncertain send timeout
* stream interruption during live delivery

---

## 21. Final Architectural Position

The Channel Gateway should be designed as the platform’s **provider adapter, canonicalization, and delivery boundary**, not as an identity service, runtime, or policy engine.

Its authoritative contract is:

* receive provider traffic through webhook or polling paths
* preserve raw provider payloads
* normalize supported inbound interactions into canonical envelopes
* normalize attachment refs and route metadata
* deliver approved outbound responses and streams
* record receipts, dedupe decisions, and replay-visible delivery evidence

It must remain separate from:

* identity and thread resolution
* agent reasoning and orchestration
* policy authoring
* attachment semantic understanding

That separation keeps channel integration modular, auditable, replayable, and compatible with multi-channel growth without collapsing transport concerns into the runtime core.
