import Resolver from '@forge/resolver';
import api, { route, fetch } from '@forge/api';

const resolver = new Resolver();


resolver.define('runRiskAnalysis', async (req) => {
  const issueKey = req.context.extension.issue.key;
  console.log(`Received request for issue: ${issueKey}`);

  try {
    // Fetch issue details
    const issueRes = await api.asApp().requestJira(
      route`/rest/api/3/issue/${issueKey}?fields=summary,description,customfield_10554`
    );

    const issueData = await issueRes.json();

    const summary = issueData.fields.summary;
    const description = extractPlainText(issueData.fields.description);
    const existingRisk = extractPlainText(issueData.fields.customfield_10554);
    const now = new Date();
    const formattedTimestamp = `${now.getDate()}-${now.toLocaleString('en-US', { month: 'long' })}-${now.getFullYear()}, ${now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

    if (existingRisk && existingRisk.length > 5) {

      return {
        status: 'already-exists',
        message: 'Risk analysis already exists. Please delete the previous entry to generate a new one.',
      };
    }

    // Prepare OpenAI prompt
    const prompt = `
You are a senior IT risk analyst evaluating Change Requests (CRs) in enterprise environments.

Your task is to assess the following Jira Change Request using its summary and description.
Following is your input for analyzing.
Summary: ${summary}
Description: ${description}

Please follow these guidelines:
- First, check if the input looks like a legitimate technical Change Request. If it's vague, irrelevant, or nonsensical, respond with:  
  "Not a valid ticket for assessment."
- If valid, identify potential **technical or security risks**.
- Use clear, structured, and professional language.

Format your output as follows:


1. **[Risk Title]**: [One-sentence explanation of the risk]
2. **[Risk Title]**: [Explanation...]
(3–6 numbered bullet points as appropriate)
(also add time stamp at the bottom after 1 line gap in following format)
Generated on: ${formattedTimestamp}
`;



    console.log('Calling OpenAI with prompt...');

    const openAiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        temperature: 0.3,
        max_tokens: 500,
        messages: [
          { role: 'system', content: 'You are a helpful Risk Analysis Expert assistant.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text();

      throw new Error(`OpenAI API failed with status ${openAiResponse.status}`);
    }

    const responseData = await openAiResponse.json();
    const riskAnalysis = responseData.choices[0].message.content;


    console.log(riskAnalysis)
    const formattedParagraphs = riskAnalysis
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        // Match numbered risk items: 1. **Risk Title**: explanation
        const match = line.match(/^(\d+\.)\s\*\*(.+?)\*\*:\s(.*)$/);

        if (match) {
          const [, number, boldTitle, restText] = match;
          return {
            type: 'paragraph',
            content: [
              { type: 'text', text: `${number} ` },
              { type: 'text', text: boldTitle, marks: [{ type: 'strong' }] },
              { type: 'text', text: `: ${restText}` }
            ]
          };
        }

        // Detect "RISK ANALYSIS" heading
        if (line.trim().toUpperCase() === 'RISK ANALYSIS') {
          return {
            type: 'heading',
            attrs: { level: 3 },
            content: [{ type: 'text', text: 'RISK ANALYSIS' }]
          };
        }

        // Detect "Generated on ..." footer
        if (line.trim().toLowerCase().startsWith('generated on')) {
          return {
            type: 'paragraph',
            content: [{ type: 'text', text: line.trim() }]
          };
        }

        // Fallback for any other text
        return {
          type: 'paragraph',
          content: [{ type: 'text', text: line.trim() }]
        };
      });

    const bodyData = {
      fields: {
        customfield_10554: {
          type: 'doc',
          version: 1,
          content: formattedParagraphs
        }
      }
    };

    // Update Jira
    console.log('Updating Jira issue with new analysis...');
    await api.asApp().requestJira(route`/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyData)
    });


    return { status: 'success', message: 'Risk analysis written to field "Risk-Analysis" above.' };

  } catch (error) {
    console.error('Error in runRiskAnalysis:', error);
    return {
      status: 'error',
      message: 'An unexpected error occurred while generating risk analysis.'

    };
  }
});

// Utility: extract plain text from Forge document field
function extractPlainText(doc) {
  if (!doc?.content) return '';
  return doc.content
    .flatMap((c) => c.content || [])
    .map((d) => d.text || '')
    .join(' ')
    .trim();
}

export const handler = resolver.getDefinitions();
