import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Simple rate limiter: max 10 requests/minute
const requestTimes: number[] = [];

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  // Remove entries older than 1 minute
  while (requestTimes.length > 0 && requestTimes[0] <= oneMinuteAgo) {
    requestTimes.shift();
  }
  if (requestTimes.length >= 10) {
    const oldest = requestTimes[0];
    const wait = oldest + 60000 - now + 100;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  requestTimes.push(Date.now());
}

async function callClaude(prompt: string, systemPrompt: string): Promise<string> {
  await rateLimit();
  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = response.content[0];
  return block.type === 'text' ? block.text : '';
}

export async function generateDriftAssessment(
  modelId: string,
  metrics: Record<string, unknown>
): Promise<string> {
  return callClaude(
    `Analyze drift metrics for AI model ${modelId}: ${JSON.stringify(metrics, null, 2)}. Provide a concise plain-English assessment of what this means for production quality.`,
    'You are a quality engineering expert specializing in AI model monitoring for automotive manufacturing. Be concise and actionable.'
  );
}

export async function generateComplianceSummary(
  data: Record<string, unknown>,
  framework: string
): Promise<string> {
  return callClaude(
    `Generate an executive compliance summary for framework ${framework} based on this data: ${JSON.stringify(data, null, 2)}`,
    'You are a regulatory compliance expert specializing in automotive AI governance (EU AI Act, IATF 16949, ISO/PAS 8800). Be precise and reference specific articles.'
  );
}

export async function generateComplianceReport(
  data: Record<string, unknown>,
  framework: string,
  sections: string[]
): Promise<Record<string, unknown>> {
  const content = await callClaude(
    `Generate a structured compliance report for ${framework} covering sections: ${sections.join(', ')}. Data: ${JSON.stringify(data, null, 2)}. Return JSON with section assessments, compliance percentage, and gaps.`,
    'You are a regulatory compliance expert. Return a valid JSON object with keys: compliance_percentage (number), sections (object mapping section names to status and notes), gaps (array of gap descriptions), recommendations (array of strings).'
  );
  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return {
      compliance_percentage: 0,
      sections: {},
      gaps: [content],
      recommendations: [],
    };
  }
}

export async function generateEntityRiskAssessment(
  entityName: string,
  matches: unknown[]
): Promise<string> {
  return callClaude(
    `Assess the supply chain risk for entity "${entityName}" based on these screening matches: ${JSON.stringify(matches, null, 2)}. Provide a concise risk assessment and recommended action.`,
    'You are a trade compliance and supply chain risk expert specializing in automotive. Be direct and actionable. Reference relevant regulations.'
  );
}

export async function generateConstitutionalRules(
  modelId: string,
  modelType: string,
  pilotId: string,
  frameworks: string[]
): Promise<string[]> {
  const content = await callClaude(
    `Generate constitutional operating rules for AI model "${modelId}" (type: ${modelType}) deployed at pilot "${pilotId}" under frameworks: ${frameworks.join(', ')}. Return a JSON array of rule strings.`,
    'You are an AI governance expert specializing in automotive manufacturing AI systems. Generate concise, enforceable constitutional rules covering data handling, decision authority, escalation thresholds, and regulatory compliance. Return only a valid JSON array of strings.'
  );
  try {
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [content];
  }
}
