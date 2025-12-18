<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { MeshNode } from '../../types/mesh';
import * as d3 from 'd3';
import { useQA } from '../../utils/qa';
const { isQAMode, qa, slug } = useQA();

// Define custom node type that extends SimulationNodeDatum
interface D3Node extends d3.SimulationNodeDatum, MeshNode {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

// Define custom link type
interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  mediaType: string;
}

const { t } = useI18n();

const props = defineProps<{
  nodes: MeshNode[];
}>();

const svgContainer = ref<HTMLDivElement | null>(null);
const hoveredNode = ref<MeshNode | null>(null);
const hoverPosition = ref({ x: 0, y: 0 });
const selectedNode = ref<MeshNode | null>(null);
const simulation = ref<d3.Simulation<D3Node, D3Link> | null>(null);

// Constants for node sizes and layout
const NODE_SIZES = {
  Controller: 60,
  Agent: 48,
  Client: 40
};

// Load images
const controllerIcon = new URL('/src/assets/icons/mesh_map/controller.png', import.meta.url).href;
const agentIcon = new URL('/src/assets/icons/mesh_map/agent.png', import.meta.url).href;
const clientIcon = new URL('/src/assets/icons/mesh_map/client.png', import.meta.url).href;

const getNodeIcon = (nodeType: string) => {
  switch (nodeType) {
    case 'Controller': return controllerIcon;
    case 'Agent': return agentIcon;
    case 'Client': return clientIcon;
    default: return clientIcon;
  }
};

const getNodeSize = (nodeType: string) => {
  return NODE_SIZES[nodeType as keyof typeof NODE_SIZES] || NODE_SIZES.Client;
};

