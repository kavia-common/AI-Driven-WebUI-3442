<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ThreadTopologyResponse, ThreadNode } from '../../../types/thread';
import { getThreadTopology } from '../../../services/api/thread';
import * as d3 from 'd3';
import { useQA } from '../../../utils/qa';
const { isQAMode, qa, slug } = useQA();

// Interface for D3 node data
interface D3Node extends d3.SimulationNodeDatum {
  id: string;
  role: string;
  rloc16: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

// Interface for D3 link data
interface D3Link extends d3.SimulationLinkDatum<D3Node> {
  id: string;
  source: string | D3Node;
  target: string | D3Node;
  type: string;
}

const { t } = useI18n();
const topologyData = ref<ThreadTopologyResponse | null>(null);
const svgContainer = ref<HTMLDivElement | null>(null);
const selectedNode = ref<string | null>(null);
const nodeDetails = ref<ThreadNode | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// Get node color based on role
const getNodeColor = (role: string): string => {
  switch (role) {
    case 'Leader':
      return '#B19CD9'; // Purple for Leader
    case 'Router':
      return '#8FBCD4'; // Blue for Router
    default:
      return '#FFE082'; // Yellow for Child/other
  }
};

// Get node details
const showNodeDetails = (nodeId: string) => {
  if (!topologyData.value) return;

  const node = topologyData.value.ThreadTopology.Nodes[nodeId];
  if (node) {
    selectedNode.value = nodeId;
    nodeDetails.value = node;
  }
};

// Close node details panel
const closeNodeDetails = () => {
  selectedNode.value = null;
  nodeDetails.value = null;
};

// Fetch topology data
const fetchTopologyData = async () => {
  loading.value = true;
  error.value = null;
  try {
    topologyData.value = await getThreadTopology();
    // 等待下一個 tick，確保 svgContainer 已經有正確尺寸
    await nextTick();
    renderTopology();
  } catch (err) {
    console.error('Error fetching Thread topology:', err);
    error.value = 'Failed to fetch Thread topology';
  } finally {
    loading.value = false;
  }
};

// Handle refresh
const handleRefresh = () => {
  fetchTopologyData();
};

// Render topology visualization
const renderTopology = () => {
  if (!svgContainer.value || !topologyData.value) return;

  // Clear previous content
  d3.select(svgContainer.value).selectAll('*').remove();

  const width = svgContainer.value.clientWidth;
  const height = svgContainer.value.clientHeight;

  // Create SVG
  const svg = d3
    .select(svgContainer.value)
    .append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', [0, 0, width, height]);

  // Create container group for zoom
  const g = svg.append('g');

  // Add zoom behavior
  const zoom = d3
    .zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom as any);

  // Create legend
  const legend = svg.append('g').attr('class', 'legend').attr('transform', 'translate(20, 20)');

  // Leader legend
  legend.append('circle').attr('r', 10).attr('cx', 10).attr('cy', 10).style('fill', getNodeColor('Leader'));

  legend.append('text').attr('x', 25).attr('y', 15).attr('class', 'caption').text('Leader');

  // Router legend
  legend.append('circle').attr('r', 10).attr('cx', 10).attr('cy', 40).style('fill', getNodeColor('Router'));

  legend.append('text').attr('x', 25).attr('y', 45).attr('class', 'caption').text('Router');

  // Child legend
  legend.append('circle').attr('r', 10).attr('cx', 10).attr('cy', 70).style('fill', getNodeColor('Child'));

  legend.append('text').attr('x', 25).attr('y', 75).attr('class', 'caption').text('Child');

  // Prepare data for D3
  const nodes: D3Node[] = [];
  const links: D3Link[] = [];

  // Create nodes
  Object.entries(topologyData.value.ThreadTopology.Nodes).forEach(([id, node]) => {
    nodes.push({
      id,
      role: node.Role,
      rloc16: node.Rloc16
    });
  });

  // Create links
  Object.entries(topologyData.value.ThreadTopology.Links).forEach(([id, link]) => {
    const [source, target] = id.split('_');
    links.push({
      id,
      source,
      target,
      type: link.type
    });
  });

  // Create force simulation
  const simulation = d3
    .forceSimulation<D3Node>(nodes)
    .force('link', d3.forceLink<D3Node, D3Link>(links).id((d) => d.id).distance(150))
    .force('charge', d3.forceManyBody().strength(-500))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('x', d3.forceX(width / 2).strength(0.1))
    .force('y', d3.forceY(height / 2).strength(0.1));

  // Create links
  const link = g
    .selectAll('.link')
    .data(links)
    .enter()
    .append('line')
    .attr('class', 'link')
    .style('stroke', (d) => (d.type === 'RouterLink' ? '#0070BB' : '#FFE082'))
    .style('stroke-width', 2);

