import { useRef, useEffect } from "react";
import * as d3 from "d3";

export default function BarChart({
  groupedData,
  flatData,
  colors,
  onBarClick,
  onBarHover,
  selectedExercises,
  comparisonMode,
  xKey,
  maxExercises,
  onMuscleGroupClick
}) {
  const ref = useRef();

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 750;
    const margin = { top: 30, right: 30, bottom: 100, left: 50 };

    svg.attr("width", width).attr("height", height);

    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("padding", "6px 10px")
      .style("border", "1px solid #ccc")
      .style("border-radius", "4px")
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.2)")
      .style("pointer-events", "none")
      .style("opacity", 0);

    const y = d3.scaleLinear()
      .domain([0, 10])
      .nice()
      .range([height - margin.bottom, margin.top]);

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    if (Array.isArray(flatData)) renderFlatView();
    else if (groupedData && groupedData instanceof Map) renderGroupedView();

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90)`)
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("font-size", "14px")
      .attr("fill", "#333")
      .text("Hypertrophy Score");

    function renderFlatView() {
      const grouped = d3.group(flatData, d => d.Target_Muscle);
      const targetMuscles = Array.from(grouped.keys());

      const outerX = d3.scaleBand()
        .domain(targetMuscles)
        .range([margin.left, width - margin.right])
        .padding(0.3);

      const xAxis = d3.axisBottom(outerX).tickSize(0).tickFormat(() => "");
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis);

      drawCustomLabels(targetMuscles, outerX);

      targetMuscles.forEach(muscle => {
        const groupData = grouped.get(muscle)
          .sort((a, b) => b.Hypertrophy_Score - a.Hypertrophy_Score)
          .slice(0, maxExercises);

        const innerX = d3.scaleBand()
          .domain(d3.range(groupData.length))
          .range([0, outerX.bandwidth()])
          .padding(0.1);

        const g = svg.append("g").attr("transform", `translate(${outerX(muscle)},0)`);
        drawBars(g, groupData, innerX);
      });
    }

    function renderGroupedView() {
      const muscleGroups = Array.from(groupedData.keys());

      const outerX = d3.scaleBand()
        .domain(muscleGroups)
        .range([margin.left, width - margin.right])
        .padding(0.3);

      const innerX = d3.scaleBand()
        .domain(d3.range(maxExercises))
        .range([0, outerX.bandwidth()])
        .padding(0.1);

      const xAxis = d3.axisBottom(outerX).tickSize(0).tickFormat(() => "");
      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis);

      drawCustomGroupLabels(muscleGroups, outerX);

      muscleGroups.forEach(group => {
        const groupData = groupedData.get(group);
        const g = svg.append("g").attr("transform", `translate(${outerX(group)},0)`);
        drawBars(g, groupData, innerX);
      });
    }

    function drawBars(g, data, xScale) {
      g.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", (_, i) => xScale(i))
        .attr("y", d => y(d.Hypertrophy_Score))
        .attr("width", xScale.bandwidth())
        .attr("height", d => y(0) - y(d.Hypertrophy_Score))
        .attr("fill", d => colors[d.Equipment] || "#999")
        .attr("opacity", d =>
          selectedExercises.length &&
            !selectedExercises.some(e => e.Exercise_Name === d.Exercise_Name)
            ? 0.3 : 1
        )
        .on("mouseover", function (event, d) {
          tooltip.transition().duration(200).style("opacity", 1);
          tooltip
            .html(`<strong>${d.Exercise_Name}</strong><br/><span style="font-size: 12px; color: #666;">Click to show details</span>`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
          if (onBarHover) onBarHover(d);
        })
        .on("mousemove", function (event) {
          tooltip
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
          tooltip.transition().duration(300).style("opacity", 0);
          if (onBarHover) onBarHover(null);
        })
        .on("click", (event, d) => {
          if (onBarClick) onBarClick(d, event);
        });
    }

    function drawCustomLabels(labels, xScale) {
      const labelGroup = svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom - 10})`);

      labels.forEach(label => {
        const x = xScale(label);
        const width = xScale.bandwidth();
        const padding = 6;
        const g = labelGroup.append("g");

        const text = g.append("text")
          .text(label)
          .attr("x", x + width / 2)
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .attr("font-size", "12px")
          .attr("fill", "#333");

        const bbox = text.node().getBBox();

        g.insert("rect", "text")
          .attr("x", bbox.x - padding)
          .attr("y", bbox.y - padding)
          .attr("width", bbox.width + 2 * padding)
          .attr("height", bbox.height + 2 * padding)
          .attr("rx", 6)
          .attr("fill", "#f0f0f0")
          .attr("stroke", "#ccc");

        labelGroup.append("line")
          .attr("x1", x + width / 2)
          .attr("x2", x + width / 2)
          .attr("y1", 10)
          .attr("y2", 17)
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .lower();
      });
    }

    function drawCustomGroupLabels(groups, xScale) {
      const labelGroup = svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom - 10})`);

      groups.forEach(group => {
        const x = xScale(group);
        const width = xScale.bandwidth();
        const paddingX = 22;
        const paddingY = 10;

        const g = labelGroup.append("g")
          .attr("cursor", "pointer")
          .attr("transform", "translate(0,5)")
          .on("click", () => onMuscleGroupClick?.(group))
          .on("mouseover", function () {
            d3.select(this).select("rect").attr("fill", "rgba(104, 241, 232, 0.6)");
          })
          .on("mouseout", function () {
            d3.select(this).select("rect").attr("fill", "#f9f9f9");
          });

        const text = g.append("text")
          .text(group)
          .attr("x", x + width / 2)
          .attr("y", 30)
          .attr("text-anchor", "middle")
          .attr("alignment-baseline", "middle")
          .attr("font-size", "12px")
          .attr("fill", "#333");

        const bbox = text.node().getBBox();

        g.append("image")
          .attr("xlink:href", process.env.PUBLIC_URL + "/magnifying_glass.png")
          .attr("x", bbox.x + bbox.width + 4)
          .attr("y", bbox.y + bbox.height / 2)
          .attr("width", 14)
          .attr("height", 14)
          .attr("opacity", 0.6);

        g.insert("rect", "text")
          .attr("x", bbox.x - paddingX)
          .attr("y", bbox.y - paddingY)
          .attr("width", bbox.width + 2 * paddingX)
          .attr("height", bbox.height + 2 * paddingY)
          .attr("rx", 6)
          .attr("fill", "#f9f9f9")
          .attr("stroke", "#ccc");

        labelGroup.append("line")
          .attr("x1", x + width / 2)
          .attr("x2", x + width / 2)
          .attr("y1", 10)
          .attr("y2", 17)
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .lower();
      });
    }

    return () => {
      d3.select("body").selectAll(".tooltip").remove();
    };
  }, [
    groupedData,
    flatData,
    colors,
    onBarClick,
    onBarHover,
    selectedExercises,
    comparisonMode,
    maxExercises
  ]);

  return <svg ref={ref}></svg>;
}
