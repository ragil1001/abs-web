"use client";
import React, { useState, useEffect } from "react";
import AssignPage from "./AssignPage";
import AssignKaryawanDetail from "./AssignKaryawanDetail";

const AssignKaryawan = () => {
  const [currentView, setCurrentView] = useState("list");
  const [selectedProject, setSelectedProject] = useState(null);

  // Persist state to localStorage
  useEffect(() => {
    const savedView = localStorage.getItem("assignView");
    const savedProject = localStorage.getItem("assignSelectedProject");

    if (savedView) {
      setCurrentView(savedView);
    }

    if (savedProject) {
      try {
        setSelectedProject(JSON.parse(savedProject));
      } catch (e) {
        console.error("Error parsing saved project:", e);
      }
    }
  }, []);

  // Save state when it changes
  useEffect(() => {
    localStorage.setItem("assignView", currentView);
    if (selectedProject) {
      localStorage.setItem(
        "assignSelectedProject",
        JSON.stringify(selectedProject)
      );
    } else {
      localStorage.removeItem("assignSelectedProject");
    }
  }, [currentView, selectedProject]);

  const handleNavigateToDetail = (project) => {
    setSelectedProject(project);
    setCurrentView("detail");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedProject(null);
  };

  if (currentView === "detail" && selectedProject) {
    return (
      <AssignKaryawanDetail
        project={selectedProject}
        onBack={handleBackToList}
      />
    );
  }

  return <AssignPage onNavigateToDetail={handleNavigateToDetail} />;
};

export default AssignKaryawan;
