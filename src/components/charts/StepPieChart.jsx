import React from "react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

export default function StepPieChart({ steps, onStepClick }) {
  const data = {
    labels: steps.map((s) => s.name),
    datasets: [
      {
        data: steps.map((s) => s.completedCount),
        backgroundColor: [
          "#a78bfa",
          "#7c3aed",
          "#fbbf24",
          "#34d399",
          "#f87171",
          "#60a5fa",
          "#f472b6",
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || "";
            const value = context.parsed || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
    onClick: (evt, elements) => {
      if (elements.length > 0 && onStepClick) {
        const idx = elements[0].index;
        onStepClick(idx);
      }
    },
  };

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <Pie data={data} options={options} />
    </div>
  );
}
