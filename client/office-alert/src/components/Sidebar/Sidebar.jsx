import { useState } from "react";
import "./Sidebar.css";

function Sidebar({ activeItem = "assets", onSelect = () => {} }) {
  // State for controlling Assets sub-menu expansion (hidden by default)
  const [isAssetsOpen, setIsAssetsOpen] = useState(false);
  const [selectedSubItem, setSelectedSubItem] = useState("software");

  const toggleAssets = (e) => {
    e.stopPropagation();
    setIsAssetsOpen((prev) => !prev);
  };

  return (
    <aside className="app-sidebar">
      <nav className="sidebar-nav">
        {/* Item 1: Companies */}
        <div 
          className={`nav-item ${activeItem === "companies" ? "active" : ""}`}
          onClick={() => onSelect("companies")}
        >
          <div className="nav-item-header">
            <svg 
              className="nav-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span className="nav-label">Companies</span>
          </div>
        </div>

        {/* Item 2: Assets (with expandable sub-menu) */}
        <div className={`nav-item-group ${isAssetsOpen ? "expanded" : ""}`}>
          <div 
            className={`nav-item ${activeItem === "assets" ? "active" : ""}`}
            onClick={() => setIsAssetsOpen((prev) => !prev)}
          >
            <div className="nav-item-header">
              <svg 
                className="nav-icon" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              <span className="nav-label">Assets</span>
            </div>

            {/* Expand / Collapse Toggle Button */}
            <button 
              type="button" 
              className={`expand-btn ${isAssetsOpen ? "open" : ""}`}
              onClick={toggleAssets}
              aria-label={isAssetsOpen ? "Collapse Assets" : "Expand Assets"}
              title={isAssetsOpen ? "Collapse" : "Expand"}
            >
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {/* Sub-menu: Hidden by default, expands vertically below each other */}
          {isAssetsOpen && (
            <div className="sub-menu-container">
              <div className="sub-menu-tree-line" />
              <div className="sub-menu-list">
                <button
                  type="button"
                  className={`sub-menu-item ${selectedSubItem === "hardware" ? "active" : ""}`}
                  onClick={() => setSelectedSubItem("hardware")}
                >
                  <span className="sub-menu-bullet">•</span>
                  <span className="sub-menu-label">Hardware Assets</span>
                </button>

                <button
                  type="button"
                  className={`sub-menu-item ${selectedSubItem === "software" ? "active" : ""}`}
                  onClick={() => setSelectedSubItem("software")}
                >
                  <span className="sub-menu-bullet">•</span>
                  <span className="sub-menu-label">Software Assets</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Item 3: Engineers */}
        <div 
          className={`nav-item ${activeItem === "engineers" ? "active" : ""}`}
          onClick={() => onSelect("engineers")}
        >
          <div className="nav-item-header">
            <svg 
              className="nav-icon" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="nav-label">Engineers</span>
          </div>
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
