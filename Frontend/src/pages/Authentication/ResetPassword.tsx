import React, { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Lock, Home, Check, Eye, EyeOff } from "lucide-react";
import { resetPasswordApi } from "../../services/api";
import PasswordStrengthBar from "../../components/Auth/PasswordStrengthBar";
import { validatePassword, isPasswordValid } from "../../utils/passwordValidation";
import "./Auth.css";

const ResetPassword: React.FC = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const passwordRules = validatePassword(password);
  const passwordValid = isPasswordValid(passwordRules);
  const passwordMismatch = password2.length > 0 && password !== password2;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }
    if (!passwordValid) {
      setError("Password does not meet all requirements.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await resetPasswordApi({ token, password, password2 });
      setDone(true);
    } catch (err: any) {
      const data = err.response?.data;
      setError(data?.error || data?.password2?.[0] || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-layout">
          <div className="auth-left">
            <h1 className="auth-heading">Invalid Link</h1>
            <p className="auth-subheading">This password reset link is invalid. Please request a new one.</p>
          </div>
          <div className="auth-right">
            <div className="auth-card" style={{ textAlign: "center" }}>
              <Link to="/forgot-password" className="submit-btn" style={{ display: "block", textDecoration: "none", lineHeight: "48px" }}>
                Request New Link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-layout">
          <div className="auth-left">
            <div className="auth-logo">
              <div className="logo-icon"><Home size={20} strokeWidth={2.5} color="white" /></div>
              <span className="logo-text">StayEasy</span>
            </div>
            <h1 className="auth-heading">Password Reset!</h1>
            <p className="auth-subheading">Your password has been successfully updated. You can now log in with your new password.</p>
          </div>
          <div className="auth-right">
            <div className="auth-card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16, color: "#4caf50" }}><Check size={56} /></div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1e1e2d", marginBottom: 8 }}>All Done!</h2>
              <p style={{ fontSize: 14, color: "#7a7a9d", marginBottom: 20 }}>Your password has been reset successfully.</p>
              <Link to="/login" className="submit-btn" style={{ display: "block", textDecoration: "none", lineHeight: "48px" }}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page-wrapper">
      <div className="auth-layout">
        <div className="auth-left">
          <div className="auth-logo">
            <div className="logo-icon"><Home size={20} strokeWidth={2.5} color="white" /></div>
            <span className="logo-text">StayEasy</span>
          </div>
          <h1 className="auth-heading">Set New Password</h1>
          <p className="auth-subheading">Enter your new password below. Make sure it's at least 8 characters.</p>
        </div>
        <div className="auth-right">
          <div className="auth-card">
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="input-label">New Password <span className="asterisk">*</span></label>
                <div className="input-box">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="eye-btn" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={18} className="input-icon" /> : <Eye size={18} className="input-icon" />}
                  </button>
                </div>
                <PasswordStrengthBar password={password} />
              </div>
              <div className="form-group">
                <label className="input-label">Confirm Password <span className="asterisk">*</span></label>
                <div className="input-box">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    required
                  />
                </div>
                {passwordMismatch && (
                  <p className="text-xs text-red-500 mt-1">
                    Passwords do not match
                  </p>
                )}
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button className="submit-btn" disabled={loading || !passwordValid}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
            <div className="auth-bottom-text">
              <Link to="/login" style={{ color: "#a37bc8", textDecoration: "none", fontWeight: 600 }}>Back to Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