// Calculate hierarchical levels for each node
const calculateHierarchy = (nodes: MeshNode[]) => {
  const nodeMap = new Map<string, { node: MeshNode; level: number }>();
  const macToNode = new Map<string, MeshNode>();

  // Build MAC to node mapping
  nodes.forEach(node => {
    macToNode.set(node.MACAddress, node);
  });

  // Find controller (root node) - node with Upstream === '-'
  const controller = nodes.find(n => n.Upstream === '-');
  if (!controller) {
    // If no controller found, treat first node as root
    nodes.forEach((node, idx) => {
      nodeMap.set(node.MACAddress, { node, level: idx === 0 ? 0 : 1 });
    });
    return nodeMap;
  }

  // BFS to assign levels
  const queue: Array<{ mac: string; level: number }> = [{ mac: controller.MACAddress, level: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { mac, level } = queue.shift()!;

    if (visited.has(mac)) continue;
    visited.add(mac);

    const node = macToNode.get(mac);
    if (node) {
      nodeMap.set(mac, { node, level });

      // Find all children (nodes whose Upstream is this node's MAC)
      const children = nodes.filter(n => n.Upstream === mac);
      children.forEach(child => {
        queue.push({ mac: child.MACAddress, level: level + 1 });
      });
    }
  }

  // Add any remaining nodes that weren't reached
  nodes.forEach(node => {
    if (!nodeMap.has(node.MACAddress)) {
      nodeMap.set(node.MACAddress, { node, level: 0 });
    }
  });

  return nodeMap;
};

// Prepare nodes and links for D3 with hierarchical positioning
const prepareNodesAndLinks = () => {
  const hierarchy = calculateHierarchy(props.nodes);

  // Group nodes by level
  const levelGroups = new Map<number, MeshNode[]>();
  hierarchy.forEach(({ node, level }) => {
    if (!levelGroups.has(level)) {
      levelGroups.set(level, []);
    }
    levelGroups.get(level)!.push(node);
  });

  // Create D3 nodes with initial positions
  const nodeMap = new Map<string, D3Node>();
  props.nodes.forEach(node => {
    nodeMap.set(node.MACAddress, { ...node });
  });

  // Create links array ensuring both source and target nodes exist
  const links: D3Link[] = props.nodes
    .filter(node => node.Upstream !== '-' && nodeMap.has(node.Upstream))
    .map(node => ({
      source: nodeMap.get(node.Upstream)!,
      target: nodeMap.get(node.MACAddress)!,
      mediaType: node.MediaType
    }));

  return { nodes: Array.from(nodeMap.values()), links, hierarchy };
};

const createSimulation = (width: number, height: number) => {
  const { nodes, links, hierarchy } = prepareNodesAndLinks();

  // Calculate the number of levels
  const maxLevel = Math.max(...Array.from(hierarchy.values()).map(h => h.level));
  const verticalPadding = 80;
  const levelHeight = (height - verticalPadding * 2) / Math.max(maxLevel, 1);

  // Group nodes by level for positioning
  const levelGroups = new Map<number, D3Node[]>();
  hierarchy.forEach(({ level }, mac) => {
    const node = nodes.find(n => n.MACAddress === mac);
    if (node) {
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(node);
    }
  });

  // Calculate positions for each level
  levelGroups.forEach((nodesInLevel, level) => {
    const y = verticalPadding + level * levelHeight;

    // Calculate horizontal spacing
    const horizontalPadding = 80;
    const availableWidth = width - horizontalPadding * 2;
    const nodeCount = nodesInLevel.length;

    if (nodeCount === 1) {
      // Center single node
      nodesInLevel[0].fx = width / 2;
      nodesInLevel[0].fy = y;
    } else {
      // Distribute multiple nodes evenly
      const spacing = availableWidth / (nodeCount - 1);
      nodesInLevel.forEach((node, index) => {
        node.fx = horizontalPadding + spacing * index;
        node.fy = y;
      });
    }
  });

  // Use minimal force simulation just to handle rendering
  const sim = d3.forceSimulation<D3Node>()
    .nodes(nodes)
    .force('link', d3.forceLink<D3Node, D3Link>(links)
      .id(d => d.MACAddress)
      .distance(levelHeight * 0.8)
      .strength(0))
    .alphaDecay(1) // Stop immediately
    .stop(); // Don't run simulation, use fixed positions

  return { simulation: sim, nodes, links };
};

const renderChart = () => {
  if (!svgContainer.value) return;

  // Stop any existing simulation
  if (simulation.value) {
    simulation.value.stop();
  }

  // Clear previous content
  d3.select(svgContainer.value).selectAll('*').remove();

  const containerWidth = svgContainer.value.clientWidth;
  const containerHeight = svgContainer.value.clientHeight;

  // Create SVG
  const svg = d3.select(svgContainer.value)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, containerWidth, containerHeight]);

  // Create container group for zoom
  const g = svg.append('g');

  // Add zoom behavior
  const zoomBehavior = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoomBehavior as any);

  // Click on background to deselect
  svg.on('click', () => {
    selectedNode.value = null;
    // Reset all node styles
    g.selectAll<SVGGElement, D3Node>('.node image')
      .style('opacity', 1)
      .style('filter', 'none');
  });

  // Create simulation and get prepared nodes and links
  const { simulation: sim, nodes, links } = createSimulation(containerWidth, containerHeight);
  simulation.value = sim;

  // Create links
  const link = g.selectAll('.link')
    .data(links)
    .join('line')
    .attr('class', 'link')
    .style('stroke', d => d.mediaType === 'Wi-Fi' ? '#4CAF50' : '#2196F3')
    .style('stroke-width', 2)
    .style('stroke-dasharray', d => d.mediaType === 'Wi-Fi' ? '5,5' : '');

  // Store original positions for each node
  const originalPositions = new Map<string, { x: number; y: number }>();
  nodes.forEach(node => {
    if (node.fx !== undefined && node.fx !== null && node.fy !== undefined && node.fy !== null) {
      originalPositions.set(node.MACAddress, { x: node.fx, y: node.fy });
    }
  });

  // Define update function for positions
  const updatePositions = () => {
    link
      .attr('x1', d => (d.source as D3Node).x!)
      .attr('y1', d => (d.source as D3Node).y!)
      .attr('x2', d => (d.target as D3Node).x!)
      .attr('y2', d => (d.target as D3Node).y!);

    node
      .attr('transform', d => `translate(${d.x},${d.y})`);
  };

  // Create node groups with optional drag behavior
  const node = g.selectAll<SVGGElement, D3Node>('.node')
    .data(nodes)
    .join('g')
    .attr('class', 'node')
    .call(d3.drag<SVGGElement, D3Node>()
      .on('start', (event: any, d: D3Node) => {
        const originalPos = originalPositions.get(d.MACAddress);
        if (originalPos) {
          d.fx = d.x;
          d.fy = originalPos.y; // Keep Y fixed
        }
      })
      .on('drag', (event: any, d: D3Node) => {
        const originalPos = originalPositions.get(d.MACAddress);
        if (originalPos) {
          // Only allow horizontal dragging
          d.fx = event.x;
          d.fy = originalPos.y; // Keep Y fixed at original level
          d.x = event.x;
          d.y = originalPos.y;

          // Update positions immediately
          updatePositions();
        }
      })
      .on('end', (event: any, d: D3Node) => {
        const originalPos = originalPositions.get(d.MACAddress);
        if (originalPos) {
          // Keep the new horizontal position
          d.fx = event.x;
          d.fy = originalPos.y;
        }
      }));

  // Add images to nodes
  node.append('image')
    .attr('xlink:href', d => getNodeIcon(d.Mode))
    .attr('width', d => getNodeSize(d.Mode))
    .attr('height', d => getNodeSize(d.Mode))
    .attr('x', d => -getNodeSize(d.Mode) / 2)
    .attr('y', d => -getNodeSize(d.Mode) / 2);

  // Add labels
  node.append('text')
    .text(d => d.Name)
    .attr('text-anchor', 'middle')
    .attr('dy', d => getNodeSize(d.Mode) / 2 + 20)
    .style('font-size', '12px')
    .style('fill', '#333');

  // Add hover and click events
  node.on('mouseover', (event, d) => {
    hoveredNode.value = d;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    hoverPosition.value = {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY
    };
  })
  .on('mouseout', () => {
    hoveredNode.value = null;
  })
  .on('click', (event, d) => {
    event.stopPropagation();
    selectedNode.value = d;

    // Highlight selected node
    node.selectAll('image')
      .style('opacity', n => n === d ? 1 : 0.6)
      .style('filter', n => n === d ? 'drop-shadow(0 0 8px rgba(33, 150, 243, 0.8))' : 'none');
  });

  // Trigger initial position calculation and render
  sim.tick();
  updatePositions();
};

