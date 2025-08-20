// TypeScript type definitions for button configuration

/**
 * Interface for button configuration
 */
export interface ButtonConfig {
  /** Unique identifier for the button */
  id: string;
  
  /** Display label for the button */
  label: string;
  
  /** Icon/emoji to display on the button */
  icon: string;
  
  /** AI prompt template with {transcript} placeholder */
  prompt: string;
  
  /** Optional description of the button's purpose */
  description?: string;
}

/**
 * Button ID constants for type-safe references
 */
export interface ButtonIds {
  INTERVIEW_100: "100";
  ASK_AI: "ask-ai";
  RAW: "raw";
  DIFF_BETWEEN: "diff-between";
  EXPLAIN_ABOUT: "explain-about";
  PROCESS_OF: "process-of";
  SHORT_ANSWER: "short-answer";
  TYPES_OF: "types-of";
}

declare const buttonConfig: ButtonConfig[];
declare const BUTTON_IDS: ButtonIds;

export default buttonConfig;
export { BUTTON_IDS };