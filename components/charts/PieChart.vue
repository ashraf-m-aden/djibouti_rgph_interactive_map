<template>
  <div class="chart-card">
    <div class="chart-card__header">
      <h3>{{ title }}</h3>
    </div>
    <div class="chart-card__body">
      <canvas ref="chartRef"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Chart, registerables, type ChartConfiguration } from 'chart.js';

Chart.register(...registerables);

// Props
interface Props {
  title?: string;
  labels?: string[];
  data?: number[];
  colors?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  labels: () => [],
  data: () => [],
  colors: () => ['#1A9553', '#6AB2E7', '#D32F2F', '#C8A951', '#8E44AD', '#E67E22', '#1ABC9C', '#34495E'],
});

// Refs
const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart<'doughnut'> | null = null;

// Render chart
const renderChart = () => {
  if (!chartRef.value) return;
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  const config: ChartConfiguration<'doughnut'> = {
    type: 'doughnut',
    data: {
      labels: props.labels,
      datasets: [{
        data: props.data,
        backgroundColor: props.colors.slice(0, props.data.length),
        borderWidth: 2,
        borderColor: '#FFFFFF',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { 
              family: "'Source Sans 3', sans-serif", 
              size: 12 
            },
            padding: 12,
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            family: "'Source Sans 3', sans-serif",
            size: 13,
          },
          bodyFont: {
            family: "'Source Sans 3', sans-serif",
            size: 12,
          },
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed || 0;
              const dataset = context.dataset.data as number[];
              const total = dataset.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
              return `${label}: ${value.toLocaleString()} (${percentage}%)`;
            },
          },
        },
      },
    },
  };

  chartInstance = new Chart(chartRef.value, config);
};

// Watch for prop changes
watch(() => [props.labels, props.data], () => {
  renderChart();
}, { deep: true });

// Lifecycle
onMounted(() => {
  nextTick(() => renderChart());
});

onBeforeUnmount(() => {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
});
</script>

<style scoped>
.chart-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.chart-card__header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.chart-card__header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #1A1D26;
}

.chart-card__body {
  padding: 1.5rem;
  min-height: 300px;
  position: relative;
}

canvas {
  max-width: 100%;
}
</style>