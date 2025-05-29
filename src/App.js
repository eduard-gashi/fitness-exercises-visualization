import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import BarChart from "./components/BarChart";
import DumbbellChart from "./components/DumbbellChart";
import SingleMetricChart from "./components/SingleMetricChart";
import * as d3 from "d3";

const EQUIPMENT_COLORS = {
  "Dumbbell": "#8e44ad",     // purple
  "Barbell": "#2ecc71",      // green
  "Machine": "#f39c12",      // orange
  "Body Only": "#3498db",    // blue (replaces red)
  "Cable": "#e74c3c"         // red
};

function App() {
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedEquipment, setSelectedEquipment] = useState(Object.keys(EQUIPMENT_COLORS));
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState(null);
  const [hoveredExercise, setHoveredExercise] = useState(null);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [ctrlSelectedExercises, setCtrlSelectedExercises] = useState([]);
  const [maxExercises, setMaxExercises] = useState(1);
  const [showWeights, setShowWeights] = useState(false);
  const [weights, setWeights] = useState({
    SFR: 0.35,
    EMG: 0.30,
    User_Rating: 0.25,
    Stretch_Bonus: 0.10
  });



  // Load and clean CSV
  useEffect(() => {
    d3.csv("/fitness_exercises.csv").then(data => {
      console.log("Loaded rows:", data.length);

      const cleaned = data.map(row => {
        row.User_Rating = +row.User_Rating;
        row.SFR = +row.SFR;
        row.Stretch_Bonus = +row.Stretch_Bonus;
        row.EMG_Activation = +row.EMG_Activation;
        const normalizedEMG = (row.EMG_Activation / 100) * 10;  // Normalize percentage to value from 1-10

        row.Target_Muscle_List = row.Target_Muscle
          ? row.Target_Muscle.split(",").map(d => d.trim())
          : [];

        // Use the first one as primary
        row.Target_Muscle = row.Target_Muscle_List[0] || "Unknown";

        row.Hypertrophy_Score = (
          row.SFR * weights.SFR +
          normalizedEMG * weights.EMG +
          row.User_Rating * weights.User_Rating +
          row.Stretch_Bonus * 10 * weights.Stretch_Bonus
        );
        return row;
      });

      // Normalize scores
      const rawScores = cleaned.map(d => d.Hypertrophy_Score);
      const min = d3.min(rawScores);
      const max = d3.max(rawScores);

      cleaned.forEach(d => {
        d.Hypertrophy_Score = ((d.Hypertrophy_Score - min) / (max - min)) * 10;
        d.Hypertrophy_Score = Math.round(d.Hypertrophy_Score * 10) / 10;
      });

      setRawData(cleaned);
    });
  }, []);

  // Recalculate hypertrophy scores when weights change
  useEffect(() => {
    if (!rawData.length) return;

    const updated = rawData.map(row => {
      const normalizedEMG = (row.EMG_Activation / 100) * 10;

      const score = (
        row.SFR * weights.SFR +
        normalizedEMG * weights.EMG +
        row.User_Rating * weights.User_Rating +
        row.Stretch_Bonus * 10 * weights.Stretch_Bonus
      );

      return { ...row, Hypertrophy_Score: score };
    });

    // Normalize scores
    const scores = updated.map(d => d.Hypertrophy_Score);
    const min = d3.min(scores);
    const max = d3.max(scores);

    updated.forEach(d => {
      d.Hypertrophy_Score = ((d.Hypertrophy_Score - min) / (max - min)) * 10;
      d.Hypertrophy_Score = Math.round(d.Hypertrophy_Score * 10) / 10;
    });

    setRawData(updated);
  }, [weights]);

  // Filter and prepare data for visualization
  useEffect(() => {
    if (!rawData.length) return;

    if (selectedMuscleGroup) {
      const filtered = rawData.filter(
        d =>
          selectedEquipment.includes(d.Equipment) &&
          d.Muscle_Group === selectedMuscleGroup
      );
      setFilteredData(filtered); // array
    } else {
      // Overview view
      const grouped = d3.group(
        rawData.filter(d => selectedEquipment.includes(d.Equipment)),
        d => d.Muscle_Group
      );

      const topGrouped = new Map(
        Array.from(grouped, ([group, exercises]) => [
          group,
          exercises
            .sort((a, b) => b.Hypertrophy_Score - a.Hypertrophy_Score)
            .slice(0, maxExercises)
        ])
      );

      // Filtered data is a Map<Muscle_Group, Exercise[]>
      setFilteredData(topGrouped);

    }
  }, [rawData, selectedEquipment, selectedMuscleGroup, maxExercises]);


  function handleBarClick(exercise, event) {
    if (event.ctrlKey || event.metaKey) {
      setCtrlSelectedExercises(prev => {
        // Already selected → do nothing
        if (prev.find(e => e.Exercise_Name === exercise.Exercise_Name)) return prev;

        const updated = [...prev, exercise];

        // If third exercise is selected → clear everything
        if (updated.length > 2) {
          setSelectedExercises([]);
          setCtrlSelectedExercises([]);
          return [];
        }

        // If second exercise is selected → enter comparison mode
        if (updated.length === 2) {
          setSelectedExercises(updated);
        } else if (updated.length === 1) {
          // 🟢 Show first selected exercise in detail panel
          setSelectedExercises([exercise]);
        }

        return updated;
      });
    } else {
      // Normal click → reset everything
      setCtrlSelectedExercises([]);
      setSelectedExercises([exercise]);
      setHoveredExercise(null);
    }
  }

  // Handle muscle group click to filter exercises
  function handleMuscleGroupClick(group) {
    setSelectedMuscleGroup(group);
    setSelectedExercises([]);         // clear comparison panel
    setCtrlSelectedExercises([]);     // clear ctrl-click state
    setHoveredExercise(null);         // clear hover
    setComparisonMode(false);         // reset mode
  }

  // Function to update weights dynamically
  function updateWeight(key, value) {
    setWeights(prev => {
      const updated = { ...prev, [key]: value };
      const total = Object.values(updated).reduce((a, b) => a + b, 0);
      return Object.fromEntries(
        Object.entries(updated).map(([k, v]) => [k, v / total])
      );
    });
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      marginTop: "40px",
      minHeight: "100vh",
      fontFamily: "Inter, sans-serif",
      color: "#222"
    }}>
      <motion.h1
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 80 }}
        style={{
          textAlign: "center",
          fontSize: "2.2rem",
          marginBottom: "20px",
          fontWeight: 700,
          color: "#222"
        }}
      >
        Fitness Exercises Explorer
      </motion.h1>


      {/* Main Flex Container: BarChart + Right Panel */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "500px",
          maxWidth: "1500px", // limit total width
          margin: "0 auto",   // center horizontally
          padding: "0 40px",  // optional inner padding
          width: "100%",
        }}
      >

        {/* Bar Chart */}
        <div style={{ width: "900px", minWidth: "0" }}>
          <BarChart
            groupedData={selectedMuscleGroup ? null : filteredData}
            flatData={selectedMuscleGroup ? filteredData : null}
            maxExercises={maxExercises}
            colors={EQUIPMENT_COLORS}
            onBarClick={handleBarClick}
            onBarHover={setHoveredExercise}
            selectedExercises={ctrlSelectedExercises}
            comparisonMode={ctrlSelectedExercises.length === 2}
            xKey={selectedMuscleGroup ? "Target_Muscle" : "Muscle_Group"}
            onMuscleGroupClick={handleMuscleGroupClick}
          />
          {/* Centered Back Button only after selection */}
          {selectedMuscleGroup && (
            <div
              style={{
                marginBottom: "10px",
                display: "flex",
                justifyContent: "center",
                marginBottom: "20px", // space below the button
                marginTop: "-770px",   // move it above the chart slightly
              }}
            >
              <h2
                style={{
                  minWidth: "180px",
                  fontSize: "18px",
                  fontWeight: "400",
                  color: "#1e293b",
                  textAlign: "center",
                  backgroundColor: "rgba(104, 241, 232, 0.6)",
                  padding: "10px 20px",
                  borderRadius: "20px",
                  border: "1px solid #bcdff1",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                  backdropFilter: "blur(4px)",
                  marginLeft: "450px",
                }}
              >
                {selectedMuscleGroup} Exercises
              </h2>
            </div>
          )}

          {selectedMuscleGroup && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "20px", // space below the button
                marginTop: "640px",   // move it above the chart slightly
              }}>
              <button
                style={{
                  minWidth: "220px",
                  marginRight: "-72px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  padding: "10px 20px",
                  backgroundColor: "#f9f9f9",
                  boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                  fontWeight: 500,
                  cursor: "pointer",

                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(104, 241, 232, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f9f9f9";
                }}
                onClick={() => {
                  setSelectedMuscleGroup(null);
                  setSelectedExercises([]);
                  setCtrlSelectedExercises([]);
                  setComparisonMode(false);
                }}
              >
                ← Back to All Muscle Groups
              </button>
            </div>
          )}
        </div>

        {/* Right Column with stacked children */}
        <div style={{
          width: "480px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}>

          {/* Top Controls Section: two side-by-side + one below */}
          <div style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            maxWidth: "480px",
            gap: "20px"
          }}>

            {/* Row: Equipment + Weights */}
            <div style={{
              display: "flex",
              gap: "20px"
            }}>
              {/* Equipment Panel */}
              <div style={{
                flex: 1,
                border: "1px solid #ccc",
                borderRadius: "6px",
                backgroundColor: "#f9f9f9",
                padding: "15px",
                fontSize: "14px"
              }}>
                <h3>Select Equipment</h3>
                {Object.entries(EQUIPMENT_COLORS).map(([type, color]) => (
                  <label key={type} style={{ display: "block", color, marginBottom: "8px" }}>
                    <input
                      type="checkbox"
                      checked={selectedEquipment.includes(type)}
                      onChange={() =>
                        setSelectedEquipment(prev =>
                          prev.includes(type)
                            ? prev.filter(e => e !== type)
                            : [...prev, type]
                        )
                      }
                    />
                    {" "}{type}
                  </label>
                ))}
              </div>

              {/* Adjust Weights (collapsible panel) */}
              <div style={{
                flex: 1,
                border: "1px solid #ccc",
                borderRadius: "6px",
                backgroundColor: "#f9f9f9",
                padding: "10px",
                fontSize: "13px"
              }}>
                <h3>Hypertrophy Score Settings</h3>
                {!showWeights && (
                  <p style={{ fontSize: "13px", color: "#555", marginBottom: "10px" }}>
                    Change how the Hypertrophy Score is computed.
                  </p>
                )}
                {!showWeights ? (
                  <button
                    style={{
                      width: "100%",
                      padding: "8px",
                      backgroundColor: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                    onClick={() => setShowWeights(true)}
                  >
                    Adjust Weights
                  </button>
                ) : (
                  <>
                    {Object.keys(weights).map((key) => (
                      <div key={key} style={{ marginBottom: "10px" }}>
                        <label>{key.replace("_", " ")}: {Math.round(weights[key] * 100)}%</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={weights[key]}
                          onChange={e => updateWeight(key, parseFloat(e.target.value))}
                          style={{ width: "100%" }}
                        />
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <button
                        style={{
                          flex: 1,
                          padding: "6px",
                          backgroundColor: "#ccc",
                          color: "#222",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                        onClick={() => setShowWeights(false)}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(104, 241, 232, 0.6)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#ccc"}
                      >
                        Hide
                      </button>
                      <button
                        style={{
                          flex: 1,
                          padding: "6px",
                          backgroundColor: "#eee",
                          color: "#222",
                          border: "1px solid #aaa",
                          borderRadius: "4px",
                          cursor: "pointer"
                        }}
                        onClick={() => setWeights({
                          SFR: 0.35,
                          EMG: 0.30,
                          User_Rating: 0.25,
                          Stretch_Bonus: 0.10
                        })}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = "rgba(104, 241, 232, 0.6)"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = "#eee"}
                      >
                        Set Default Weights
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Amount of Exercises - full width below the row */}
            <div style={{
              border: "1px solid #ccc",
              borderRadius: "6px",
              backgroundColor: "#f9f9f9",
              padding: "15px",
              fontSize: "14px"
            }}>
              <h3>Amount of Exercises to show</h3>
              <select value={maxExercises} onChange={(e) => setMaxExercises(Number(e.target.value))}>
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={5}>5</option>
              </select>
            </div>
          </div>

          {/* Info / Comparison Panel */}
          <div style={{
            width: "100%",
            maxWidth: "450px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            backgroundColor: "#f9f9f9",
            padding: "15px",
            fontSize: "14px",
            minHeight: "350px",
          }}>
            {selectedExercises.length === 2 ? (
              <>
                <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
                  Comparison Panel
                </h3>
                <DumbbellChart
                  data={[
                    {
                      name: selectedExercises[0].Exercise_Name,
                      "User Rating": selectedExercises[0].User_Rating,
                      "SFR": selectedExercises[0].SFR,
                      "EMG Activation": selectedExercises[0].EMG_Activation / 10,
                      "Hypertrophy Score": selectedExercises[0].Hypertrophy_Score,
                      "Stretch Bonus (Yes/No)": selectedExercises[0].Stretch_Bonus * 10,
                    },
                    {
                      name: selectedExercises[1].Exercise_Name,
                      "User Rating": selectedExercises[1].User_Rating,
                      "SFR": selectedExercises[1].SFR,
                      "EMG Activation": selectedExercises[1].EMG_Activation / 10,
                      "Hypertrophy Score": selectedExercises[1].Hypertrophy_Score,
                      "Stretch Bonus (Yes/No)": selectedExercises[1].Stretch_Bonus * 10,
                    }
                  ]}
                  colors={["#4CAF50", "#FF5722"]}
                />
              </>
            ) : selectedExercises.length === 1 ? (
              <>
                <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
                  {selectedExercises[0].Exercise_Name}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <SingleMetricChart
                    data={{
                      "User Rating": selectedExercises[0].User_Rating,
                      "SFR": selectedExercises[0].SFR,
                      "EMG Activation": selectedExercises[0].EMG_Activation / 10,
                      "Hypertrophy Score": selectedExercises[0].Hypertrophy_Score,
                      "Stretch Bonus (Yes/No)": selectedExercises[0].Stretch_Bonus * 10,
                    }}
                    color="#4CAF50"
                  />
                  {ctrlSelectedExercises.length === 1 && (
                    <p style={{
                      fontStyle: "italic",
                      color: "#999",
                      marginTop: "-30px",
                      fontSize: "13px",
                      textAlign: "center"
                    }}>
                      Press <strong>CTRL</strong> and click another exercise to compare{" "}
                      <strong>{ctrlSelectedExercises[0].Exercise_Name}</strong> with it.
                    </p>
                  )}
                </div>
              </>

            ) : hoveredExercise ? (
              <>
                <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
                  {hoveredExercise.Exercise_Name}
                </h3>
                <p style={{ fontStyle: "italic", color: "#999" }}>Click to show details</p>
                {ctrlSelectedExercises.length === 1 ? (
                  <p style={{ fontStyle: "italic", color: "#999" }}>
                    Press CTRL and click another exercise to compare{" "}
                    <strong>{ctrlSelectedExercises[0].Exercise_Name}</strong> with it
                  </p>
                ) : (
                  <p style={{ fontStyle: "italic", color: "#999" }}>
                    Press CTRL and select two exercises for comparison
                  </p>
                )}
              </>
            ) : (
              <>
                <p style={{ fontStyle: "italic", color: "#999" }}>
                  Select an exercise to see details
                </p>
                {ctrlSelectedExercises.length === 1 ? (
                  <p style={{ fontStyle: "italic", color: "#999" }}>
                    Press CTRL and click another exercise to compare{" "}
                    <strong>{ctrlSelectedExercises[0].Exercise_Name}</strong> with it
                  </p>
                ) : (
                  <p style={{ fontStyle: "italic", color: "#999" }}>
                    Press CTRL and select two exercises for comparison
                  </p>
                )}
              </>
            )}

          </div>

        </div>
      </div>
      <footer style={{
        marginTop: "60px",
        fontSize: "12px",
        color: "#888",
        textAlign: "center"
      }}>
        Created by Eduard Gashi
      </footer>
    </div >
  );
}

export default App;
