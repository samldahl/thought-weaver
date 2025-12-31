import { useEffect, useRef, useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Lightbulb, TrendingUp, AlertCircle, Sparkles, RotateCcw, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface Thought {
  id: string;
  text: string;
  color: string;
  documentName: string;
  documentId: string;
  documentDate: string;
  x: number;
  y: number;
  size: number;
}

interface ThoughtNode {
  id: string;
  text: string;
  color: string;
  documentName: string;
  x: number;
  y: number;
  targetX?: number;
  targetY?: number;
  vx: number;
  vy: number;
  radius: number;
  connections: string[];
  prevalence: number;
  mergedIds?: string[]; // IDs of thoughts merged into this one
  synthesis?: string; // Combined text for merged thoughts
  isMerged?: boolean; // Flag to indicate this is a merged bubble
  baseRadius?: number; // Original radius before density scaling
  touchCount?: number; // Number of overlapping thoughts
}

interface Pattern {
  type: 'cluster' | 'hub' | 'isolated' | 'theme';
  title: string;
  description: string;
  thoughtIds: string[];
}

interface Cluster {
  name: string;
  thoughtIds: string[];
  centerX: number;
  centerY: number;
}

export function ThoughtConstellation({ thoughts }: { thoughts: Thought[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<ThoughtNode[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isOrganized, setIsOrganized] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [strongConnections, setStrongConnections] = useState<Array<[string, string]>>([]);
  
  // Zoom and pan state - start zoomed out to fit larger canvas
  const [zoom, setZoom] = useState(0.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  
  // Hidden bubbles state
  const [hiddenBubbles, setHiddenBubbles] = useState<Set<string>>(new Set());
  
  // AI Path Questions - analyzes overlaps and connections
  const [aiQuestions, setAiQuestions] = useState<Array<{question: string, relatedThoughts: string[]}>>([]);
  
  // Merge threshold - controls how many bubbles are shown
  const [mergeThreshold, setMergeThreshold] = useState<number>(0.20);
  
  // Manual grouping state
  const [isGroupingMode, setIsGroupingMode] = useState(false);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [manualGroups, setManualGroups] = useState<Array<{
    id: string;
    parentId: string;
    childIds: string[];
    showChildren: boolean;
  }>>([]);

  // Calculate word frequencies across all thoughts
  const wordFrequency = useMemo(() => {
    const freq: Record<string, number> = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they']);
    
    thoughts.forEach(thought => {
      if (!thought.text) return;
      const words = thought.text.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
      words.forEach(word => {
        freq[word] = (freq[word] || 0) + 1;
      });
    });
    
    return freq;
  }, [thoughts]);

  // Calculate patterns including cluster analysis
  const patterns = useMemo(() => {
    const detected: Pattern[] = [];
    
    if (nodes.length === 0) return detected;

    // Detect spatial clusters using density
    const denseClusters = nodes.filter(n => (n.touchCount || 0) >= 3);
    if (denseClusters.length > 0) {
      detected.push({
        type: 'cluster',
        title: `${denseClusters.length} Dense Clusters`,
        description: `These ${denseClusters.length} thought${denseClusters.length > 1 ? 's are' : ' is'} in dense clusters (3+ overlapping). They represent your most interconnected thinking areas.`,
        thoughtIds: denseClusters.map(c => c.id)
      });
    }

    // Find hub thoughts (highly connected)
    const hubs = nodes.filter(n => n.connections.length >= 3).sort((a, b) => b.connections.length - a.connections.length);
    if (hubs.length > 0) {
      const topHub = hubs[0];
      const hubPreview = topHub.text ? topHub.text.substring(0, 50) + (topHub.text.length > 50 ? '...' : '') : 'Key thought';
      detected.push({
        type: 'hub',
        title: `${hubs.length} Central Idea${hubs.length > 1 ? 's' : ''}`,
        description: `"${hubPreview}" and ${hubs.length - 1} other${hubs.length > 2 ? 's' : ''} connect to many thoughts. Focus here to understand your core concepts.`,
        thoughtIds: hubs.map(h => h.id)
      });
    }

    // Find isolated thoughts
    const isolated = nodes.filter(n => n.connections.length === 0);
    if (isolated.length > 0) {
      detected.push({
        type: 'isolated',
        title: `${isolated.length} Standalone Idea${isolated.length > 1 ? 's' : ''}`,
        description: `These thoughts don't connect to others yet. Consider how they might relate to your main themes or if they represent new directions.`,
        thoughtIds: isolated.map(i => i.id)
      });
    }

    // Find common themes (most frequent meaningful words)
    const topWords = Object.entries(wordFrequency)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    if (topWords.length > 0) {
      detected.push({
        type: 'theme',
        title: 'Recurring Themes',
        description: `Words appearing most: ${topWords.map(([word, count]) => `"${word}" (${count}×)`).join(', ')}. These suggest your focus areas.`,
        thoughtIds: []
      });
    }

    return detected;
  }, [nodes, wordFrequency]);

  // Generate synthesis summary with cluster insights
  const synthesis = useMemo(() => {
    if (nodes.length === 0) {
      return "Start adding thoughts to see patterns emerge and understand the connections between your ideas.";
    }

    const hubs = nodes.filter(n => n.connections.length >= 3).sort((a, b) => b.connections.length - a.connections.length);
    const isolated = nodes.filter(n => n.connections.length === 0);
    const denseClusters = nodes.filter(n => (n.touchCount || 0) >= 3);
    const mergedBubbles = nodes.filter(n => n.isMerged);
    const topWords = Object.entries(wordFrequency)
      .filter(([_, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let summary = "";

    // Opening with scope and structure
    if (nodes.length < 5) {
      summary = `You're exploring ${nodes.length} thought${nodes.length > 1 ? 's' : ''}. `;
    } else if (nodes.length < 15) {
      summary = `Your network contains ${nodes.length} thoughts`;
      if (denseClusters.length > 0) {
        summary += ` with ${denseClusters.length} forming dense clusters. `;
      } else {
        summary += ` that are beginning to organize. `;
      }
    } else {
      summary = `You've built a constellation of ${nodes.length} thoughts`;
      if (denseClusters.length > 5) {
        summary += `, with ${denseClusters.length} clustering densely - showing well-developed thinking areas. `;
      } else if (mergedBubbles.length > 0) {
        summary += ` including ${mergedBubbles.length} merged clusters of related ideas. `;
      } else {
        summary += ` forming an interconnected web. `;
      }
    }

    // Core themes and what they mean
    if (topWords.length > 0) {
      const topThemes = topWords.slice(0, 3).map(([word]) => word);
      if (topThemes.length === 1) {
        summary += `**Key Focus: "${topThemes[0]}"** dominates your thinking. `;
      } else if (topThemes.length === 2) {
        summary += `**Main Themes: "${topThemes[0]}" and "${topThemes[1]}"** are your focal points. `;
      } else {
        summary += `**Core Themes: "${topThemes[0]}", "${topThemes[1]}", and "${topThemes[2]}"** form your intellectual landscape. `;
      }
    }

    // Cluster analysis and meaning
    if (denseClusters.length > 0) {
      const largestCluster = denseClusters.sort((a, b) => (b.touchCount || 0) - (a.touchCount || 0))[0];
      if (largestCluster.text) {
        const clusterText = largestCluster.text.substring(0, 40) + (largestCluster.text.length > 40 ? '...' : '');
        summary += `Your densest cluster around "${clusterText}" (touching ${largestCluster.touchCount} thoughts) represents your most developed thinking. `;
      } else {
        summary += `You have ${denseClusters.length} dense cluster${denseClusters.length > 1 ? 's' : ''} where ideas overlap heavily. `;
      }
    }

    // Hub analysis with actionable insight
    if (hubs.length > 0) {
      const topHub = hubs[0];
      const hubText = topHub.text ? `"${topHub.text.substring(0, 35)}${topHub.text.length > 35 ? '...' : ''}"` : 'One thought';
      summary += `**Central Connector:** ${hubText} links to ${topHub.connections.length} other thoughts - `;
      if (topHub.connections.length >= 5) {
        summary += `this is a foundational concept worth exploring deeper. `;
      } else {
        summary += `examine this hub to understand your conceptual structure. `;
      }
    }

    // Network cohesion with actionable advice
    const totalConnections = nodes.reduce((sum, n) => sum + n.connections.length, 0) / 2;
    const avgConnections = nodes.length > 0 ? totalConnections / nodes.length : 0;
    
    if (isolated.length > nodes.length * 0.4) {
      summary += `⚠️ ${isolated.length} thoughts remain isolated. **Action:** Try connecting these to your main themes or consider if they represent new thinking directions. `;
    } else if (avgConnections > 2) {
      summary += `✨ Strong network cohesion indicates well-integrated thinking. `;
    } else {
      summary += `Connections are forming naturally. `;
    }

    // Closing with specific next steps
    if (hubs.length >= 2 && isolated.length > 0) {
      summary += `**Next:** Bridge your ${isolated.length} standalone ideas to your ${hubs.length} hubs to create a more unified understanding.`;
    } else if (denseClusters.length > 0 && isolated.length > 5) {
      summary += `**Next:** Connect isolated thoughts to existing clusters or let them form new clusters as your thinking expands.`;
    } else if (topWords.length > 2) {
      summary += `**Next:** Explore how "${topWords[0][0]}" and "${topWords[1][0]}" relate to deepen your thematic understanding.`;
    } else {
      summary += `**Next:** Continue adding thoughts to reveal deeper patterns and connections.`;
    }

    return summary;
  }, [nodes, wordFrequency]);

  // Calculate suggestions
  const suggestions = useMemo(() => {
    const sugg: string[] = [];
    
    const isolated = nodes.filter(n => n.connections.length === 0);
    const weaklyConnected = nodes.filter(n => n.connections.length === 1);
    const hubs = nodes.filter(n => n.connections.length >= 3);
    
    if (isolated.length > nodes.length * 0.3) {
      sugg.push(`🔗 Many thoughts are isolated. Try connecting related ideas to see clearer patterns.`);
    }
    
    if (hubs.length > 0 && isolated.length > 0) {
      sugg.push(`💡 Explore how your standalone ideas relate to your ${hubs.length} central concept${hubs.length > 1 ? 's' : ''}.`);
    }
    
    if (nodes.length < 10) {
      sugg.push(`📝 Add more thoughts to reveal deeper patterns and connections.`);
    }
    
    if (hubs.length >= 2) {
      sugg.push(`🎯 You have ${hubs.length} strong themes emerging. Consider how they might connect to each other.`);
    }
    
    const topWords = Object.entries(wordFrequency)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    if (topWords.length > 0) {
      sugg.push(`🔍 "${topWords[0][0]}" appears ${topWords[0][1]} times. This seems to be a central focus.`);
    }

    if (sugg.length === 0) {
      sugg.push(`✨ Your thought constellation is taking shape. Keep adding and connecting ideas!`);
    }
    
    return sugg;
  }, [nodes, wordFrequency]);

  useEffect(() => {
    // Calculate similarity between thoughts based on text content
    const calculateSimilarity = (t1: Thought, t2: Thought): number => {
      if (!t1.text || !t2.text) return 0;
      
      const words1 = t1.text.toLowerCase().split(/\s+/);
      const words2 = t2.text.toLowerCase().split(/\s+/);
      
      const set1 = new Set(words1);
      const set2 = new Set(words2);
      
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      
      if (union.size === 0) return 0;
      
      return intersection.size / union.size;
    };

    // Calculate prevalence (how many common/important words a thought contains)
    const calculatePrevalence = (thought: Thought): number => {
      if (!thought.text) return 0;
      const words = thought.text.toLowerCase().split(/\s+/).filter(w => w.length > 2);
      let score = 0;
      words.forEach(word => {
        const freq = wordFrequency[word] || 1;
        score += Math.log(freq + 1); // Log scale so it doesn't explode
      });
      return score / Math.max(words.length, 1);
    };

    // Initialize nodes with random positions
    const initialNodes: ThoughtNode[] = thoughts.map((thought) => {
      const prevalence = calculatePrevalence(thought);
      return {
        id: thought.id,
        text: thought.text,
        color: thought.color,
        documentName: thought.documentName,
        x: Math.random() * 2400,
        y: Math.random() * 1600,
        vx: 0,
        vy: 0,
        radius: Math.max(97.5, Math.min(195, 97.5 + prevalence * 29.25)), // 50% more reading room
        connections: [],
        prevalence
      };
    });

    // Find connections based on similarity
    initialNodes.forEach(node => {
      const thought = thoughts.find(t => t.id === node.id)!;
      thoughts.forEach(otherThought => {
        if (thought.id !== otherThought.id) {
          const similarity = calculateSimilarity(thought, otherThought);
          if (similarity > 0.2) { // Threshold for connection
            node.connections.push(otherThought.id);
          }
        }
      });
    });

    // Merge overlapping thoughts based on strong connections
    const mergeOverlappingThoughts = (nodes: ThoughtNode[]): ThoughtNode[] => {
      const merged: ThoughtNode[] = [];
      const processedIds = new Set<string>();
      
      nodes.forEach(node => {
        if (processedIds.has(node.id)) return;
        
        // Find strongly connected thoughts (similarity > threshold)
        const stronglyConnected = nodes.filter(other => {
          if (other.id === node.id || processedIds.has(other.id)) return false;
          const t1 = thoughts.find(t => t.id === node.id);
          const t2 = thoughts.find(t => t.id === other.id);
          if (!t1 || !t2) return false;
          return calculateSimilarity(t1, t2) > mergeThreshold;
        });
        
        if (stronglyConnected.length > 0) {
          // Create merged node
          const mergeGroup = [node, ...stronglyConnected];
          const allTexts = mergeGroup.map(n => n.text).filter(Boolean);
          const mergedIds = mergeGroup.map(n => n.id);
          
          // Generate synthesis paragraph
          const synthesis = generateSynthesis(allTexts);
          
          // Calculate combined prevalence
          const totalPrevalence = mergeGroup.reduce((sum, n) => sum + n.prevalence, 0);
          const avgPrevalence = totalPrevalence / mergeGroup.length;
          
          // Combine all connections
          const allConnections = new Set<string>();
          mergeGroup.forEach(n => {
            n.connections.forEach(c => {
              if (!mergedIds.includes(c)) {
                allConnections.add(c);
              }
            });
          });
          
          // Create merged bubble with larger radius
          const mergedNode: ThoughtNode = {
            ...node,
            radius: Math.max(156, Math.min(292.5, 156 + totalPrevalence * 39)),
            prevalence: avgPrevalence,
            mergedIds,
            synthesis,
            isMerged: true,
            connections: Array.from(allConnections),
            text: allTexts.join(' • ')
          };
          
          merged.push(mergedNode);
          mergeGroup.forEach(n => processedIds.add(n.id));
        } else {
          // Keep as single node
          merged.push(node);
          processedIds.add(node.id);
        }
      });
      
      return merged;
    };
    
    // Generate synthesis paragraph for merged thoughts
    const generateSynthesis = (texts: string[]): string => {
      if (texts.length === 1) return texts[0];
      
      // Find common themes
      const allWords = texts.flatMap(t => 
        t.toLowerCase().split(/\s+/).filter(w => w.length > 3)
      );
      const wordCounts: Record<string, number> = {};
      allWords.forEach(w => wordCounts[w] = (wordCounts[w] || 0) + 1);
      
      const commonWords = Object.entries(wordCounts)
        .filter(([_, count]) => count > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);
      
      const themes = commonWords.length > 0 
        ? commonWords.join(', ')
        : 'these ideas';
      
      return `This cluster explores ${themes}, connecting ${texts.length} related thoughts: ${texts.map((t, i) => `(${i + 1}) ${t}`).join(' ')}`;
    };

    const mergedNodes = mergeOverlappingThoughts(initialNodes);
    
    // Calculate density-based sizing
    const applyDensityBasedSizing = (nodes: ThoughtNode[]): ThoughtNode[] => {
      return nodes.map(node => {
        // Store base radius if not already stored
        const baseRadius = node.baseRadius || node.radius;
        
        // Calculate touch count (how many circles this node is touching)
        let touchCount = 0;
        nodes.forEach(other => {
          if (other.id === node.id) return;
          
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const sumOfRadii = baseRadius + (other.baseRadius || other.radius);
          
          // Check if circles are touching (distance < sum of radii)
          if (distance < sumOfRadii) {
            touchCount++;
          }
        });
        
        // Apply density scaling: NewSize = OriginalSize * (1 + (TouchCount * 0.25))
        const newRadius = baseRadius * (1 + (touchCount * 0.25));
        
        return {
          ...node,
          baseRadius,
          touchCount,
          radius: newRadius
        };
      });
    };
    
    const densityScaledNodes = applyDensityBasedSizing(mergedNodes);
    setNodes(densityScaledNodes);
    setIsOrganized(false);
    
    // Generate AI questions about overlaps and connections
    generateAIQuestions(densityScaledNodes);
  }, [thoughts, wordFrequency, mergeThreshold]);
  
  // Generate AI questions based on thought overlaps and connections
  const generateAIQuestions = (nodes: ThoughtNode[]) => {
    const questions: Array<{question: string, relatedThoughts: string[]}> = [];
    
    // Find overlapping clusters
    const clusters = nodes.filter(n => n.mergedIds && n.mergedIds.length > 1);
    
    clusters.forEach((cluster, idx) => {
      if (!cluster.synthesis || !cluster.mergedIds) return;
      
      // Extract theme from synthesis
      const themeMatch = cluster.text.match(/^(.+?):/);
      const theme = themeMatch ? themeMatch[1] : 'this cluster';
      
      // Get the actual thought texts
      const thoughtTexts = cluster.mergedIds
        .map(id => thoughts.find(t => t.id === id)?.text)
        .filter(Boolean)
        .slice(0, 3);
      
      if (thoughtTexts.length === 0) return;
      
      // Generate questions based on cluster size and content
      if (cluster.mergedIds.length >= 5) {
        questions.push({
          question: `What is the core insight connecting your ${cluster.mergedIds.length} thoughts about ${theme}?`,
          relatedThoughts: cluster.mergedIds
        });
        questions.push({
          question: `How would you prioritize these ${theme} ideas - which should you act on first?`,
          relatedThoughts: cluster.mergedIds
        });
      } else {
        questions.push({
          question: `You have ${cluster.mergedIds.length} overlapping thoughts about ${theme}. What pattern or solution are they pointing toward?`,
          relatedThoughts: cluster.mergedIds
        });
      }
      
      // Ask about specific thought connections
      if (thoughtTexts.length >= 2) {
        questions.push({
          question: `These thoughts seem related: "${thoughtTexts[0]?.substring(0, 40)}..." and "${thoughtTexts[1]?.substring(0, 40)}...". What's the bridge between them?`,
          relatedThoughts: cluster.mergedIds.slice(0, 2)
        });
      }
    });
    
    // Find isolated thoughts
    const isolated = nodes.filter(n => n.connections.length === 0 && n.mergedIds && n.mergedIds.length > 0);
    if (isolated.length > 0) {
      const isolatedThought = thoughts.find(t => t.id === isolated[0].mergedIds?.[0]);
      if (isolatedThought) {
        questions.push({
          question: `"${isolatedThought.text.substring(0, 50)}..." stands alone. Does this connect to any of your main themes, or is it a new direction?`,
          relatedThoughts: isolated[0].mergedIds || []
        });
      }
    }
    
    // Ask about the overall path
    if (clusters.length >= 2) {
      const topClusters = clusters
        .sort((a, b) => (b.mergedIds?.length || 0) - (a.mergedIds?.length || 0))
        .slice(0, 2);
      
      const theme1 = topClusters[0].text.match(/^(.+?):/)?.[1] || 'Cluster 1';
      const theme2 = topClusters[1].text.match(/^(.+?):/)?.[1] || 'Cluster 2';
      
      questions.push({
        question: `Your thinking has two major threads: ${theme1} and ${theme2}. How do these themes relate to each other?`,
        relatedThoughts: [...(topClusters[0].mergedIds || []), ...(topClusters[1].mergedIds || [])]
      });
    }
    
    // Limit to 5 most relevant questions
    setAiQuestions(questions.slice(0, 5));
  };

  // AI Organize function
  const handleOrganize = async () => {
    if (nodes.length === 0) return;
    
    setIsOrganizing(true);
    try {
      const thoughtData = nodes.map(node => ({
        id: node.id,
        text: node.text,
        connections: node.connections,
        prevalence: node.prevalence
      }));

      const response = await fetch('http://localhost:5001/api/documents/thoughts/organize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ thoughts: thoughtData })
      });

      if (!response.ok) throw new Error('Failed to organize');

      const organized = await response.json();
      
      // Set target positions for smooth animation
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          targetX: organized.positions[node.id]?.x ?? node.x,
          targetY: organized.positions[node.id]?.y ?? node.y,
          vx: 0,
          vy: 0
        }))
      );
      
      setClusters(organized.clusters || []);
      setStrongConnections(organized.strongConnections || []);
      setIsOrganized(true);
    } catch (error) {
      console.error('Failed to organize thoughts:', error);
    } finally {
      setIsOrganizing(false);
    }
  };

  const handleReset = () => {
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        targetX: undefined,
        targetY: undefined
      }))
    );
    setIsOrganized(false);
    setClusters([]);
    setStrongConnections([]);
  };

  // Zoom and Pan handlers
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(4, zoom * delta));
    
    // Zoom towards mouse position
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomPoint = {
        x: (mouseX - pan.x) / zoom,
        y: (mouseY - pan.y) / zoom
      };
      
      setPan({
        x: mouseX - zoomPoint.x * newZoom,
        y: mouseY - zoomPoint.y * newZoom
      });
    }
    
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // Left click
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panStartRef.current.panX + dx,
        y: panStartRef.current.panY + dy
      });
    }
    
    // Update hovered node
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Account for canvas scaling (internal size vs display size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const canvasX = (mouseX - pan.x) / zoom;
    const canvasY = (mouseY - pan.y) / zoom;

    const hovered = nodes.find(node => {
      const dx = node.x - canvasX;
      const dy = node.y - canvasY;
      return Math.sqrt(dx * dx + dy * dy) < node.radius;
    });

    setHoveredNode(hovered?.id || null);
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(4, prev * 1.2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(0.2, prev / 1.2));
  };

  const handleResetView = () => {
    setZoom(0.4);
    setPan({ x: 0, y: 0 });
  };
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) return; // Don't toggle on pan
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    // Account for canvas scaling (internal size vs display size)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;
    
    const canvasX = (mouseX - pan.x) / zoom;
    const canvasY = (mouseY - pan.y) / zoom;

    const clicked = nodes.find(node => {
      if (hiddenBubbles.has(node.id)) return false;
      const dx = node.x - canvasX;
      const dy = node.y - canvasY;
      return Math.sqrt(dx * dx + dy * dy) < node.radius;
    });

    if (clicked) {
      if (isGroupingMode) {
        // In grouping mode, toggle selection
        setSelectedNodes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(clicked.id)) {
            newSet.delete(clicked.id);
          } else {
            newSet.add(clicked.id);
          }
          return newSet;
        });
      } else {
        // Normal mode - check if this is a parent node
        const group = manualGroups.find(g => g.parentId === clicked.id);
        if (group) {
          // Toggle show children
          setManualGroups(prev => prev.map(g => 
            g.id === group.id ? { ...g, showChildren: !g.showChildren } : g
          ));
        } else {
          // Regular hide/show toggle
          setHiddenBubbles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(clicked.id)) {
              newSet.delete(clicked.id);
            } else {
              newSet.add(clicked.id);
            }
            return newSet;
          });
        }
      }
    }
  };
  
  const handleShowAll = () => {
    setHiddenBubbles(new Set());
  };
  
  const handleCreateGroup = () => {
    if (selectedNodes.size < 2) {
      alert('Select at least 2 bubbles to create a group');
      return;
    }
    
    const selectedNodeIds = Array.from(selectedNodes);
    const selectedNodeObjects = nodes.filter(n => selectedNodeIds.includes(n.id));
    
    // Calculate center position for parent
    const avgX = selectedNodeObjects.reduce((sum, n) => sum + n.x, 0) / selectedNodeObjects.length;
    const avgY = selectedNodeObjects.reduce((sum, n) => sum + n.y, 0) / selectedNodeObjects.length;
    
    // Create parent node
    const parentId = `group-parent-${Date.now()}`;
    const groupId = `group-${Date.now()}`;
    
    const combinedTexts = selectedNodeObjects.map(n => n.text).join(' • ');
    const totalPrevalence = selectedNodeObjects.reduce((sum, n) => sum + n.prevalence, 0);
    
    const parentNode: ThoughtNode = {
      id: parentId,
      text: `Group: ${selectedNodes.size} thoughts`,
      color: selectedNodeObjects[0].color,
      documentName: 'Manual Group',
      x: avgX,
      y: avgY,
      vx: 0,
      vy: 0,
      radius: Math.max(100, Math.min(200, 100 + selectedNodes.size * 15)),
      connections: [],
      prevalence: totalPrevalence / selectedNodes.size,
      mergedIds: selectedNodeIds,
      synthesis: combinedTexts,
      isMerged: true,
      baseRadius: Math.max(100, Math.min(200, 100 + selectedNodes.size * 15)),
      touchCount: 0
    };
    
    // Add parent to nodes, hide children
    setNodes(prev => [...prev, parentNode]);
    setManualGroups(prev => [...prev, {
      id: groupId,
      parentId,
      childIds: selectedNodeIds,
      showChildren: false
    }]);
    
    // Hide children by default
    setHiddenBubbles(prev => new Set([...prev, ...selectedNodeIds]));
    
    // Exit grouping mode and clear selection
    setIsGroupingMode(false);
    setSelectedNodes(new Set());
  };
  
  const handleCancelGrouping = () => {
    setIsGroupingMode(false);
    setSelectedNodes(new Set());
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (nodes.length === 0) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      // Save context and apply zoom/pan
      ctx.save();
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);

      // Update physics
      const updatedNodes = nodes.map(node => {
        // If in organized mode, smoothly move to target position
        if (isOrganized && node.targetX !== undefined && node.targetY !== undefined) {
          const dx = node.targetX - node.x;
          const dy = node.targetY - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 1) {
            const speed = 0.1;
            return {
              ...node,
              x: node.x + dx * speed,
              y: node.y + dy * speed,
              vx: 0,
              vy: 0
            };
          } else {
            return {
              ...node,
              x: node.targetX,
              y: node.targetY,
              vx: 0,
              vy: 0
            };
          }
        }

        // No physics - keep nodes stationary
        return node;
      });

      // Recalculate density-based sizing after physics update
      const densityUpdatedNodes = updatedNodes.map(node => {
        const baseRadius = node.baseRadius || node.radius;
        
        // Calculate current touch count
        let touchCount = 0;
        updatedNodes.forEach(other => {
          if (other.id === node.id) return;
          
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const sumOfRadii = baseRadius + (other.baseRadius || other.radius);
          
          if (distance < sumOfRadii) {
            touchCount++;
          }
        });
        
        // Apply density scaling - reduced to prevent overlaps
        const newRadius = baseRadius * (1 + (touchCount * 0.15));
        
        return {
          ...node,
          touchCount,
          radius: newRadius
        };
      });

      setNodes(densityUpdatedNodes);

      // Draw cluster backgrounds if organized
      if (isOrganized && clusters.length > 0) {
        clusters.forEach((cluster, idx) => {
          const clusterNodes = updatedNodes.filter(n => cluster.thoughtIds.includes(n.id));
          if (clusterNodes.length === 0) return;
          
          // Find bounds
          const xs = clusterNodes.map(n => n.x);
          const ys = clusterNodes.map(n => n.y);
          const minX = Math.min(...xs) - 40;
          const maxX = Math.max(...xs) + 40;
          const minY = Math.min(...ys) - 40;
          const maxY = Math.max(...ys) + 40;
          
          // Draw cluster background - more subtle
          ctx.fillStyle = `rgba(139, 92, 246, 0.02)`;
          ctx.strokeStyle = `rgba(139, 92, 246, 0.2)`;
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.roundRect(minX, minY, maxX - minX, maxY - minY, 15);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Draw cluster label
          ctx.fillStyle = 'rgba(139, 92, 246, 0.8)';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(cluster.name, (minX + maxX) / 2, minY - 10);
        });
      }

      // Draw strong connections first (if organized)
      if (isOrganized && strongConnections.length > 0) {
        strongConnections.forEach(([id1, id2]) => {
          const node1 = updatedNodes.find(n => n.id === id1);
          const node2 = updatedNodes.find(n => n.id === id2);
          if (node1 && node2) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(node1.x, node1.y);
            ctx.lineTo(node2.x, node2.y);
            ctx.stroke();
          }
        });
      }

      // Draw connections with varying opacity based on connection strength
      updatedNodes.forEach(node => {
        node.connections.forEach(connId => {
          const connected = updatedNodes.find(n => n.id === connId);
          if (connected) {
            // Skip if this is a strong connection (already drawn)
            if (isOrganized && strongConnections.some(([a, b]) => 
              (a === node.id && b === connId) || (a === connId && b === node.id)
            )) {
              return;
            }
            
            // Stronger connections for thoughts with similar prevalence
            const avgPrevalence = (node.prevalence + connected.prevalence) / 2;
            const opacity = Math.min(0.25, 0.05 + avgPrevalence * 0.03);
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity})`;
            ctx.lineWidth = 0.5 + avgPrevalence * 0.15;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(connected.x, connected.y);
            ctx.stroke();
          }
        });
      });

      // Draw nodes - render hovered node last so it's on top
      const renderNode = (node: ThoughtNode) => {
        const isHovered = hoveredNode === node.id;
        const isSelected = isGroupingMode && selectedNodes.has(node.id);
        
        // Selection ring for grouping mode
        if (isSelected) {
          ctx.strokeStyle = '#22c55e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 10, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Enhanced glow effect for hovered node
        if (isHovered) {
          ctx.shadowBlur = 30;
          ctx.shadowColor = node.color;
        }

        // Special rendering for merged bubbles
        if (node.isMerged) {
          // Draw double ring to indicate merged bubble
          ctx.strokeStyle = node.color;
          ctx.lineWidth = isHovered ? 4 : 3;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.strokeStyle = `${node.color}80`;
          ctx.lineWidth = isHovered ? 3 : 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 9, 0, Math.PI * 2);
          ctx.stroke();
          
          // Transparent fill with colored stroke for merged bubbles
          ctx.strokeStyle = node.color;
          ctx.lineWidth = isHovered ? 5 : 4;
        } else {
          // Draw outer ring for high-prevalence thoughts
          if (node.prevalence > 1.5) {
            ctx.strokeStyle = node.color;
            ctx.lineWidth = isHovered ? 4 : 3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.radius + 3, 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.strokeStyle = node.color;
          ctx.lineWidth = isHovered ? 4 : 3;
        }

        // Draw transparent circle with stroke only
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Very subtle fill for visibility
        ctx.fillStyle = `${node.color}15`;
        ctx.fill();

        ctx.shadowBlur = 0;
        
        // Draw merged count badge for merged bubbles
        if (node.isMerged && node.mergedIds && node.mergedIds.length > 1) {
          const badgeRadius = 10;
          const badgeX = node.x;
          const badgeY = node.y - node.radius - 12;
          
          ctx.fillStyle = 'rgba(139, 92, 246, 0.9)';
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${node.mergedIds.length}`, badgeX, badgeY);
        }

        // Draw connection count badge
        if (node.connections.length > 0) {
          const badgeRadius = 8;
          const badgeX = node.x + node.radius * 0.6;
          const badgeY = node.y - node.radius * 0.6;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'white';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(node.connections.length.toString(), badgeX, badgeY);
        }

        // Draw text preview with enhanced readability
        if (node.radius > 20 && node.text) {
          // Add semi-transparent background behind text for contrast
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 0.85, 0, Math.PI * 2);
          ctx.fill();
          
          // Larger, bolder text with thick outline
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.95)';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          
          // Multi-line text for larger bubbles
          if (node.radius > 40) {
            const fontSize = Math.min(16.2, node.radius / 4);
            ctx.font = `900 ${fontSize}px sans-serif`; // Extra bold
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Split into words and wrap intelligently
            const words = node.text.split(/\s+/);
            const lines: string[] = [];
            let currentLine = '';
            const maxWidth = node.radius * 1.8;
            
            words.forEach(word => {
              const testLine = currentLine ? `${currentLine} ${word}` : word;
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
              } else {
                currentLine = testLine;
              }
            });
            if (currentLine) lines.push(currentLine);
            
            // Draw max 3 lines with better spacing
            const linesToShow = lines.slice(0, 3);
            const lineHeight = fontSize * 1.3;
            const startY = node.y - ((linesToShow.length - 1) * lineHeight) / 2;
            
            linesToShow.forEach((line, i) => {
              const y = startY + i * lineHeight;
              let displayLine = line;
              
              // Smart truncation - try to show complete words
              if (i === linesToShow.length - 1 && lines.length > linesToShow.length) {
                const availableWidth = maxWidth;
                let truncated = line;
                while (ctx.measureText(truncated + '...').width > availableWidth && truncated.length > 0) {
                  truncated = truncated.substring(0, truncated.lastIndexOf(' '));
                }
                displayLine = truncated ? truncated + '...' : line.substring(0, Math.floor(maxWidth / fontSize)) + '...';
              }
              
              // Draw text with thick outline for maximum readability
              ctx.strokeText(displayLine, node.x, y);
              ctx.strokeText(displayLine, node.x, y); // Double stroke for extra thickness
              ctx.fillText(displayLine, node.x, y);
            });
          } else if (node.radius > 25) {
            // Medium bubbles - single or two lines
            const fontSize = Math.min(12.6, node.radius / 3.5);
            ctx.font = `900 ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const words = node.text.split(/\s+/);
            const maxWidth = node.radius * 1.7;
            
            // Try to fit 2 lines
            let line1 = '';
            let line2 = '';
            
            for (const word of words) {
              const testLine1 = line1 ? `${line1} ${word}` : word;
              if (ctx.measureText(testLine1).width <= maxWidth) {
                line1 = testLine1;
              } else if (!line2) {
                line2 = word;
              } else {
                const testLine2 = `${line2} ${word}`;
                if (ctx.measureText(testLine2).width <= maxWidth) {
                  line2 = testLine2;
                } else {
                  break;
                }
              }
            }
            
            if (line2) {
              // Two lines
              const lineHeight = fontSize * 1.2;
              ctx.strokeText(line1, node.x, node.y - lineHeight / 2);
              ctx.strokeText(line1, node.x, node.y - lineHeight / 2);
              ctx.fillText(line1, node.x, node.y - lineHeight / 2);
              
              const displayLine2 = line2 + (words.length > (line1.split(' ').length + line2.split(' ').length) ? '...' : '');
              ctx.strokeText(displayLine2, node.x, node.y + lineHeight / 2);
              ctx.strokeText(displayLine2, node.x, node.y + lineHeight / 2);
              ctx.fillText(displayLine2, node.x, node.y + lineHeight / 2);
            } else {
              // One line
              ctx.strokeText(line1, node.x, node.y);
              ctx.strokeText(line1, node.x, node.y);
              ctx.fillText(line1, node.x, node.y);
            }
          } else {
            // Small bubbles - minimal text with larger font
            const fontSize = Math.min(10.8, node.radius / 2);
            ctx.font = `900 ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Show first few characters of first word
            const firstWord = node.text.split(/\s+/)[0];
            const maxChars = Math.floor(node.radius / 4.5);
            const preview = firstWord.substring(0, Math.max(3, maxChars)) + (firstWord.length > maxChars ? '...' : '');
            
            ctx.strokeText(preview, node.x, node.y);
            ctx.strokeText(preview, node.x, node.y);
            ctx.fillText(preview, node.x, node.y);
          }
        }
      };
      
      // Filter out hidden bubbles and children of collapsed groups
      const visibleNodes = updatedNodes.filter(node => {
        if (hiddenBubbles.has(node.id)) return false;
        
        // Check if this node is a child of a collapsed group
        const isChild = manualGroups.some(g => 
          !g.showChildren && g.childIds.includes(node.id)
        );
        return !isChild;
      });
      
      // Draw non-hovered nodes first
      visibleNodes.forEach(node => {
        if (node.id !== hoveredNode) {
          renderNode(node);
        }
      });
      
      // Draw hovered node last so it appears on top
      if (hoveredNode && !hiddenBubbles.has(hoveredNode)) {
        const hovered = visibleNodes.find(n => n.id === hoveredNode);
        if (hovered) {
          renderNode(hovered);
        }
      }

      // Restore context after zoom/pan
      ctx.restore();

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [nodes, hoveredNode, isOrganized, clusters, strongConnections, zoom, pan, hiddenBubbles]);

  const hoveredThought = nodes.find(n => n.id === hoveredNode);

  return (
    <div className="flex gap-6">
      {/* Main Canvas */}
      <Card className="flex-1 p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Thought Constellation 🌌</h2>
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2 border-r pr-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Bubble Count:</span>
              <select
                value={mergeThreshold}
                onChange={(e) => setMergeThreshold(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                <option value={0.40}>Minimal (Fewest)</option>
                <option value={0.30}>Few</option>
                <option value={0.20}>Balanced</option>
                <option value={0.15}>Many</option>
                <option value={0.10}>Maximum (Most)</option>
              </select>
            </div>
            <Button
              onClick={handleZoomIn}
              size="sm"
              variant="outline"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleZoomOut}
              size="sm"
              variant="outline"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleResetView}
              size="sm"
              variant="outline"
              title="Reset View"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            {hiddenBubbles.size > 0 && (
              <Button
                onClick={handleShowAll}
                size="sm"
                variant="secondary"
                className="gap-2"
                title="Show all hidden bubbles"
              >
                Show All ({hiddenBubbles.size} hidden)
              </Button>
            )}
            {!isOrganized ? (
              <Button
                onClick={handleOrganize}
                disabled={isOrganizing || thoughts.length === 0}
                size="sm"
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                {isOrganizing ? 'Organizing...' : 'Connect the Dots'}
              </Button>
            ) : (
              <Button
                onClick={handleReset}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Layout
              </Button>
            )}
            {isGroupingMode && (
              <>
                <Button
                  onClick={handleCreateGroup}
                  disabled={selectedNodes.size < 2}
                  size="sm"
                  variant="default"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  Create Group ({selectedNodes.size} selected)
                </Button>
                <Button
                  onClick={handleCancelGrouping}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </>
            )}
            {!isGroupingMode && (
              <Button
                onClick={() => setIsGroupingMode(true)}
                size="sm"
                variant="outline"
                className="gap-2"
              >
                Manual Group
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          {thoughts.length} thoughts combined into {nodes.length} clusters. {isOrganized && '✨ AI-organized into clusters.'} {isGroupingMode ? '🔵 Click bubbles to select for grouping.' : 'Click bubbles to hide/show.'}
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Bubble size = word frequency & importance</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-purple-500/40"></div>
            <span>Lines = shared concepts</span>
          </div>
          {isOrganized && (
            <>
              <div className="flex items-center gap-2">
                <div className="w-6 h-0.5 bg-yellow-500"></div>
                <span>Strong connections (golden)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-purple-500/30 border-dashed rounded bg-purple-500/5"></div>
                <span>Thought clusters</span>
              </div>
            </>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-black/70 flex items-center justify-center text-white text-[8px] font-bold">3</div>
            <span>Connection count</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full border-2 border-purple-500 bg-gradient-to-br from-purple-500 to-purple-700"></div>
            <span>Merged bubbles (combined thoughts)</span>
          </div>
        </div>
        <div 
          ref={containerRef}
          className="relative"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onClick={handleCanvasClick}
        >
          <canvas
            ref={canvasRef}
            width={2400}
            height={1600}
            className="border rounded-lg bg-slate-950 cursor-pointer w-full"
            onMouseLeave={() => setHoveredNode(null)}
          />
          {hoveredThought && (
            <Card className="absolute top-4 right-4 p-4 max-w-md bg-background/95 backdrop-blur">
              <p className="text-xs text-muted-foreground mb-1">{hoveredThought.documentName}</p>
              {hoveredThought.isMerged && hoveredThought.synthesis ? (
                <>
                  <div className="mb-2 pb-2 border-b">
                    <Badge variant="secondary" className="mb-2">
                      Merged: {hoveredThought.mergedIds?.length || 0} thoughts
                    </Badge>
                    <p className="text-sm leading-relaxed">{hoveredThought.synthesis}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm font-medium mb-2">{hoveredThought.text || 'Empty thought'}</p>
              )}
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: hoveredThought.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {hoveredThought.connections.length} connections
                </span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Prevalence: {hoveredThought.prevalence.toFixed(2)}</div>
                {hoveredThought.touchCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <span>Touch Count: {hoveredThought.touchCount}</span>
                    <Badge variant="outline" className="text-[10px] px-1 py-0">
                      {(hoveredThought.radius / (hoveredThought.baseRadius || hoveredThought.radius) * 100).toFixed(0)}% size
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </Card>

      {/* Insights Panel */}
      <Card className="w-96 p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Insights
        </h3>
        
        <ScrollArea className="h-[600px] pr-4">
          {/* Synthesis Summary */}
          <div className="mb-6">
            <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                ✨ Thought Synthesis
              </h4>
              <p className="text-sm leading-relaxed text-foreground/90" dangerouslySetInnerHTML={{ 
                __html: synthesis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
              }} />
            </Card>
          </div>

          {/* AI Path Questions - Help clarify connections */}
          {aiQuestions.length > 0 && (
            <div className="mb-6">
              <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  🤔 AI Questions - Finding Your Path
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  The AI analyzed your overlapping thoughts to help you understand the connections
                </p>
                <div className="space-y-3">
                  {aiQuestions.map((item, i) => (
                    <div key={i} className="p-3 bg-background/50 rounded-lg border border-blue-500/30">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="text-blue-500 font-bold text-xs">{i + 1}.</span>
                        <p className="text-sm font-medium leading-relaxed">{item.question}</p>
                      </div>
                      <div className="ml-5 mt-2">
                        <Badge variant="outline" className="text-[10px]">
                          {item.relatedThoughts.length} related thought{item.relatedThoughts.length > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* Cluster Summaries - Most Important Section */}
          {(() => {
            const denseClusters = nodes.filter(n => (n.touchCount || 0) >= 3)
              .sort((a, b) => (b.touchCount || 0) - (a.touchCount || 0))
              .slice(0, 3);
            const mergedBubbles = nodes.filter(n => n.isMerged).slice(0, 3);
            
            return (denseClusters.length > 0 || mergedBubbles.length > 0) && (
              <div className="mb-6">
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Key Clusters
                </h4>
                <div className="space-y-3">
                  {denseClusters.slice(0, 3).map((cluster, i) => (
                    <Card key={`cluster-${i}`} className="p-3 bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/30">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge className="bg-purple-500 text-white">
                          {cluster.touchCount} overlaps
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Dense cluster #{i + 1}</span>
                      </div>
                      <p className="text-xs font-medium mb-1 leading-relaxed">
                        {cluster.text && cluster.text.length > 80 
                          ? cluster.text.substring(0, 80) + '...' 
                          : cluster.text}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {cluster.connections.length} connections • This represents a highly developed thinking area
                      </p>
                    </Card>
                  ))}
                  
                  {mergedBubbles.map((merged, i) => (
                    <Card key={`merged-${i}`} className="p-3 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/30">
                      <div className="flex items-start gap-2 mb-2">
                        <Badge variant="outline" className="border-blue-500 text-blue-500">
                          {merged.mergedIds?.length || 0} thoughts merged
                        </Badge>
                      </div>
                      {merged.synthesis && (
                        <p className="text-xs leading-relaxed">
                          {merged.synthesis.length > 120 
                            ? merged.synthesis.substring(0, 120) + '...' 
                            : merged.synthesis}
                        </p>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Patterns Section */}
          <div className="mb-6">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Patterns Detected
            </h4>
            <div className="space-y-3">
              {patterns.map((pattern, i) => (
                <Card key={i} className="p-3 bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-start gap-2">
                    <Badge variant={
                      pattern.type === 'hub' ? 'default' : 
                      pattern.type === 'cluster' ? 'default' :
                      pattern.type === 'isolated' ? 'secondary' : 
                      'outline'
                    } className={
                      pattern.type === 'cluster' ? 'bg-purple-500' : ''
                    }>
                      {pattern.type}
                    </Badge>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{pattern.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{pattern.description}</p>
                    </div>
                  </div>
                </Card>
              ))}
              {patterns.length === 0 && (
                <p className="text-sm text-muted-foreground">Add more thoughts to detect patterns...</p>
              )}
            </div>
          </div>

          {/* Suggestions Section */}
          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Next Steps
            </h4>
            <div className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <div key={i} className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold text-sm mb-3">Network Statistics</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Total Thoughts</div>
                <div className="font-bold text-lg">{nodes.length}</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Connections</div>
                <div className="font-bold text-lg">{nodes.reduce((sum, n) => sum + n.connections.length, 0) / 2}</div>
              </div>
              <div className="p-2 bg-purple-500/10 rounded border border-purple-500/30">
                <div className="text-muted-foreground text-xs">Dense Clusters</div>
                <div className="font-bold text-lg text-purple-500">{nodes.filter(n => (n.touchCount || 0) >= 3).length}</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Hub Thoughts</div>
                <div className="font-bold text-lg">{nodes.filter(n => n.connections.length >= 3).length}</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Merged Bubbles</div>
                <div className="font-bold text-lg">{nodes.filter(n => n.isMerged).length}</div>
              </div>
              <div className="p-2 bg-muted/50 rounded">
                <div className="text-muted-foreground text-xs">Isolated</div>
                <div className="font-bold text-lg">{nodes.filter(n => n.connections.length === 0).length}</div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
