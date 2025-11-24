import React, { useState, useEffect } from "react";
import axios from "../api/axios";
import "./EmailList.css";

const EmailList = () => {
  const [emailList, setEmailList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all"); // "all" or "address"

  useEffect(() => {
    fetchEmailList();
  }, []);

  const fetchEmailList = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/email-list");
      
      if (response.data.success) {
        setEmailList(response.data.data);
      } else {
        setError("Failed to fetch email list");
      }
    } catch (err) {
      console.error("Error fetching email list:", err);
      setError(err.response?.data?.error || "Failed to fetch email list");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (e) {
      return "N/A";
    }
  };

  const hasValidAddress = (customer) => {
    // Check if address exists and is not just "N/A"
    return (
      customer.fullAddress &&
      customer.fullAddress !== "N/A" &&
      customer.fullAddress.trim() !== "" &&
      customer.shipping_address &&
      customer.shipping_address.street &&
      customer.shipping_address.street.trim() !== ""
    );
  };

  // Calculate totals for each tab
  const allEmailsCount = emailList.length;
  const allAddressCount = emailList.filter(hasValidAddress).length;

  const filteredEmailList = emailList.filter((customer) => {
    // First filter by tab
    if (activeTab === "address" && !hasValidAddress(customer)) {
      return false;
    }

    // Then filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        customer.email?.toLowerCase().includes(searchLower) ||
        customer.fullName?.toLowerCase().includes(searchLower) ||
        customer.fullAddress?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = ["Email", "Date", "Name", "Address"];
    const csvData = filteredEmailList.map((customer) => [
      customer.email,
      formatDate(customer.createdAt),
      customer.fullName,
      customer.fullAddress,
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `email-list-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="email-list-container">
        <div className="loading">Loading email list...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="email-list-container">
        <div className="error-message">
          <p>Error: {error}</p>
          <button onClick={fetchEmailList} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="email-list-container">
      <div className="page-header">
        <h1>Email List</h1>
        <p className="page-subtitle">
          {searchTerm ? `Showing ${filteredEmailList.length} filtered results` : "All customers with email addresses"}
        </p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All Emails ({allEmailsCount})
        </button>
        <button
          className={`tab ${activeTab === "address" ? "active" : ""}`}
          onClick={() => setActiveTab("address")}
        >
          All Address ({allAddressCount})
        </button>
      </div>

      <div className="email-list-controls">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by email, name, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button onClick={exportToCSV} className="btn btn-primary">
          Export to CSV
        </button>
      </div>

      <div className="email-list-table-container">
        <table className="email-list-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Date</th>
              <th>Name</th>
              <th>Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmailList.length === 0 ? (
              <tr>
                <td colSpan="4" className="no-data">
                  No customers found
                </td>
              </tr>
            ) : (
              filteredEmailList.map((customer) => (
                <tr key={customer._id}>
                  <td className="email-cell">{customer.email}</td>
                  <td>{formatDate(customer.createdAt)}</td>
                  <td>{customer.fullName}</td>
                  <td className="address-cell">{customer.fullAddress}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmailList;

