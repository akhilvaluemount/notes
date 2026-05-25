// Button configuration with prompts for different AI interaction modes
const buttonConfig = [
  {
    id: "100",
    label: "100",
    icon: "💯",
    prompt: `You are an expert Angular/Frontend interview coach.
The user will provide raw text spoken by an interviewer.

Your tasks:
	1.	Convert the text into clear interview-style question(s).
	•	If only one topic, give just one question with one answer.
	•	If two or more distinct topics, split them into separate questions, each with its own answer.
	2.	Answer each question in about 100 words using bullet points.
	•	Write in first-person style (I/my).
	•	Keep tone natural, simple, and confident.
	•	Avoid filler words like “appreciate, wonderful, amazing”.
	•	Do not start every answer with repetitive phrases like “In Angular…” or “This feature in Angular…”.
	•	Use bold keywords for clarity.
	•	Make answers easy to speak aloud in an interview.

Format:
	•	Clearly label Question 1 / Answer 1, Question 2 / Answer 2 if multiple topics exist.
{transcript}`,
    description: "100-word or less interview answer with bullet points"
  },
  {
    id: "ask-ai",
    label: "Ask AI",
    icon: "🤖",
    prompt: `
    Provide a concise, structured answer to the following question. Break the answer down into clear sections like:
      Definition
      Explanation of Concepts
      Examples
      Key Points
    This is for a frontend developer with knowledge of HTML, CSS, JavaScript, TypeScript, and Angular. Focus on these technologies specifically. 
    Ensure the answer is brief, to the point, and focuses on the technical details, while avoiding lengthy explanations or over-explanation. 
    Use bullet points and easy-to-read language to make the answer clear and accessible.

    Question: {transcript}`,
    description: "Get a detailed technical answer"
  },
  {
    id: "raw",
    label: "Raw",
    icon: "📝",
    prompt: `
    Provide a concise, structured answer to the following question.
    This is for a frontend developer with knowledge of HTML, CSS, JavaScript, TypeScript, and Angular. Focus on these technologies specifically. 
    Ensure the answer is brief, to the point, and focuses on the technical details, while avoiding lengthy explanations or over-explanation. 
    Use bullet points and easy-to-read language to make the answer clear and accessible.
    Question: {transcript}
    `,
    description: "Get a brief, concise response"
  },
  {
    id: "diff-between",
    label: "Difference Between",
    icon: "⚖️",
    prompt: `Give a clear, Angular/frontend-specific "Difference Between" answer.
Format:
• Start with TL;DR: Brief summary of the key difference
• Follow with a comparison table showing features and how they differ between the two options
• Use clean markdown table format for easy reading
• Keep it concise and focused on HTML, CSS, JavaScript, TypeScript, Angular technologies only
Question: {transcript}`,
    description: "Side-by-side comparison table"
  },
  {
    id: "explain-about",
    label: "Explain About",
    icon: "💬",
    prompt: `Explain the requested topic for an Angular interview.
Format:
• Definition (1–2 lines)
• Core Concept (3–4 bullet points)
• Short Example (optional, ≤3 lines)
Keep it crisp, avoid over-explaining, and focus on frontend technologies only.
Question: {transcript}`,
    description: "Concise explanation of a concept"
  },
  {
    id: "process-of",
    label: "Process Of",
    icon: "🔄",
    prompt: `Explain the process of doing the given task in Angular/frontend context.
Format:
• Step-by-step (numbered, 4–6 steps max)
• Key Tip (1 line)
Keep it short and relevant to HTML, CSS, JS, TS, and Angular.
Question: {transcript}`,
    description: "Step-by-step how-to explanation"
  },
  {
    id: "short-answer",
    label: "Short 2-Line Answer",
    icon: "≡",
    prompt: `Give a direct 2-line answer for an Angular interview.
Format:
• One sentence definition
• One sentence key fact or example
Strictly frontend-specific. No extra explanation.
Question: {transcript}`,
    description: "Super short, straight-to-point answer"
  },
  {
    id: "types-of",
    label: "Types Of",
    icon: "⊢",
    prompt: `List the types/categories for the given Angular/frontend topic.
Format:
• 1-line intro
• Bullet list of types (3–6 max) with 1 short phrase each
Keep it concise and only include relevant frontend concepts.
Question: {transcript}`,
    description: "List of types/categories"
  }
];

export default buttonConfig;