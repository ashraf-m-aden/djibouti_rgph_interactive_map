// composables/useChart.ts
import { Chart, type ChartConfiguration } from 'chart.js';

export const useChart = () => {
  let chartInstance: Chart | null = null;

  const createChart = (canvas: HTMLCanvasElement, config: ChartConfiguration) => {
    if (chartInstance) {
      chartInstance.destroy();
    }
    chartInstance = new Chart(canvas, config);
    return chartInstance;
  };

  const destroyChart = () => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  };

  return {
    createChart,
    destroyChart,
  };
};