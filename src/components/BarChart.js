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

    if (Array.isArray(flatData)) {
      // 🔍 Zoom-in view (single muscle group)
      const grouped = d3.group(flatData, d => d.Target_Muscle);
      const targetMuscles = Array.from(grouped.keys());

      const outerX = d3.scaleBand()
        .domain(targetMuscles)
        .range([margin.left, width - margin.right])
        .padding(0.3);

      const maxItems = d3.max(Array.from(grouped.values(), group => group.length));


      const y = d3.scaleLinear()
        .domain([0, 10])
        .nice()
        .range([height - margin.bottom, margin.top]);

      // Axis line with no labels
      const xAxis = d3.axisBottom(outerX)
        .tickSize(0)
        .tickFormat(() => "");

      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis);

      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));



      // Custom-styled x-labels
      const labelGroup = svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom - 10})`);

      targetMuscles.forEach(muscle => {
        const x = outerX(muscle);
        const width = outerX.bandwidth();
        const padding = 6;

        const g = labelGroup.append("g");

        const text = g.append("text")
          .text(muscle)
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

        // Line from label to axis
        labelGroup.append("line")
          .attr("x1", x + width / 2)
          .attr("x2", x + width / 2)
          .attr("y1", 10)
          .attr("y2", 17)
          .attr("stroke", "black")
          .attr("stroke-width", 1)
          .lower(); // make sure it renders behind
      });

      // Bars
      targetMuscles.forEach(muscle => {
        const groupData = grouped.get(muscle)
          .sort((a, b) => b.Hypertrophy_Score - a.Hypertrophy_Score)
          .slice(0, maxExercises);

        const innerX = d3.scaleBand()
          .domain(d3.range(groupData.length))
          .range([0, outerX.bandwidth()])
          .padding(0.1);

        const g = svg.append("g").attr("transform", `translate(${outerX(muscle)},0)`);

        g.selectAll("rect")
          .data(groupData)
          .enter()
          .append("rect")
          .attr("x", (_, i) => innerX(i))
          .attr("y", d => y(d.Hypertrophy_Score))
          .attr("width", innerX.bandwidth())
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
      });
    }
    else if (groupedData && groupedData instanceof Map) {
      // 📊 Overview view
      const muscleGroups = Array.from(groupedData.keys());

      const outerX = d3.scaleBand()
        .domain(muscleGroups)
        .range([margin.left, width - margin.right])
        .padding(0.3);

      const innerX = d3.scaleBand()
        .domain(d3.range(maxExercises))
        .range([0, outerX.bandwidth()])
        .padding(0.1);

      const y = d3.scaleLinear()
        .domain([0, 10])
        .nice()
        .range([height - margin.bottom, margin.top]);

      // Standard x-axis (for line and ticks)
      const xAxis = d3.axisBottom(outerX)
        .tickSize(0)  // Hide default labels, keep ticks
        .tickFormat(() => ""); // Remove default label text

      svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(xAxis);

      // Overlay custom label buttons
      const labelGroup = svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom - 10})`);

      muscleGroups.forEach(group => {
        const x = outerX(group);
        const width = outerX.bandwidth();
        const horizontalPadding = 22; // wider label
        const verticalPadding = 10;    // keep original height

        const g = labelGroup.append("g")
          .attr("cursor", "pointer")
          .attr("transform", "translate(0, 5)") // ← move the button down 12px
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
          .attr("x", bbox.x - horizontalPadding)
          .attr("y", bbox.y - verticalPadding)
          .attr("width", bbox.width + 2 * horizontalPadding)
          .attr("height", bbox.height + 2 * verticalPadding)
          .attr("rx", 6)
          .attr("fill", "#f9f9f9")
          .attr("stroke", "#ccc");

        // ⬆️ Add line connecting to axis
        labelGroup.append("line")
          .attr("x1", x + width / 2)
          .attr("x2", x + width / 2)
          .attr("y1", 10)
          .attr("y2", 17) // from bottom of svg up to x-axis
          .attr("stroke", "black")
          .attr("stroke-width", 1)
        labelGroup.append("line")
          .lower(); // so it stays behind the label

      });

      svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

      muscleGroups.forEach(group => {
        const groupData = groupedData.get(group);

        const g = svg.append("g")
          .attr("transform", `translate(${outerX(group)},0)`);

        g.selectAll("rect")
          .data(groupData)
          .enter()
          .append("rect")
          .attr("x", (_, i) => innerX(i))
          .attr("y", d => y(d.Hypertrophy_Score))
          .attr("width", innerX.bandwidth())
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
            if (onBarHover) onBarHover(d);  // You can choose to remove this line if hover should no longer trigger state
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
          })
      });
    }

    svg.append("text")
      .attr("text-anchor", "middle")
      .attr("transform", `rotate(-90)`)
      .attr("x", -height / 2)
      .attr("y", 15)
      .attr("font-size", "14px")
      .attr("fill", "#333")
      .text("Hypertrophy Score");


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