// Watch for changes in nodes
watch(() => props.nodes, () => {
  renderChart();
}, { deep: true });

// Handle window resize
const handleResize = () => {
  renderChart();
};

onMounted(() => {
  renderChart();
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  if (simulation.value) {
    simulation.value.stop();
  }
  window.removeEventListener('resize', handleResize);
});
</script>

<template>
  <div class="topology-map" :data-testid="qa('mesh-topology-map-container')">
    <div
      ref="svgContainer"
      class="svg-container"
      :class="{ 'with-sidebar': selectedNode }"
      :data-testid="qa('mesh-topology-map-svg')"
    ></div>

    <!-- Hover tooltip -->
    <div
      v-if="hoveredNode && !selectedNode"
      class="node-tooltip"
      :data-testid="qa('mesh-topology-map-tooltip')"
      :style="{
        left: `${hoverPosition.x + 10}px`,
        top: `${hoverPosition.y + 10}px`
      }"
    >
      <div class="tooltip-content body-sm" :data-testid="qa('mesh-topology-map-tooltip-content')">
        <div :data-testid="qa('mesh-topology-map-tooltip-name')">
          <strong class="label">{{ hoveredNode.Name }}</strong>
        </div>
        <div :data-testid="qa('mesh-topology-map-tooltip-mode')">Mode: {{ hoveredNode.Mode }}</div>
        <div :data-testid="qa('mesh-topology-map-tooltip-ip')">IP: {{ hoveredNode.ipv4 }}</div>
        <div :data-testid="qa('mesh-topology-map-tooltip-mac')">MAC: {{ hoveredNode.MACAddress }}</div>
      </div>
    </div>

    <!-- Selected node detail panel -->
    <transition name="slide">
      <div
        v-if="selectedNode"
        class="node-detail-panel"
        :data-testid="qa('mesh-topology-map-detail-panel')"
      >
        <div class="panel-header">
          <h3 class="heading-6">{{ t('mesh.nodeDetails') || 'Node Details' }}</h3>
          <button
            class="close-btn"
            @click="selectedNode = null"
            :data-testid="qa('mesh-topology-map-detail-close')"
          >
            ✕
          </button>
        </div>
        <div class="panel-content body-sm">
          <div class="detail-section">
            <div class="detail-row">
              <span class="detail-label label">{{ t('mesh.deviceName') || 'Device Name' }}:</span>
              <span class="detail-value body-sm">{{ selectedNode.Name }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label label">{{ t('mesh.mode') || 'Mode' }}:</span>
              <span class="detail-value body-sm" :class="`mode-${selectedNode.Mode.toLowerCase()}`">
                {{ selectedNode.Mode }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label label">{{ t('mesh.ipAddress') || 'IP Address' }}:</span>
              <span class="detail-value body-sm">{{ selectedNode.ipv4 || '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label label">{{ t('mesh.macAddress') || 'MAC Address' }}:</span>
              <span class="detail-value mono body-sm">{{ selectedNode.MACAddress }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label label">{{ t('mesh.mediaType') || 'Media Type' }}:</span>
              <span class="detail-value body-sm">{{ selectedNode.MediaType }}</span>
            </div>
            <div class="detail-row" v-if="selectedNode.Upstream !== '-'">
              <span class="detail-label label">{{ t('mesh.upstream') || 'Upstream' }}:</span>
              <span class="detail-value mono body-sm">{{ selectedNode.Upstream }}</span>
            </div>
            <div class="detail-row" v-if="selectedNode.SupportedBand">
              <span class="detail-label label">{{ t('mesh.band') || 'Band' }}:</span>
              <span class="detail-value body-sm">{{ selectedNode.SupportedBand }}</span>
            </div>
            <div class="detail-row" v-if="selectedNode.TxRate">
              <span class="detail-label label">{{ t('mesh.txRate') || 'TX Rate' }}:</span>
              <span class="detail-value body-sm">{{ selectedNode.TxRate }}</span>
            </div>
            <div class="detail-row" v-if="selectedNode.RxRate">
              <span class="detail-label label">{{ t('mesh.rxRate') || 'RX Rate' }}:</span>
              <span class="detail-value body-sm">{{ selectedNode.RxRate }}</span>
            </div>
            <div class="detail-row" v-if="selectedNode.RSSI">
              <span class="detail-label label">{{ t('mesh.rssi') || 'RSSI' }}:</span>
              <span class="detail-value body-sm">{{ selectedNode.RSSI }} dBm</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.topology-map {
  position: relative;
  width: 100%;
  height: 600px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
}

.svg-container {
  flex: 1;
  width: 100%;
  height: 100%;
  transition: width 0.3s ease;
}

.svg-container.with-sidebar {
  width: calc(100% - 320px);
}

.node-tooltip {
  position: fixed;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.75rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  pointer-events: none;
  z-index: 1000;
  /* Typography handled by global tokens/utilities in markup. */
}

.tooltip-content {
  color: #333;
  line-height: 1.4;
}

.node-detail-panel {
  position: absolute;
  right: 0;
  top: 0;
  width: 320px;
  height: 100%;
  background-color: white;
  border-left: 1px solid #e0e0e0;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  z-index: 100;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.panel-header h3 {
  margin: 0;
  /* Typography handled by global tokens/utilities (e.g., .heading-6). */
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #e0e0e0;
  color: #333;
}

.panel-content {
  padding: 1.25rem;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-label {
  /* Typography handled by global tokens/utilities (e.g., .label). */
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-value {
  /* Typography handled by global tokens/utilities (e.g., .body-sm). */
  color: #333;
  word-break: break-all;
}

.detail-value.mono {
  font-family: 'Courier New', monospace;
  background-color: #f5f5f5;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  /* Typography handled by global tokens/utilities (e.g., .body-sm). */
}

.mode-controller {
  color: #2196F3;
  font-weight: 600;
}

.mode-agent {
  color: #4CAF50;
  font-weight: 600;
}

.mode-client {
  color: #FF9800;
  font-weight: 600;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from {
  transform: translateX(100%);
}

.slide-leave-to {
  transform: translateX(100%);
}

:deep(.link) {
  pointer-events: none;
}

:deep(.node) {
  cursor: pointer;
}

:deep(.node text) {
  pointer-events: none;
}

:deep(.node image) {
  transition: opacity 0.2s, filter 0.2s;
}
</style>