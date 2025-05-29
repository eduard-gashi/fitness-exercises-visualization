import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import BarChart from "./components/BarChart";
import * as d3 from "d3";

const EQUIPMENT_COLORS = {
  "Dumbbell": "#8e44ad",
  "Barbell": "#2ecc71",
  "Machine": "#f39c12",
  "Body-Only": "#e74c3c",
  "Cable": "#f74c3c"
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
        console.log(row.Target_Muscle);

        // Composite score
        const weights = {
          SFR: 0.35,
          EMG: 0.25,
          User_Rating: 0.15,
          Stretch_Bonus: 0.25
        };
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

        // If third exercise is selected → clear everything and go back to default
        if (updated.length > 2) {
          setSelectedExercises([]);
          setCtrlSelectedExercises([]);
          return [];
        }

        // If second exercise is selected → enter comparison
        if (updated.length === 2) {
          setSelectedExercises(updated);
        } else {
          // Only one selected → no comparison yet
          setSelectedExercises([]);
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
            onMuscleGroupClick={setSelectedMuscleGroup}
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

          {/* Equipment Panel */}
          <div style={{
            width: "100%",
            maxWidth: "300px",
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

          {/* Amount of Exercises */}
          <div style={{
            width: "100%",
            maxWidth: "260px",
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

          {/* Info / Comparison Panel */}
          <div style={{
            width: "100%",
            maxWidth: "400px",
            border: "1px solid #ccc",
            borderRadius: "6px",
            backgroundColor: "#f9f9f9",
            padding: "15px",
            fontSize: "14px",
            minHeight: "250px"
          }}>
            {selectedExercises.length === 2 ? (
              <>
                <h3>Comparison Panel</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", width: "40%" }}></th>
                      {selectedExercises.map(ex => (
                        <th
                          key={ex.Exercise_Name}
                          style={{
                            textAlign: "center",
                            fontWeight: "600",
                            fontSize: "14px",
                            padding: "8px 4px",
                            borderBottom: "1px solid #ddd"
                          }}
                        >
                          {ex.Exercise_Name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Equipment", ex => ex.Equipment],
                      ["Target Muscles", ex => ex.Target_Muscle_List.join(", ")],
                      ["User Rating", ex => ex.User_Rating],
                      ["SFR", ex => ex.SFR],
                      ["EMG Activation", ex => `${ex.EMG_Activation}%`],
                      ["Stretch Bonus", ex => ex.Stretch_Bonus ? "Yes" : "No"],
                      ["Hypertrophy Score", ex => ex.Hypertrophy_Score]
                    ].map(([label, accessor]) => (
                      <tr
                        key={label}
                        style={{
                          borderBottom: "1px solid #eee",
                          backgroundColor: label === "Hypertrophy Score" ? "#e6f7e6" : "transparent"
                        }}
                      >
                        <td
                          style={{
                            fontWeight: label === "Hypertrophy Score" ? "bold" : "normal",
                            padding: "6px 4px"
                          }}
                        >
                          {label}
                        </td>
                        {selectedExercises.map(ex => (
                          <td
                            key={ex.Exercise_Name + label}
                            style={{
                              textAlign: "center",
                              padding: "6px 4px",
                              fontWeight: label === "Hypertrophy Score" ? "bold" : "normal",
                              color: label === "Hypertrophy Score" ? "#2e7d32" : "inherit"
                            }}
                          >
                            {accessor(ex)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : selectedExercises.length === 1 ? (
              <>
                <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
                  {selectedExercises[0].Exercise_Name}
                </h3>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <tbody>
                    {[
                      ["Muscle Group", selectedExercises[0].Muscle_Group],
                      ["Target Muscles", selectedExercises[0].Target_Muscle_List.join(", ")],
                      ["Equipment", selectedExercises[0].Equipment],
                      ["User Rating", selectedExercises[0].User_Rating],
                      ["SFR", selectedExercises[0].SFR],
                      ["EMG Activation", `${selectedExercises[0].EMG_Activation}%`],
                      ["Stretch Bonus", selectedExercises[0].Stretch_Bonus ? "Yes" : "No"],
                      ["Hypertrophy Score", selectedExercises[0].Hypertrophy_Score]
                    ].map(([label, value]) => (
                      <tr
                        key={label}
                        style={{
                          borderBottom: "1px solid #eee",
                          backgroundColor: label === "Hypertrophy Score" ? "#e6f7e6" : "transparent"
                        }}
                      >
                        <td
                          style={{
                            fontWeight: label === "Hypertrophy Score" ? "bold" : "normal",
                            padding: "6px 4px"
                          }}
                        >
                          {label}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            padding: "6px 4px",
                            fontWeight: label === "Hypertrophy Score" ? "bold" : "normal",
                            color: label === "Hypertrophy Score" ? "#2e7d32" : "inherit"
                          }}
                        >
                          {value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : hoveredExercise ? (
              <>
                <h3 style={{ textAlign: "center", marginBottom: "10px" }}>
                  <>{hoveredExercise.Exercise_Name}</>
                </h3>
                <p style={{ fontStyle: "italic", color: "#999" }}>Click to show details</p>
                <p style={{ fontStyle: "italic", color: "#999" }}>Press CRTL and select two exercises for comparison</p>
              </>
            ) : (
              <>
                <p style={{ fontStyle: "italic", color: "#999" }}>
                  Click an exercise to see details
                </p>
                <p style={{ fontStyle: "italic", color: "#999" }}>
                  Press CTRL and select two exercises for comparison
                </p>
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
