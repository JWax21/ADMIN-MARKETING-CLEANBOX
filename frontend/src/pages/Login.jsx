import React, { useState, useRef, useEffect } from "react";
import apiClient from "../api/axios";
import "./Login.css";

const Login = () => {
  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 4);
    if (/^\d+$/.test(pastedData)) {
      const newCode = pastedData.split("").concat(["", "", "", ""]).slice(0, 4);
      setCode(newCode);
      // Focus the last filled input or the first empty one
      const lastIndex = Math.min(pastedData.length - 1, 3);
      inputRefs[lastIndex].current?.focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const fullCode = code.join("");
    
    if (fullCode.length !== 4) {
      setError("Please enter a 4-digit code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post("/api/auth/login", {
        code: fullCode,
      });

      if (response.data.success) {
        // Store token in localStorage
        localStorage.setItem("admin_token", response.data.token);
        // Reload to trigger auth check
        window.location.href = "/";
      }
    } catch (error) {
      setError(
        error.response?.data?.error || "Invalid code. Please try again."
      );
      // Clear code on error
      setCode(["", "", "", ""]);
      inputRefs[0].current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group code-input-group">
            <label htmlFor="code">Access Code</label>
            <div className="code-inputs">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={inputRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="code-input"
                  disabled={loading}
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || code.join("").length !== 4}
          >
            {loading ? "Verifying..." : "Access Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
