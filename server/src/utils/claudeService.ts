import Anthropic from '@anthropic-ai/sdk';
import * as z from 'zod/v4';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

const MODEL = 'claude-opus-5';

interface ThoughtInput {
  id: string;
  text: string;
  connections: string[];
  documentName?: string;
}

interface SemanticThought {
  id: string;
  text: string;
}

interface SemanticCluster {
  id: number;
  thoughtIds: string[];
  label: string;
}

interface SemanticsResult {
  similarityMatrix: Record<string, number>;
  clusters: SemanticCluster[];
  error?: string;
}

interface PatternInput {
  type: 'cluster' | 'hub' | 'isolated' | 'theme';
  description: string;
  count?: number;
}

interface NetworkStats {
  totalThoughts: number;
  totalConnections: number;
  avgConnections: number;
  clusters: number;
  isolatedCount: number;
}

interface SynthesisResult {
  synthesis: string;
  questions: string[];
  error?: string;
}

// Constructed lazily so a missing key surfaces as a handled error, not an import-time crash.
let cachedClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) {
    return 'Invalid Anthropic API key';
  }
  if (error instanceof Anthropic.RateLimitError) {
    return 'Anthropic rate limit reached — try again shortly';
  }
  if (error instanceof Anthropic.APIError) {
    return `Anthropic API error ${error.status}: ${error.message}`;
  }
  return error instanceof Error ? error.message : 'Unknown error';
}

const SynthesisSchema = z.object({
  synthesis: z
    .string()
    .describe('Two to three paragraphs of narrative analysis, using **bold** for key themes'),
  questions: z.array(z.string()).describe('Exactly three thought-provoking questions'),
});

export async function generateSynthesis(
  thoughts: ThoughtInput[],
  patterns: PatternInput[],
  stats: NetworkStats
): Promise<SynthesisResult> {
  const client = getClient();

  if (!client) {
    return { synthesis: '', questions: [], error: 'Anthropic API key not configured' };
  }

  try {
    const thoughtsList = thoughts
      .map(t => `- "${t.text}" (connected to ${t.connections.length} other thoughts)`)
      .join('\n');

    const patternsList = patterns
      .map(p => `- ${p.type}: ${p.description}`)
      .join('\n');

    const prompt = `You are analyzing a personal knowledge network called a "thought constellation." The user has captured various thoughts and ideas, and you can see how they connect to each other.

## The Thoughts
${thoughtsList}

## Detected Patterns
${patternsList}

## Network Statistics
- Total thoughts: ${stats.totalThoughts}
- Total connections: ${stats.totalConnections}
- Average connections per thought: ${stats.avgConnections.toFixed(1)}
- Number of clusters: ${stats.clusters}
- Isolated thoughts (no connections): ${stats.isolatedCount}

## Your Task
Provide a thoughtful analysis in two parts.

Synthesis (2-3 paragraphs) — write a narrative summary that:
- Identifies the core themes and how they relate to each other
- Highlights interesting patterns or unexpected connections you notice
- Suggests what this constellation reveals about how this person thinks
- Points out any gaps or areas that might benefit from further exploration

Use **bold** for key themes or important insights. Be conversational but insightful.

Questions (exactly 3) — generate 3 thought-provoking questions that could help the user:
- Connect seemingly unrelated thoughts
- Deepen their exploration of a cluster
- Bridge isolated thoughts to the main network`;

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'high',
        format: zodOutputFormat(SynthesisSchema),
      },
      messages: [{ role: 'user', content: prompt }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      return { synthesis: '', questions: [], error: 'Request was declined by safety filters' };
    }

    const parsed = message.parsed_output;
    if (!parsed) {
      return { synthesis: '', questions: [], error: 'Could not parse synthesis response' };
    }

    return { synthesis: parsed.synthesis, questions: parsed.questions };
  } catch (error) {
    console.error('Anthropic synthesis error:', error);
    return { synthesis: '', questions: [], error: describeError(error) };
  }
}

const SemanticsSchema = z.object({
  clusters: z
    .array(
      z.object({
        label: z.string().describe('A short human-readable theme name, 2-4 words'),
        thoughtIds: z
          .array(z.string())
          .describe('Ids of the thoughts in this cluster, copied exactly'),
      })
    )
    .describe('Groups of thoughts that share a theme. Every cluster needs at least 2 thoughts.'),
  relatedPairs: z
    .array(
      z.object({
        a: z.string().describe('First thought id, copied exactly'),
        b: z.string().describe('Second thought id, copied exactly'),
        similarity: z.number().describe('Semantic relatedness from 0 to 1'),
      })
    )
    .describe('Pairs of meaningfully related thoughts. Omit unrelated pairs entirely.'),
});

