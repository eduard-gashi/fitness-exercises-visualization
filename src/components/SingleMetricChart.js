import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function SingleMetricChart({ data, color }) {
  const ref = useRef();

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 420;
    const height = 280;
    const margin = { top: 20, right: 40, bottom: 70, left: 120 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    svg.attr("width", width).attr("height", height);

    const chart = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const metrics = [
      "User Rating",
      "SFR",
      "EMG Activation",
      "Stretch Bonus (Yes/No)",
      "Hypertrophy Score"
    ];

    const y = d3.scaleBand()
      .domain(metrics)
      .range([0, innerHeight])
      .padding(0.4);

    const x = d3.scaleLinear()
      .domain([0, 10])
      .range([0, innerWidth]);

    chart.append("g").call(d3.axisLeft(y));

    chart.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));

    metrics.forEach(metric => {
      const val = data[metric];

      chart.append("circle")
        .attr("cx", x(val))
        .attr("cy", y(metric) + y.bandwidth() / 2)
        .attr("r", 6)
        .attr("fill", color);
    });
  }, [data, color]);

  return <svg ref={ref}></svg>;
}
