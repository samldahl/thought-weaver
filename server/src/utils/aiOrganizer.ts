interface ThoughtData {
  id: string;
  text: string;
  connections: string[];
  prevalence: number;
}

interface Cluster {
  name: string;
  thoughtIds: string[];
  centerX: number;
  centerY: number;
}

interface OrganizedLayout {
  positions: Record<string, { x: number; y: number }>;
  clusters: Cluster[];
  strongConnections: Array<[string, string]>;
}

export async function organizeThoughtsWithAI(thoughts: ThoughtData[]): Promise<OrganizedLayout> {
  // Smart algorithmic approach that positions related thoughts with overlap
  
  if (thoughts.length === 0) {
    return { positions: {}, clusters: [], strongConnections: [] };
  }

  const canvasWidth = 2400;
  const canvasHeight = 1600;
  const padding = 120;

  // Group thoughts by connection strength to identify clusters
  const clusters = identifyClusters(thoughts);
  
  // Arrange clusters in a balanced layout
  const positions: Record<string, { x: number; y: number }> = {};
  
  if (clusters.length === 1) {
    // Single cluster - arrange with overlap for related thoughts
    const cluster = clusters[0];
    positionSingleClusterWithOverlap(cluster, thoughts, positions, canvasWidth, canvasHeight, padding);
    cluster.centerX = canvasWidth / 2;
    cluster.centerY = canvasHeight / 2;
  } else if (clusters.length === 2) {
    // Two clusters - left and right with internal overlap
    positionTwoClusters(clusters, thoughts, positions, canvasWidth, canvasHeight, padding);
  } else if (clusters.length <= 4) {
    // 3-4 clusters - quadrant layout with internal overlap
    positionQuadrantClusters(clusters, thoughts, positions, canvasWidth, canvasHeight, padding);
  } else {
    // Many clusters - grid layout with internal overlap
    positionGridClusters(clusters, thoughts, positions, canvasWidth, canvasHeight, padding);
  }

  // Identify strongest connections for visual emphasis
  const strongConnections: Array<[string, string]> = [];
  thoughts.forEach(thought => {
    if (thought.connections.length >= 3) {
      thought.connections.slice(0, 3).forEach(connId => {
        const pair: [string, string] = [thought.id, connId];
        if (!strongConnections.some(([a, b]) => (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]))) {
          strongConnections.push(pair);
        }
      });
    }
  });

  return { positions, clusters, strongConnections };
}

function positionSingleClusterWithOverlap(
  cluster: Cluster,
  thoughts: ThoughtData[],
  positions: Record<string, { x: number; y: number }>,
  width: number,
  height: number,
  padding: number
) {
  const centerX = width / 2;
  const centerY = height / 2;
  const clusterThoughts = thoughts.filter(t => cluster.thoughtIds.includes(t.id));
  
  // Start with most prevalent thought at center
  const sorted = [...clusterThoughts].sort((a, b) => b.prevalence - a.prevalence);
  
  if (sorted.length === 0) return;
  
  // Place center thought
  positions[sorted[0].id] = { x: centerX, y: centerY };
  const placed = new Set([sorted[0].id]);
  
  // Place remaining thoughts based on connections
  sorted.slice(1).forEach(thought => {
    // Find connected thoughts that are already placed
    const connectedPlaced = thought.connections.filter(id => placed.has(id));
    
    if (connectedPlaced.length > 0) {
      // Average position of connected thoughts
      let avgX = 0, avgY = 0;
      connectedPlaced.forEach(id => {
        avgX += positions[id].x;
        avgY += positions[id].y;
      });
      avgX /= connectedPlaced.length;
      avgY /= connectedPlaced.length;
      
      // Place near connected thoughts with spacing for readability
      const angle = Math.random() * Math.PI * 2;
      const distance = 100 + Math.random() * 50; // More spacing for readability
      positions[thought.id] = {
        x: Math.max(padding, Math.min(width - padding, avgX + Math.cos(angle) * distance)),
        y: Math.max(padding, Math.min(height - padding, avgY + Math.sin(angle) * distance))
      };
    } else {
      // No connections - place in a circle around center with more spacing
      const angle = (placed.size / clusterThoughts.length) * Math.PI * 2;
      const radius = 180 + Math.random() * 60;
      positions[thought.id] = {
        x: Math.max(padding, Math.min(width - padding, centerX + Math.cos(angle) * radius)),
        y: Math.max(padding, Math.min(height - padding, centerY + Math.sin(angle) * radius))
      };
    }
    
    placed.add(thought.id);
  });
}

function identifyClusters(thoughts: ThoughtData[]): Cluster[] {
  const visited = new Set<string>();
  const clusters: Cluster[] = [];
  
  thoughts.forEach(thought => {
    if (visited.has(thought.id)) return;
    
    const cluster: string[] = [];
    const queue = [thought.id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      cluster.push(currentId);
      
      const currentThought = thoughts.find(t => t.id === currentId);
      if (currentThought) {
        currentThought.connections.forEach(connId => {
          if (!visited.has(connId)) {
            queue.push(connId);
          }
        });
      }
    }
    
    if (cluster.length > 0) {
      // Name cluster based on most prevalent thought in it
      const clusterThoughts = thoughts.filter(t => cluster.includes(t.id));
      const mostPrevalent = clusterThoughts.sort((a, b) => b.prevalence - a.prevalence)[0];
      const name = mostPrevalent?.text?.substring(0, 20) || `Cluster ${clusters.length + 1}`;
      
      clusters.push({ name, thoughtIds: cluster, centerX: 0, centerY: 0 });
    }
  });
  
  return clusters;
}