/**
 * Semantic grouping of thoughts.
 *
 * Anthropic has no embeddings endpoint, so instead of embedding each thought and
 * running DBSCAN over cosine distances, Claude does the grouping directly and we
 * derive a sparse similarity matrix from the pairs it reports. The frontend reads
 * the matrix through a `simMatrix[a-b] ?? simMatrix[b-a] ?? 0` lookup, so any pair
 * left out is simply treated as unrelated.
 */
export async function getThoughtSemantics(
  thoughts: SemanticThought[]
): Promise<SemanticsResult> {
  const client = getClient();

  if (!client) {
    return { similarityMatrix: {}, clusters: [], error: 'Anthropic API key not configured' };
  }

  const usable = thoughts.filter(t => t.text && t.text.trim().length > 0);

  if (usable.length === 0) {
    return { similarityMatrix: {}, clusters: [] };
  }

  try {
    const thoughtsList = usable.map(t => `${t.id}: "${t.text}"`).join('\n');
    const pairLimit = Math.min(400, usable.length * 8);

    const prompt = `You are organizing a personal knowledge network into semantic groups.

Below are thoughts, each given as id followed by its text.

${thoughtsList}

## Your Task

1. Group the thoughts into semantic clusters by shared theme or subject matter. Give each cluster a short, specific label (2-4 words). Only group thoughts that genuinely belong together — a cluster needs at least 2 thoughts. Leave a thought out of every cluster if it does not fit one, and assign each thought to at most one cluster.

2. List the pairs of thoughts that are meaningfully related, with a similarity score from 0 to 1, where above 0.7 means strongly related and below 0.5 means only loosely associated. Omit unrelated pairs entirely rather than scoring them near zero. Report at most ${pairLimit} pairs, favouring the strongest relationships.

Copy every id exactly as given. Do not invent ids.`;

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'high',
        format: zodOutputFormat(SemanticsSchema),
      },
      messages: [{ role: 'user', content: prompt }],
    });

    const message = await stream.finalMessage();

    if (message.stop_reason === 'refusal') {
      return {
        similarityMatrix: {},
        clusters: [],
        error: 'Request was declined by safety filters',
      };
    }

    const parsed = message.parsed_output;
    if (!parsed) {
      return { similarityMatrix: {}, clusters: [], error: 'Could not parse clustering response' };
    }

    const validIds = new Set(usable.map(t => t.id));

    // Keep the model honest: drop unknown ids, and let the first cluster win a
    // thought the model placed in more than one.
    const assigned = new Set<string>();
    const clusters: SemanticCluster[] = [];

    for (const cluster of parsed.clusters) {
      const members = cluster.thoughtIds.filter(id => validIds.has(id) && !assigned.has(id));
      if (members.length < 2) continue;

      members.forEach(id => assigned.add(id));
      clusters.push({
        id: clusters.length,
        thoughtIds: members,
        label: cluster.label.trim() || 'Related Thoughts',
      });
    }

    // The frontend filters this bucket out of the cluster visuals but still
    // expects every thought to be accounted for.
    const unclustered = usable.map(t => t.id).filter(id => !assigned.has(id));
    if (unclustered.length > 0) {
      clusters.push({ id: clusters.length, thoughtIds: unclustered, label: 'Unclustered' });
    }

    const similarityMatrix: Record<string, number> = {};
    for (const pair of parsed.relatedPairs) {
      if (pair.a === pair.b) continue;
      if (!validIds.has(pair.a) || !validIds.has(pair.b)) continue;
      if (!Number.isFinite(pair.similarity)) continue;

      const score = Math.max(0, Math.min(1, pair.similarity));
      const key = `${pair.a}-${pair.b}`;
      const reverseKey = `${pair.b}-${pair.a}`;

      // Collapse a duplicated pair onto whichever direction was recorded first.
      if (reverseKey in similarityMatrix) {
        similarityMatrix[reverseKey] = Math.max(similarityMatrix[reverseKey], score);
      } else {
        similarityMatrix[key] = Math.max(similarityMatrix[key] ?? 0, score);
      }
    }

    return { similarityMatrix, clusters };
  } catch (error) {
    console.error('Anthropic clustering error:', error);
    return { similarityMatrix: {}, clusters: [], error: describeError(error) };
  }
}
