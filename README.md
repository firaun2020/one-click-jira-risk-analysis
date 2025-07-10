# Risk-AI for Jira (Forge App)

**Risk-AI** is a Forge-powered Jira app that automates risk assessments for technical Change Requests using OpenAI's GPT-4-turbo model. It reads issue data and generates structured risk insights directly into a custom field.

---

## ✦ Features

- One-click AI-based risk analysis from within Jira issues
- Automatically writes output into a custom field
- Prevents re-analysis if an entry already exists
- Designed for structured, professional output that non-technical stakeholders can read

---

## How It Works
- App fetches summary, description, and Risk-Analysis field.
- If the field is already populated, it aborts.
- If not, it sends data to GPT-4-turbo with a structured prompt.
- AI returns 3–6 risk bullet points.
- Output is written in ADF format to Jira, including a timestamp like:

```bash
Generated on: 27-June-2025, 15:00
```


---

## 🔧 Prerequisites

### 1. Create a Custom Field

- Go to: **Jira Settings → Issues → Custom Fields**
- Create a new field of type: **Paragraph (multi-line text)**
- Name it: `Risk-Analysis`
- After creating, note the **field ID** (e.g., `customfield_10554`)

### 2. Add the Field to Screens

- Add `Risk-Analysis` to all relevant screens:
  - Create Screen
  - Edit Screen
  - View Screen
- Apply it to the **issue type** (e.g., `Change`) and relevant **project(s)**
- Ensure your team has permission to view this field

### 3. Set Environment Variable (OpenAI API Key)

Store your OpenAI API key using Forge CLI:

```bash
forge variables:set --encrypt OPENAI_API_KEY=your-key-here
```

### 4. Manifest Configuration
Ensure your manifest.yml includes the following:

```yaml
Copy
Edit
permissions:
  scopes:
    - read:jira-work
    - write:jira-work
  external:
    fetch:
      backend:
        - api.openai.com
```



### 5. Deployment Steps
Deploy to Development
```bash
forge deploy
forge install --upgrade
```
⚠️ Installing to development limits access to the app developer only.