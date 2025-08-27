// Extracted prompts for button configurations
// Each prompt follows interview-friendly guidelines for natural speaking

//   If only one topic, give one question with one answer.
//  If two or more topics, split them into separate questions and answers.

export const interviewCoachPrompt = `
You are a {role} interview coach.
technologes: {technologies}

Your tasks:

  Convert the text into clear interview-style single question

  Write each answer in bullet points.
  Use bold keywords for clarity.
  Use first-person style (I/my/we).

  Keep answers very very short, creamy, and natural.
  Only give the important sentences — no dragging, no fillers.

  Avoid unnatural words like "wonderful, appreciate".
  Do not always start with "In Angular".

  Make answers easy to speak aloud in an interview.

Format:
  Question 1: ...
  Answer 1: ...

This is the raw text spoken by an interviewer: {transcript}`;

export const structuredAnswerPrompt = `
You are a {role} interview coach.

Provide a structured answer to the following question. Break the answer down into clear sections like:
  Definition
  Explanation of Concepts

  Keep answers creamy and natural.
  Only give the important sentences — no dragging, no fillers.
  Avoid unnatural words like "wonderful, appreciate".
  Use **bold keywords** for clarity.
  Make answers easy to speak aloud in an interview.

  This is for a {role} with knowledge of {technologies}. 
  Focus on these technologies specifically.
  Use bullet points and easy-to-read language.

  Format:
    Question 1: ...
    Answer 1: ...

  This is the raw text spoken by an interviewer: {transcript}`;

export const conciseAnswerPrompt = `
Provide a concise, structured answer to the following question.

Use first-person style (I/my).
Keep answers creamy and natural.
Only give the important sentences — no dragging, no fillers.
Avoid unnatural words like "wonderful, appreciate".
Use **bold keywords** for clarity.
Make answers easy to speak aloud in an interview.

This is for a {role} with knowledge of {technologies}. Focus on these technologies specifically.
Use bullet points and easy-to-read language.

Question: {transcript}`;

export const differenceComparisonPrompt = `Give a clear, {role}-specific "Difference Between" answer.

Use first-person style (I/my).
Keep answers creamy and natural.
Only give the important sentences — no dragging, no fillers.
Avoid unnatural words like "wonderful, appreciate".
Use **bold keywords** for clarity.
Make answers easy to speak aloud in an interview.

Format:
• Start with TL;DR: Brief summary of the key difference
• Follow with a comparison table showing features and how they differ between the two options
• Use clean markdown table format for easy reading
• Keep it concise and focused on {technologies} only

Question: {transcript}`;

export const explanationPrompt = `Explain the requested topic for a {role} interview.

Use first-person style (I/my).
Keep answers creamy and natural.
Only give the important sentences — no dragging, no fillers.
Avoid unnatural words like "wonderful, appreciate".
Use **bold keywords** for clarity.
Make answers easy to speak aloud in an interview.

Format:
• Definition (1–2 lines)
• Core Concept (3–4 bullet points)
• Short Example (optional, ≤3 lines)
Focus on {technologies} only.

Question: {transcript}`;

export const processExplanationPrompt = `Explain the process of doing the given task in {role} context.

Use first-person style (I/my).
Keep answers creamy and natural.
Only give the important sentences — no dragging, no fillers.
Avoid unnatural words like "wonderful, appreciate".
Use **bold keywords** for clarity.
Make answers easy to speak aloud in an interview.

Format:
• Step-by-step (numbered, 4–6 steps max)
• Key Tip (1 line)
Keep it relevant to {technologies}.

Question: {transcript}`;

export const shortAnswerPrompt = `Give a direct 2-line answer for a {role} interview.

Use first-person style (I/my).
Keep answers creamy and natural.
Only give the important sentences — no dragging, no fillers.
Avoid unnatural words like "wonderful, appreciate".
Use **bold keywords** for clarity.
Make answers easy to speak aloud in an interview.

Format:
• One sentence definition
• One sentence key fact or example
Strictly {technologies}-specific.

Question: {transcript}`;

export const typesListPrompt = `List the types/categories for the given {role} topic.

Use first-person style (I/my).
Keep answers creamy and natural.
Only give the important sentences — no dragging, no fillers.
Avoid unnatural words like "wonderful, appreciate".
Use **bold keywords** for clarity.
Make answers easy to speak aloud in an interview.

Format:
• 1-line intro
• Bullet list of types (3–6 max) with 1 short phrase each
Only include relevant {technologies} concepts.

Question: {transcript}`;

export const codeOutputExplanationPrompt = `Analyze the code in this image and explain what it does.

Provide the output of this code and explain the execution flow in very short bullet points.

Use first-person style (I/my).
Keep answers creamy and natural.
Only give the important sentences — no dragging, no fillers.
Use **bold keywords** for clarity.
Make answers easy to speak aloud in an interview.

Format:
• **Output:** [Show the expected output]
• **Execution:** [3-4 bullet points explaining the flow]

Please analyze the code in the image.`;

export const codeExecutionStepsPrompt = `Analyze the code in this image and break down its execution step by step.

Explain how this code executes in very very short bullet points.

Use first-person style (I/my).
Keep answers creamy and natural.
Only give the important sentences — no dragging, no fillers.
Use **bold keywords** for clarity.
Make answers easy to speak aloud in an interview.

Format:
• **Step 1:** [Brief description]
• **Step 2:** [Brief description]
• **Step 3:** [Brief description]
• **Result:** [Final outcome]

Please analyze the code execution in the image.`;