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

// Types
interface Dataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  borderRadius?: number;
  [key: string]: any;
}

interface Props {
  title?: string;
  labels?: string[];
  datasets?: Dataset[];
  horizontal?: boolean;
  colors?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  labels: () => [],
  datasets: () => [],
  horizontal: false,
  colors: () => ['#1A9553', '#6AB2E7', '#D32F2F', '#C8A951', '#8E44AD', '#E67E22'],
});

// Refs
const chartRef = ref<HTMLCanvasElement | null>(null);
let chartInstance: Chart<'bar'> | null = null;

// Render chart
const renderChart = () => {
  if (!chartRef.value) return;
  
  if (chartInstance) {
    chartInstance.destroy();
  }

  const datasets = props.datasets.map((ds, i) => ({
    ...ds,
    backgroundColor: ds.backgroundColor || props.colors[i % props.colors.length],
    borderColor: ds.borderColor || props.colors[i % props.colors.length],
    borderWidth: ds.borderWidth ?? 1,
    borderRadius: ds.borderRadius ?? 4,
  }));

  const config: ChartConfiguration<'bar'> = {
    type: 'bar',
    data: {
      labels: props.labels,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: props.horizontal ? 'y' : 'x',
      plugins: {
        legend: {
          display: datasets.length > 1,
          position: 'top',
          labels: {
            font: { 
              family: "'Source Sans 3', sans-serif", 
              size: 12 
            },
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
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { 
            font: { 
              family: "'Source Sans 3', sans-serif", 
              size: 11 
            } 
          },
        },
        y: {
          grid: { color: '#F0F0F0' },
          ticks: { 
            font: { 
              family: "'Source Sans 3', sans-serif", 
              size: 11 
            } 
          },
        },
      },
    },
  };

  chartInstance = new Chart(chartRef.value, config);
};

// Watch for prop changes
watch(() => [props.labels, props.datasets, props.horizontal], () => {
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