  // Create nodes
  const node = g
    .selectAll<SVGGElement, D3Node>('.node')
    .data(nodes)
    .enter()
    .append('g')
    .attr('class', 'node')
    .on('click', (event, d) => {
      showNodeDetails(d.id);
    })
    .call(
      d3
        .drag<SVGGElement, D3Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any
    );

  // Add circles to nodes
  node
    .append('circle')
    .attr('r', 25)
    .style('fill', (d) => getNodeColor(d.role))
    .style('stroke', '#fff')
    .style('stroke-width', 2);

  // Add hover effect
  node.append('title').text((d) => `${d.id}\nRole: ${d.role}\nRLOC16: ${d.rloc16}`);

  // Update positions on tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d) => (d.source as D3Node).x!)
      .attr('y1', (d) => (d.source as D3Node).y!)
      .attr('x2', (d) => (d.target as D3Node).x!)
      .attr('y2', (d) => (d.target as D3Node).y!);

    node.attr('transform', (d) => `translate(${d.x},${d.y})`);
  });

  // Drag functions
  function dragstarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>, d: D3Node) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
};

// Watch for changes in topologyData
watch(
  () => topologyData.value,
  () => {
    if (topologyData.value) {
      renderTopology();
    }
  },
  { deep: true }
);

onMounted(() => {
  fetchTopologyData();

  // Handle window resize
  window.addEventListener('resize', renderTopology);
});

onUnmounted(() => {
  window.removeEventListener('resize', renderTopology);
});
</script>

<template>
  <div class="thread-content" :data-testid="qa('thread-topology-content')">
    <div v-if="loading && !topologyData" class="loading-state" :data-testid="qa('thread-topology-loading')">
      <div class="loading-spinner"></div>
      <span>{{ t('common.loading') }}</span>
    </div>

    <div v-else-if="error" class="error-state" :data-testid="qa('thread-topology-error')">
      {{ error }}
    </div>

    <template v-else-if="topologyData">
      <div class="panel-section" :data-testid="qa('thread-topology-section')">
        <div class="topology-layout" :data-testid="qa('thread-topology-layout')">
          <!-- Main Topology View -->
          <div class="topology-view" :data-testid="qa('thread-topology-view')">
            <div class="topology-header" :data-testid="qa('thread-topology-header')">
              <button class="btn btn-primary button-text" :data-testid="qa('thread-topology-refresh-button')" @click="handleRefresh">
                {{ t('common.refresh') }}
              </button>
            </div>

            <div class="topology-container" :data-testid="qa('thread-topology-container')" ref="svgContainer"></div>
          </div>

          <!-- Node Details Panel -->
          <div class="node-details" v-if="selectedNode && nodeDetails" :data-testid="qa('thread-topology-node-details')">
            <div class="node-details-header" :data-testid="qa('thread-topology-node-details-header')">
              <h3 class="heading-6" :data-testid="qa('thread-topology-node-details-title')">Node Details</h3>
              <button class="close-button" :data-testid="qa('thread-topology-node-details-close')" @click="closeNodeDetails">&times;</button>
            </div>

            <div class="node-details-content body-sm" :data-testid="qa('thread-topology-node-details-content')">
              <div class="info-row">
                <span class="info-label label" :data-testid="qa('thread-topology-node-extended-mac-label')">ExtendedMAC:</span>
                <span class="info-value body-sm" :data-testid="qa('thread-topology-node-extended-mac-value')">{{ selectedNode }}</span>
              </div>
              <div class="info-row">
                <span class="info-label label" :data-testid="qa('thread-topology-node-role-label')">Role:</span>
                <span class="info-value body-sm" :data-testid="qa('thread-topology-node-role-value')">{{ nodeDetails.Role }}</span>
              </div>
              <div class="info-row">
                <span class="info-label label" :data-testid="qa('thread-topology-node-rloc16-label')">RLOC16:</span>
                <span class="info-value body-sm" :data-testid="qa('thread-topology-node-rloc16-value')">{{ nodeDetails.Rloc16 }}</span>
              </div>
              <div class="info-row">
                <span class="info-label label" :data-testid="qa('thread-topology-node-router-id-label')">Router ID:</span>
                <span class="info-value body-sm" :data-testid="qa('thread-topology-node-router-id-value')">{{ nodeDetails.RouterId }}</span>
              </div>
              <div class="info-row">
                <span class="info-label label" :data-testid="qa('thread-topology-node-client-id-label')">Client ID:</span>
                <span class="info-value body-sm" :data-testid="qa('thread-topology-node-client-id-value')">{{ nodeDetails.ClientId }}</span>
              </div>

              <div class="mode-section" :data-testid="qa('thread-topology-node-mode-section')">
                <h4 class="heading-6" :data-testid="qa('thread-topology-node-mode-title')">Mode:</h4>
                <div class="checkbox-group" :data-testid="qa('thread-topology-node-mode-checkboxes')">
                  <div class="form-check">
                    <input
                      type="checkbox"
                      id="full-network-data"
                      :data-testid="qa('thread-topology-node-full-network-data')"
                      :checked="nodeDetails.Mode.FullNetworkData"
                      disabled
                    />
                    <label class="body-sm" for="full-network-data">FullNetworkData</label>
                  </div>
                  <div class="form-check">
                    <input
                      type="checkbox"
                      id="full-thread-device"
                      :data-testid="qa('thread-topology-node-full-thread-device')"
                      :checked="nodeDetails.Mode.FullThreadDevice"
                      disabled
                    />
                    <label class="body-sm" for="full-thread-device">FullThreadDevice</label>
                  </div>
                  <div class="form-check">
                    <input
                      type="checkbox"
                      id="rx-on-when-idle"
                      :data-testid="qa('thread-topology-node-rx-on-when-idle')"
                      :checked="nodeDetails.Mode.RxOnWhenIdle"
                      disabled
                    />
                    <label class="body-sm" for="rx-on-when-idle">RxOnWhenIdle</label>
                  </div>
                </div>
              </div>

              <div class="ipv6-section" :data-testid="qa('thread-topology-node-ipv6-section')">
                <h4 class="heading-6" :data-testid="qa('thread-topology-node-ipv6-title')">IPv6 Addresses:</h4>
                <div class="ipv6-list" :data-testid="qa('thread-topology-node-ipv6-list')">
                  <div
                    v-for="(address, index) in nodeDetails.IPv6AddressList"
                    :key="index"
                    class="ipv6-address body-sm"
                    :data-testid="qa(`thread-topology-node-ipv6-address-${index}`)"
                  >
                    {{ index + 1 }}. {{ address }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.thread-content {
  padding: 1.5rem;
}

.panel-section {
  margin-bottom: 1.5rem;
}

.topology-layout {
  display: flex;
  height: 600px;
  border: 1px solid var(--border-color);
}

.topology-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: white;
}

