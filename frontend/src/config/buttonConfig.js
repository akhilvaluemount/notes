// Button configuration with prompts for different AI interaction modes
import {
  interviewCoachPrompt,
  structuredAnswerPrompt,
  conciseAnswerPrompt,
  codeOutputExplanationPrompt,
  codeExecutionStepsPrompt,
  mcqExtractionPrompt,
  mcqDetailedPrompt,
  hackerRankCodePrompt,
  unifiedMcqPrompt,
  unifiedMcqDetailedPrompt,
  advancedAnalysisPrompt
} from './prompts';

// Button ID constants for consistency
const BUTTON_IDS = {
  INTERVIEW_100: "100",
  ASK_AI: "ask-ai",
  RAW: "raw",
  CODE_OUTPUT: "code-output",
  CODE_EXECUTION: "code-execution",
  MCQ_EXTRACT: "mcq-extract",
  MCQ_DETAILED: "mcq-detailed",
  HACKERRANK_CODE: "hackerrank-code",
  UNIFIED_MCQ: "unified-mcq",
  UNIFIED_MCQ_DETAILED: "unified-mcq-detailed",
  ADVANCED_ANALYSIS: "advanced-analysis"
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
    id: BUTTON_IDS.CODE_OUTPUT,
    label: "Code Output",
    icon: "🖥️",
    prompt: codeOutputExplanationPrompt,
    description: "Show output and explain execution"
  },
  {
    id: BUTTON_IDS.CODE_EXECUTION,
    label: "Code Steps",
    icon: "🔍",
    prompt: codeExecutionStepsPrompt,
    description: "Step-by-step code execution"
  },
  {
    id: BUTTON_IDS.MCQ_EXTRACT,
    label: "Extract MCQ",
    icon: "📋",
    prompt: mcqExtractionPrompt,
    description: "Extract and solve multiple choice questions",
    requiresCamera: true
  },
  {
    id: BUTTON_IDS.MCQ_DETAILED,
    label: "MCQ Detailed",
    icon: "📖",
    prompt: mcqDetailedPrompt,
    description: "Get question, answer, and detailed explanation",
    requiresCamera: true
  },
  {
    id: BUTTON_IDS.UNIFIED_MCQ,
    label: "MCQ",
    icon: "📝",
    prompt: unifiedMcqPrompt,
    description: "Auto-detect and solve MCQs (single or multiple answers)",
    requiresCamera: true
  },
  {
    id: BUTTON_IDS.UNIFIED_MCQ_DETAILED,
    label: "MCQ Detailed",
    icon: "📋",
    prompt: unifiedMcqDetailedPrompt,
    description: "Detailed MCQ with auto-detection and explanation",
    requiresCamera: true
  },
  {
    id: BUTTON_IDS.HACKERRANK_CODE,
    label: "Write Code",
    icon: "💻",
    prompt: hackerRankCodePrompt,
    description: "Generate complete code solution for coding problems",
    requiresCamera: true
  },
  {
    id: BUTTON_IDS.ADVANCED_ANALYSIS,
    label: "Advanced",
    icon: "🧠",
    prompt: advancedAnalysisPrompt,
    description: "Intelligent analysis to find the right answer for any question type",
    requiresCamera: true
  }
];

export default buttonConfig;
export { BUTTON_IDS };