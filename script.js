const jumpTo = (id) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
};

document.getElementById("openRoadmap")?.addEventListener("click", () => jumpTo("mvp-roadmap"));
document.getElementById("openMetrics")?.addEventListener("click", () => jumpTo("success-metrics"));
