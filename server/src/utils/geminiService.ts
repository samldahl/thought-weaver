import { GoogleGenerativeAI } from '@google/generative-ai';

interface ThoughtInput {
  id: string;
  text: string;
  connections: string[];
  documentName?: string;
}

interface EmbeddingThought {
  id: string;
  text: string;
}

interface SemanticCluster {
  id: number;
  thoughtIds: string[];
  label: string;
}

interface EmbeddingsResult {
  embeddings: Record<string, number[]>;
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

export async function generateGeminiSynthesis(
  thoughts: ThoughtInput[],
  patterns: PatternInput[],
  stats: NetworkStats
): Promise<SynthesisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      synthesis: '',
      questions: [],
      error: 'Gemini API key not configured'
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
Provide a thoughtful analysis in two parts:

### Part 1: Synthesis (2-3 paragraphs)
Write a narrative summary that:
- Identifies the core themes and how they relate to each other
- Highlights interesting patterns or unexpected connections you notice
- Suggests what this constellation reveals about the person's thinking or interests
- Points out any gaps or areas that might benefit from further exploration

Use **bold** for key themes or important insights. Be conversational but insightful.

### Part 2: Questions (exactly 3)
Generate 3 thought-provoking questions that could help the user:
- Connect seemingly unrelated thoughts
- Deepen their exploration of a cluster
- Bridge isolated thoughts to the main network

Format your response as JSON:
{
  "synthesis": "Your synthesis paragraphs here...",
  "questions": ["Question 1?", "Question 2?", "Question 3?"]
}`;

    const result = await model.generateContent(prompt);
    const response = result.response.text();

    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        synthesis: parsed.synthesis || '',
        questions: parsed.questions || []
      };
    }

    // Fallback if JSON parsing fails
    return {
      synthesis: response,
      questions: []
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      synthesis: '',
      questions: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Cosine similarity between two vectors
function cosineSimilarity(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

// DBSCAN clustering algorithm
function dbscan(
  points: { id: string; embedding: number[] }[],
  eps: number,
  minPts: number
): { clusters: string[][]; noise: string[] } {
  const visited = new Set<string>();
  const clustered = new Set<string>();
  const clusters: string[][] = [];
  const noise: string[] = [];

  function regionQuery(pointId: string): string[] {
    const point = points.find(p => p.id === pointId)!;
    return points
      .filter(p => {
        if (p.id === pointId) return false;
        const similarity = cosineSimilarity(point.embedding, p.embedding);
        return similarity >= (1 - eps); // Convert distance to similarity threshold
      })
      .map(p => p.id);
  }

  function expandCluster(pointId: string, neighbors: string[], cluster: string[]) {
    cluster.push(pointId);
    clustered.add(pointId);

    const queue = [...neighbors];
    while (queue.length > 0) {
      const currentId = queue.shift()!;

      if (!visited.has(currentId)) {
        visited.add(currentId);
        const currentNeighbors = regionQuery(currentId);

        if (currentNeighbors.length >= minPts) {
          queue.push(...currentNeighbors.filter(n => !visited.has(n)));
        }
      }

      if (!clustered.has(currentId)) {
        cluster.push(currentId);
        clustered.add(currentId);
      }
    }
  }

  for (const point of points) {
    if (visited.has(point.id)) continue;
    visited.add(point.id);

    const neighbors = regionQuery(point.id);

    if (neighbors.length < minPts) {
      noise.push(point.id);
    } else {
      const cluster: string[] = [];
      expandCluster(point.id, neighbors, cluster);
      clusters.push(cluster);
    }
  }

  return { clusters, noise };
}

// Generate cluster label from thought texts
function generateClusterLabel(texts: string[]): string {
  const wordFreq: Record<string, number> = {};
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'do', 'does', 'this', 'that', 'it', 'i', 'you', 'we', 'they', 'my', 'your', 'our']);

  texts.forEach(text => {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
  });

  const topWords = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  if (topWords.length === 0) return 'Related Thoughts';
  return topWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' & ');
}

export async function getThoughtEmbeddings(
  thoughts: EmbeddingThought[]
): Promise<EmbeddingsResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      embeddings: {},
      similarityMatrix: {},
      clusters: [],
      error: 'Gemini API key not configured'
    };
  }

  if (thoughts.length === 0) {
    return {
      embeddings: {},
      similarityMatrix: {},
      clusters: []
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    // Get embeddings for all thoughts
    const embeddings: Record<string, number[]> = {};

    // Batch embed all texts
    for (const thought of thoughts) {
      if (!thought.text || thought.text.trim().length === 0) {
        embeddings[thought.id] = [];
        continue;
      }

      const result = await model.embedContent(thought.text);
      embeddings[thought.id] = result.embedding.values;
    }

    // Calculate similarity matrix
    const similarityMatrix: Record<string, number> = {};
    const thoughtIds = Object.keys(embeddings).filter(id => embeddings[id].length > 0);

    for (let i = 0; i < thoughtIds.length; i++) {
      for (let j = i + 1; j < thoughtIds.length; j++) {
        const id1 = thoughtIds[i];
        const id2 = thoughtIds[j];
        const similarity = cosineSimilarity(embeddings[id1], embeddings[id2]);
        similarityMatrix[`${id1}-${id2}`] = similarity;
      }
    }

    // Run DBSCAN clustering
    const points = thoughtIds.map(id => ({ id, embedding: embeddings[id] }));
    const { clusters: clusterIds, noise } = dbscan(points, 0.3, 2); // eps=0.3, minPts=2

    // Build cluster objects with labels
    const clusters: SemanticCluster[] = clusterIds.map((thoughtIds, index) => {
      const texts = thoughtIds
        .map(id => thoughts.find(t => t.id === id)?.text || '')
        .filter(t => t.length > 0);

      return {
        id: index,
        thoughtIds,
        label: generateClusterLabel(texts)
      };
    });

    // Add noise points as individual "clusters" if needed
    if (noise.length > 0) {
      clusters.push({
        id: clusters.length,
        thoughtIds: noise,
        label: 'Unclustered'
      });
    }

    return {
      embeddings,
      similarityMatrix,
      clusters
    };

  } catch (error) {
    console.error('Gemini Embeddings error:', error);
    return {
      embeddings: {},
      similarityMatrix: {},
      clusters: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