function positionTwoClusters(
  clusters: Cluster[],
  thoughts: ThoughtData[],
  positions: Record<string, { x: number; y: number }>,
  width: number,
  height: number,
  padding: number
) {
  const leftX = width * 0.25;
  const rightX = width * 0.75;
  const centerY = height / 2;
  
  [leftX, rightX].forEach((centerX, clusterIdx) => {
    const cluster = clusters[clusterIdx];
    if (!cluster) return;
    
    const clusterThoughts = thoughts.filter(t => cluster.thoughtIds.includes(t.id));
    const sorted = [...clusterThoughts].sort((a, b) => b.prevalence - a.prevalence);
    
    if (sorted.length === 0) return;
    
    // Place most prevalent at cluster center
    positions[sorted[0].id] = { x: centerX, y: centerY };
    const placed = new Set([sorted[0].id]);
    
    // Position others relative to connections with overlap
    sorted.slice(1).forEach(thought => {
      const connectedPlaced = thought.connections.filter(id => placed.has(id));
      
      if (connectedPlaced.length > 0) {
        let avgX = 0, avgY = 0;
        connectedPlaced.forEach(id => {
          avgX += positions[id].x;
          avgY += positions[id].y;
        });
        avgX /= connectedPlaced.length;
        avgY /= connectedPlaced.length;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 35 + Math.random() * 35; // Overlap distance
        positions[thought.id] = {
          x: avgX + Math.cos(angle) * distance,
          y: avgY + Math.sin(angle) * distance
        };
      } else {
        const angle = (placed.size / clusterThoughts.length) * Math.PI * 2;
        const radius = 90 + Math.random() * 60;
        positions[thought.id] = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        };
      }
      
      placed.add(thought.id);
    });
    
    cluster.centerX = centerX;
    cluster.centerY = centerY;
  });
}

function positionQuadrantClusters(
  clusters: Cluster[],
  thoughts: ThoughtData[],
  positions: Record<string, { x: number; y: number }>,
  width: number,
  height: number,
  padding: number
) {
  const quadrants = [
    { x: width * 0.3, y: height * 0.3 },
    { x: width * 0.7, y: height * 0.3 },
    { x: width * 0.3, y: height * 0.7 },
    { x: width * 0.7, y: height * 0.7 }
  ];
  
  clusters.forEach((cluster, idx) => {
    if (idx >= quadrants.length) return;
    
    const center = quadrants[idx];
    const clusterThoughts = thoughts.filter(t => cluster.thoughtIds.includes(t.id));
    const sorted = [...clusterThoughts].sort((a, b) => b.prevalence - a.prevalence);
    
    if (sorted.length === 0) return;
    
    positions[sorted[0].id] = { x: center.x, y: center.y };
    const placed = new Set([sorted[0].id]);
    
    sorted.slice(1).forEach(thought => {
      const connectedPlaced = thought.connections.filter(id => placed.has(id));
      
      if (connectedPlaced.length > 0) {
        let avgX = 0, avgY = 0;
        connectedPlaced.forEach(id => {
          avgX += positions[id].x;
          avgY += positions[id].y;
        });
        avgX /= connectedPlaced.length;
        avgY /= connectedPlaced.length;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 30;
        positions[thought.id] = {
          x: avgX + Math.cos(angle) * distance,
          y: avgY + Math.sin(angle) * distance
        };
      } else {
        const angle = (placed.size / clusterThoughts.length) * Math.PI * 2;
        const radius = 70 + Math.random() * 50;
        positions[thought.id] = {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius
        };
      }
      
      placed.add(thought.id);
    });
    
    cluster.centerX = center.x;
    cluster.centerY = center.y;
  });
}

function positionGridClusters(
  clusters: Cluster[],
  thoughts: ThoughtData[],
  positions: Record<string, { x: number; y: number }>,
  width: number,
  height: number,
  padding: number
) {
  const cols = Math.ceil(Math.sqrt(clusters.length));
  const rows = Math.ceil(clusters.length / cols);
  
  const cellWidth = (width - padding * 2) / cols;
  const cellHeight = (height - padding * 2) / rows;
  
  clusters.forEach((cluster, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    
    const centerX = padding + cellWidth * (col + 0.5);
    const centerY = padding + cellHeight * (row + 0.5);
    
    const clusterThoughts = thoughts.filter(t => cluster.thoughtIds.includes(t.id));
    const sorted = [...clusterThoughts].sort((a, b) => b.prevalence - a.prevalence);
    
    if (sorted.length === 0) return;
    
    positions[sorted[0].id] = { x: centerX, y: centerY };
    const placed = new Set([sorted[0].id]);
    
    sorted.slice(1).forEach(thought => {
      const connectedPlaced = thought.connections.filter(id => placed.has(id));
      
      if (connectedPlaced.length > 0) {
        let avgX = 0, avgY = 0;
        connectedPlaced.forEach(id => {
          avgX += positions[id].x;
          avgY += positions[id].y;
        });
        avgX /= connectedPlaced.length;
        avgY /= connectedPlaced.length;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 25;
        positions[thought.id] = {
          x: avgX + Math.cos(angle) * distance,
          y: avgY + Math.sin(angle) * distance
        };
      } else {
        const angle = (placed.size / clusterThoughts.length) * Math.PI * 2;
        const maxRadius = Math.min(cellWidth, cellHeight) * 0.3;
        const radius = maxRadius * 0.5 + Math.random() * maxRadius * 0.5;
        positions[thought.id] = {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        };
      }
      
      placed.add(thought.id);
    });
    
    cluster.centerX = centerX;
    cluster.centerY = centerY;
  });
}
