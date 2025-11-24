import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { BsHandIndexThumb } from "react-icons/bs";
import { MdPeopleAlt } from "react-icons/md";
import { MdAbc } from "react-icons/md";
import { PiRanking } from "react-icons/pi";
import { FaCompressArrowsAlt } from "react-icons/fa";
import { VscGraphLine } from "react-icons/vsc";
import { HiChartBar } from "react-icons/hi";
import { MdTrendingUp } from "react-icons/md";
import { MdSpeed } from "react-icons/md";
import { MdInsights } from "react-icons/md";
import { MdSearch } from "react-icons/md";
import { MdGroups } from "react-icons/md";
import "./Layout.css";

const Layout = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    navigate("/login");
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo-container">
            <img src="/logo.png" alt="Protein Bar Nerd Logo" className="sidebar-logo" />
          </div>
          <h2>PROTEIN BAR NERD</h2>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-label">Traffic</div>
            <NavLink to="/visitors" className="nav-link">
              <span className="nav-icon">
                <MdPeopleAlt />
              </span>
              Visitors
            </NavLink>
            <NavLink to="/search-performance" className="nav-link">
              <span className="nav-icon">
                <VscGraphLine />
              </span>
              Search Performance
            </NavLink>
            <NavLink to="/traffic-sources" className="nav-link">
              <span className="nav-icon">
                <FaCompressArrowsAlt />
              </span>
              Traffic Sources
            </NavLink>
            <NavLink to="/engagement" className="nav-link">
              <span className="nav-icon">
                <HiChartBar />
              </span>
              Engagement
            </NavLink>
            <NavLink to="/conversion" className="nav-link">
              <span className="nav-icon">
                <MdTrendingUp />
              </span>
              Conversion
            </NavLink>
            <NavLink to="/technical" className="nav-link">
              <span className="nav-icon">
                <MdSpeed />
              </span>
              Technical
            </NavLink>
            <NavLink to="/content" className="nav-link">
              <span className="nav-icon">
                <MdInsights />
              </span>
              Content
            </NavLink>
            <NavLink to="/seo" className="nav-link">
              <span className="nav-icon">
                <MdSearch />
              </span>
              SEO
            </NavLink>
            <NavLink to="/audience" className="nav-link">
              <span className="nav-icon">
                <MdGroups />
              </span>
              Audience
            </NavLink>
          </div>

          <div className="nav-section">
            <div className="nav-section-label">Google Rankings</div>
            <NavLink to="/page-index" className="nav-link">
              <span className="nav-icon">
                <BsHandIndexThumb />
              </span>
              Page Index
            </NavLink>
            <NavLink to="/top-pages" className="nav-link">
              <span className="nav-icon">
                <PiRanking />
              </span>
              Top Pages
            </NavLink>
            <NavLink to="/page-rankings" className="nav-link">
              <span className="nav-icon">
                <MdAbc />
              </span>
              Queries
            </NavLink>
          </div>
        </nav>
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="btn btn-secondary logout-btn"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
