import en from './en';

// Infer the message schema from the English locale.
export const messages = en;
export type MessageSchema = typeof messages;

// PUBLIC_INTERFACE
export type { MessageSchema as I18nMessageSchema };

/**
 * Augment vue-i18n with our message schema using the recommended pattern:
 * - Extend DefineLocaleMessage to our MessageSchema (so typed keys work)
 * - Do NOT redeclare 'messages' property types; rely on built-in typings
 */
declare module 'vue-i18n' {
  // Use our schema as the base locale message type
  export interface DefineLocaleMessage extends MessageSchema {}
}