.topology-header {
  padding: 0.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid var(--border-color);
}

.topology-container {
  flex: 1;
  overflow: hidden;
}

.node-details {
  width: 400px;
  background-color: #f8f9fa;
  border-left: 1px solid var(--border-color);
  overflow-y: auto;
}

.node-details-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: #ddd;
  border-bottom: 1px solid var(--border-color);
}

.node-details-header h3 {
  margin: 0;
  /* Typography handled by global tokens/utilities (e.g., .heading-6). */
}

.close-button {
  background: none;
  border: none;
  /* Keep glyph size; it's an icon-like control, not body text */
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
}

.node-details-content {
  padding: 1rem;
}

.info-row {
  margin-bottom: 0.75rem;
}

.info-label {
  /* Weight/color handled here; size handled by global tokens via .label class */
  font-weight: 500;
  color: var(--text-primary);
  display: inline-block;
  width: 120px;
}

.info-value {
  display: inline-block;
  word-break: break-all;
}

.mode-section,
.ipv6-section {
  margin-top: 1.5rem;
}

.mode-section h4,
.ipv6-section h4 {
  margin: 0 0 0.75rem 0;
  color: var(--text-primary);
  /* Typography handled by global tokens/utilities via markup. */
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.ipv6-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.ipv6-address {
  font-family: var(--font-family-mono);
  word-break: break-all;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem;
  background-color: white;
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
}

.error-state {
  padding: 2rem;
  text-align: center;
  color: #dc3545;
  background-color: white;
  border-radius: 4px;
  box-shadow: var(--shadow-sm);
}

:deep(.node) {
  cursor: pointer;
}

:deep(.node circle:hover) {
  stroke: #333;
  stroke-width: 2px;
}

:deep(.node text) {
  font-size: 12px;
  fill: #333;
}

:deep(.link) {
  stroke-opacity: 0.8;
}

:deep(.link-text) {
  pointer-events: none;
}

:deep(.legend) {
  pointer-events: none;
}

@media (max-width: 768px) {
  .thread-content {
    padding: 1rem;
  }

  .panel-section {
    margin-bottom: 1rem;
  }

  .topology-layout {
    flex-direction: column;
    height: auto;
  }

  .topology-view {
    height: 400px;
  }

  .node-details {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--border-color);
    max-height: 300px;
  }
}
</style>
