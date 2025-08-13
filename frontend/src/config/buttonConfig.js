// Button configuration with prompts for different AI interaction modes
const buttonConfig = [
  {
    id: "ask-ai",
    label: "Ask AI",
    icon: "🤖",
    prompt: `Provide a concise, structured answer to the following question. Break the answer down into clear sections like:
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
  }
];

export default buttonConfig;