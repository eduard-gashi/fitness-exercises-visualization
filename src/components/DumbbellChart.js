import { useEffect, useRef } from "react";
import * as d3 from "d3";

export default function DumbbellChart({ data, colors }) {
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

    metrics.forEach(metric => {
      const val1 = data[0][metric];
      const val2 = data[1][metric];
      let x1 = x(val1);
      let x2 = x(val2);

      if (x1 === x2) {
        x1 -= 1;
        x2 += 1;
      }

      chart.append("line")
        .attr("x1", Math.min(x1, x2))
        .attr("x2", Math.max(x1, x2))
        .attr("y1", y(metric) + y.bandwidth() / 2)
        .attr("y2", y(metric) + y.bandwidth() / 2)
        .attr("stroke", "#ccc")
        .attr("stroke-width", 2);

      chart.append("circle")
        .attr("cx", x(val1))
        .attr("cy", y(metric) + y.bandwidth() / 2)
        .attr("r", 6)
        .attr("fill", colors[0]);

      chart.append("circle")
        .attr("cx", x(val2))
        .attr("cy", y(metric) + y.bandwidth() / 2)
        .attr("r", 6)
        .attr("fill", colors[1]);
    });

    chart.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(d3.axisBottom(x).ticks(10))
      .selectAll("text")
      .style("font-size", "10px");

    const legendYStart = innerHeight + 40;
    const legendSpacing = 20;

    chart.append("circle")
      .attr("cx", 0)
      .attr("cy", legendYStart)
      .attr("r", 6)
      .attr("fill", colors[0]);

    chart.append("text")
      .attr("x", 12)
      .attr("y", legendYStart + 1)
      .text(data[0].name || "Exercise 1")
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle");

    chart.append("circle")
      .attr("cx", 0)
      .attr("cy", legendYStart + legendSpacing)
      .attr("r", 6)
      .attr("fill", colors[1]);

    chart.append("text")
      .attr("x", 12)
      .attr("y", legendYStart + legendSpacing + 1)
      .text(data[1].name || "Exercise 2")
      .attr("font-size", "12px")
      .attr("alignment-baseline", "middle");
  }, [data, colors]);

  return <svg ref={ref}></svg>;
}
