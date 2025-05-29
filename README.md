# Fitness Exercises Visualization

Repository for a visualization of fitness exercises implemented using D3.js and a React app.  
Created for the **Information Visualization** class at **Sungkyunkwan University (SKKU)**.  
**Student ID:** 2025318365

---

## Project Overview

This project presents a visual interface that allows users to explore various fitness exercises, ranked by a custom Hypertrophy Score. This score is calculated using scientifically relevant metrics including EMG activation and Stimulus-to-Fatigue Ratio (SFR). It also incorporates whether the exercise provides a deep loaded stretch — a key factor for muscle hypertrophy — as well as user ratings sourced from members of Bodybuilding.com.
- Hover and click bars to explore exercises by muscle group and view detailed information about each exercise
- Click on x-axis labels to drill down into a specific muscle group and see more exercises related to it
- Hold Ctrl (or ⌘ on Mac) and click to select and compare two exercises side by side
- Filter exercises by equipment type using the sidebar
- Choose how many top exercises to display per muscle group with a dropdown selector

---

## How to Run This Project Locally

Follow these steps to run the interface on your computer:

### 1. **Clone the repository**

Open a terminal and run:

```bash
git clone https://github.com/eduard-gashi/fitness-exercises-visualization.git
cd fitness-exercises-visualization
```

### 2. Install Dependencies

Make sure you have **Node.js** and **npm** installed on your machine.

```bash
npm install
```

### 3. Start the Development Server

Run the following command to start the React development server:

```bash
npm start
```

Your browser should automatically open at:

```
http://localhost:3000
```

If it doesn’t, open that address manually.

---

## Technologies Used

- **React.js** – Frontend framework
- **D3.js** – Data-driven visualizations
- **Framer Motion** – Smooth transitions and animations
- **JavaScript (ES6+)**
- **CSS-in-JS** – Inline React styling

---

## Author

**Eduard Gashi**  
Student ID: 2025318365  
Information Visualization @ SKKU

---
