export const interviewQuestions = [
  // 1. Goals
  {
    "question": "What are your short-term and long-term goals?",
    "answer": "Language: General  \nTopic: Goals  \nQuestion 1: What are your short-term and long-term goals?  \nAnswer 1:  \n- **Short-term**: I want to improve my **UI skills**, focusing on modern frameworks and design principles.  \n- **Long-term**: My goal is to become a **full-stack developer** and eventually take on a **leadership role** in a development team.",
    "timestamp": "2025-09-09T09:23:06.975Z",
    "question_type": "general",
    "language": "General",
    "topic": "Goals",
    "_id": "68bff1fa367729d118cd8115"
  },

  // 2. Agile Sprint Ceremonies
  {
    "question": "What are the typical ceremonies in an Agile sprint?",
    "answer": "Language: General  \nTopic: Agile Sprint Ceremonies  \nQuestion 1: What are the typical ceremonies in an Agile sprint?  \nAnswer 1:  \n- **Sprint Planning**: We define the work for the sprint and set goals.  \n- **Daily Stand-up**: A quick meeting to sync up on progress and blockers.  \n- **Sprint Review**: We demonstrate what we've built to stakeholders and gather feedback.  \n- **Sprint Retrospective**: We reflect on the sprint to identify improvements for the next one.",
    "timestamp": "2025-09-09T09:19:59.956Z",
    "question_type": "general",
    "language": "General",
    "topic": "Agile Sprint Ceremonies",
    "_id": "68bff13f367729d118cd806f"
  },

  // 3. Agile Methodology
  {
    "question": "What is agile methodology in simple English?",
    "answer": "Language: General  \nTopic: Agile Methodology  \nQuestion 1: What is agile methodology in simple English?  \nAnswer 1:  \n- **Agile methodology** is a way of managing projects that focuses on **flexibility** and **collaboration**.  \n- It involves **breaking projects** into smaller pieces, called **sprints**, and allows teams to **adapt** based on feedback.  \n- The goal is to deliver **working software** quickly and improve continuously.  \n- Teams hold regular **meetings** to discuss progress and adjust plans as needed.  ",
    "timestamp": "2025-09-09T09:19:26.322Z",
    "question_type": "general",
    "language": "General",
    "topic": "Agile Methodology",
    "_id": "68bff11e367729d118cd806d"
  },

  // 4. Problem Solving / API Integration
  {
    "question": "Can you explain one tough task you handled and how you approached it with a real-time example in the banking/financial domain?",
    "answer": "Language: General  \nTopic: Problem Solving / API Integration  \nQuestion 1: Can you explain one tough task you handled and how you approached it with a real-time example in the banking/financial domain?  \nAnswer 1:  \n- I worked on building a **Banking Customer Dashboard** where we had to show **account balances**, **recent transactions**, **credit cards**, **loans**, **EMI details**, and **offers** all in one screen.  \n- The **complexity** came from multiple **APIs**: some were **dependent** (auth → customer → accounts) and others were **independent** but needed to be fetched together.  \n- Each account needed **recent transactions**, each card needed **reward points**, and each loan needed **next EMI details**, which made it even more challenging.  \n- We used **concatMap** for **dependent sequential calls**, **forkJoin** for **parallel APIs** like balances, cards, loans, and **mergeMap** for **fan-out calls** like per-account transactions with concurrency.  \n- To make it **reliable**, we used **retryWhen**, **timeout**, and **catchError** for **resilience**, and **finalize** to ensure loaders and spinners were always cleared.  \n- Finally, we merged all responses into a single **view model**, so the UI could render consistently with one payload instead of handling scattered data.  \n- This approach solved the **performance issue**, avoided **nested callbacks**, and made the dashboard **fast**, **stable**, and **maintainable**.  ",
    "timestamp": "2025-09-09T09:17:22.190Z",
    "question_type": "general",
    "language": "General",
    "topic": "Problem Solving / API Integration",
    "_id": "68bff0a2367729d118cd806a"
  },

  // 5. Estimation
  {
    "question": "How do you calculate the story points for a login page in UI development?",
    "answer": "Language: General  \nTopic: Estimation  \nQuestion 1: How do you calculate the story points for a login page in UI development?  \nAnswer 1:  \n- We calculate story points based on **complexity**, **effort**, **testing**, and **dependencies**.  \n- For a simple login UI with basic validations, it may take around **2–3 story points**.  \n- If it includes backend API integration and error handling, it could be about **5 story points**.  \n- For features like OAuth/SSO, Captcha, Remember Me, and responsive design, it can go up to **8–13 story points**.  \n- We use **relative estimation** during sprint planning, comparing with completed stories.  \n- The team uses **planning poker** to finalize story points collectively.",
    "timestamp": "2025-09-09T09:01:28.176Z",
    "question_type": "general",
    "language": "General",
    "topic": "Estimation",
    "_id": "68bfece8367729d118cd7e9e"
  },

  // 6. Story Points
  {
    "question": "What is the meaning of one story point?",
    "answer": "Language: General  \nTopic: Story Points  \nQuestion 1: What is the meaning of one story point?  \nAnswer 1:  \n- A **story point** is a unit of measure used in **agile methodologies** to estimate the **effort** required to complete a user story.  \n- It helps teams assess the **complexity**, **risk**, and **time** involved in completing a task.  \n- Essentially, it's a way to gauge how much work is involved, not directly tied to hours.  \n- We often use a scale, like Fibonacci, to assign these points based on team consensus.",
    "timestamp": "2025-09-09T08:53:10.030Z",
    "question_type": "general",
    "language": "General",
    "topic": "Story Points",
    "_id": "68bfeaf6367729d118cd7e9c"
  },

  // 7. Estimation Techniques
  {
    "question": "Can you explain what Planning Poker and T-shirt sizing are?",
    "answer": "Language: General  \nTopic: Estimation Techniques  \nQuestion 1: Can you explain what Planning Poker and T-shirt sizing are?  \nAnswer 1:  \n- **Planning Poker** is a **consensus-based** estimation technique used in Agile development.  \n- Team members use cards to estimate the effort required for tasks, promoting discussion and collaboration.  \n- **T-shirt sizing** is a simpler method where tasks are categorized as **XS, S, M, L, or XL** based on effort or complexity.  \n- It’s quick and helps to give a general idea of the size of tasks without getting into detailed estimates.",
    "timestamp": "2025-09-09T08:51:54.710Z",
    "question_type": "general",
    "language": "General",
    "topic": "Estimation Techniques",
    "_id": "68bfeaaa367729d118cd7e0a"
  },

  // 8. Sprint Estimations
  {
    "question": "How do you calculate the estimations for the sprint?",
    "answer": "Language: General  \nTopic: Sprint Estimations  \nQuestion 1: How do you calculate the estimations for the sprint?  \nAnswer 1:  \n- We usually start by breaking down the **user stories** into **tasks**.  \n- Then, we use techniques like **Planning Poker** or **T-shirt sizing** to estimate the effort.  \n- Each team member gives their input, and we discuss any discrepancies.  \n- Finally, we sum up the estimates to determine the **sprint capacity**.  \n- Historical data helps us refine our estimates over time.",
    "timestamp": "2025-09-09T08:50:42.037Z",
    "question_type": "general",
    "language": "General",
    "topic": "Sprint Estimations",
    "_id": "68bfea62367729d118cd7e08"
  },

  // 9. Requirement Changes
  {
    "question": "How do you address requirement changes in your projects?",
    "answer": "Language: General  \nTopic: Requirement Changes  \nQuestion 1: How do you address requirement changes in your projects?  \nAnswer 1:  \n- We **stay flexible** and open to changes.  \n- I usually **communicate** with the team to assess the impact.  \n- We **prioritize** the new requirements based on urgency and importance.  \n- The way I handle it is by **updating our project plan** and timelines accordingly.  \n- Regular **check-ins** help ensure everyone is aligned.",
    "timestamp": "2025-09-09T08:48:56.651Z",
    "question_type": "general",
    "language": "General",
    "topic": "Requirement Changes",
    "_id": "68bfe9f8367729d118cd7e06"
  },

  // 10. Communication
  {
    "question": "Do you communicate with the client directly?",
    "answer": "Language: General  \nTopic: Communication  \nQuestion 1: Do you communicate with the client directly?  \nAnswer 1:  \n- Yes, we communicate with the client directly during **reviews**, **demos**, and **requirement discussions**.  \n- For **doubts** or **blockers**, we reach out for quick clarification.  \n- We also work with the **Business Analyst** (BA) for proper documentation and tracking.  \n- The BA acts as a bridge, but we maintain direct communication with the client when needed.",
    "timestamp": "2025-09-09T08:46:25.703Z",
    "question_type": "general",
    "language": "General",
    "topic": "Communication",
    "_id": "68bfe961367729d118cd7e03"
  },

  // 11. Work Flow
  {
    "question": "Can you explain about your work Flow?",
    "answer": "Language: General  \nTopic: Work Flow  \nQuestion 1: Can you explain about your work Flow?  \nAnswer 1:  \n- We follow **Agile development methodologies**, specifically a **two-week sprint model**.  \n- In each sprint, we handle **stories**, **tasks**, and **bugs** tracked in **JIRA**.  \n- After receiving a story, we analyze the requirement and break it down into **sub-tasks**.  \n- For each sub-task, we create a **branch in Bitbucket**, clone it locally, complete the code, and push it back.  \n- After development, we raise a **Pull Request (PR)** for **peer review**. Once approved, the code gets merged.  \n- This cycle continues with the next story until the **sprint goals** are completed.  \n- We use **JIRA** for ticketing, **Bitbucket** for the remote repository, **Confluence** for requirement documentation, and **Figma** for UX design.  \n- If we have doubts, we communicate with the **Business Analyst (BA)**, who coordinates with the client.",
    "timestamp": "2025-09-09T08:39:39.788Z",
    "question_type": "general",
    "language": "General",
    "topic": "Work Flow",
    "_id": "68bfe7cb367729d118cd7d60"
  },

  // 12. Work Experience
  {
    "question": "Can you explain about your work?",
    "answer": "Language: General  \nTopic: Work Experience  \nQuestion 1: Can you explain about your work?  \nAnswer 1:  \n- I’ve worked as a **frontend developer** for several years.  \n- My main focus has been on **HTML, CSS, and JavaScript**, specifically using **Angular** for building dynamic web applications.  \n- I generally collaborate with designers to create responsive layouts using **Bootstrap** and **SCSS** for styling.  \n- I also handle integrating APIs and ensuring the applications are optimized for performance.  \n- Throughout my projects, I prioritize user experience and accessibility.  ",
    "timestamp": "2025-09-09T08:31:03.915Z",
    "question_type": "general",
    "language": "General",
    "topic": "Work Experience",
    "_id": "68bfe5c7367729d118cd7d05"
  }
];
