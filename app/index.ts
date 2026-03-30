export { default as User } from "./User";
export { default as Content, parseMetric } from "./Content";

export type { IUser, IPlatformFollowers, Platform } from "./User";
export type {
  IContent,
  ContentItem,
  ContentMetrics,
  Metrics,
  ContentFields,
  ContentApiPayload,
  PrimaryJob,
  ContentObject,
  InteractionMode,
  RetrievalMode,
  AuthorshipMode,
  EvidenceMode,
  TopicDomain,
  AttentionHook,
  OutcomeDriver,
  FormatMechanic,
} from "./Content";
export { normalizeMetrics, contentLeanToApiPayload } from "./Content";
