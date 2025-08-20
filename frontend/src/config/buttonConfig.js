// Button configuration with prompts for different AI interaction modes
import {
  interviewCoachPrompt,
  structuredAnswerPrompt,
  conciseAnswerPrompt,
  differenceComparisonPrompt,
  explanationPrompt,
  processExplanationPrompt,
  shortAnswerPrompt,
  typesListPrompt
} from './prompts';

// Button ID constants for consistency
const BUTTON_IDS = {
  INTERVIEW_100: "100",
  ASK_AI: "ask-ai",
  RAW: "raw",
  DIFF_BETWEEN: "diff-between",
  EXPLAIN_ABOUT: "explain-about",
  PROCESS_OF: "process-of",
  SHORT_ANSWER: "short-answer",
  TYPES_OF: "types-of"
};

const buttonConfig = [
  {
    id: BUTTON_IDS.INTERVIEW_100,
    label: "100",
    icon: "💯",
    prompt: interviewCoachPrompt,
    description: "100-word interview answer with bullet points"
  },
  {
    id: BUTTON_IDS.ASK_AI,
    label: "Ask AI",
    icon: "🤖",
    prompt: structuredAnswerPrompt,
    description: "Get a detailed technical answer"
  },
  {
    id: BUTTON_IDS.RAW,
    label: "Raw",
    icon: "📝",
    prompt: conciseAnswerPrompt,
    description: "Get a brief, concise response"
  },
  {
    id: BUTTON_IDS.DIFF_BETWEEN,
    label: "Difference Between",
    icon: "⚖️",
    prompt: differenceComparisonPrompt,
    description: "Side-by-side comparison table"
  },
  {
    id: BUTTON_IDS.EXPLAIN_ABOUT,
    label: "Explain About",
    icon: "💬",
    prompt: explanationPrompt,
    description: "Concise explanation of a concept"
  },
  {
    id: BUTTON_IDS.PROCESS_OF,
    label: "Process Of",
    icon: "🔄",
    prompt: processExplanationPrompt,
    description: "Step-by-step how-to explanation"
  },
  {
    id: BUTTON_IDS.SHORT_ANSWER,
    label: "Short 2-Line Answer",
    icon: "≡",
    prompt: shortAnswerPrompt,
    description: "Super short, straight-to-point answer"
  },
  {
    id: BUTTON_IDS.TYPES_OF,
    label: "Types Of",
    icon: "⊢",
    prompt: typesListPrompt,
    description: "List of types/categories"
  }
];

export default buttonConfig;
export { BUTTON_IDS };