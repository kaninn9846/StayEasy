import React, { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Home,
  Check,
  Building
} from "lucide-react";
import API from "../../services/api";
import PasswordStrengthBar from "../../components/Auth/PasswordStrengthBar";
import { validatePassword, isPasswordValid } from "../../utils/passwordValidation";
import "./Auth.css";

const Signup: React.FC = () => {
  const navigate = useNavigate();

  // ===============================
  // STATE MANAGEMENT
  // ===============================
  const [userType, setUserType] = useState<"tenant" | "owner">("tenant");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordRules = validatePassword(password);
  const passwordValid = isPasswordValid(passwordRules);
  const passwordMismatch = password2.length > 0 && password !== password2;

  // ===============================
  // HANDLE SIGNUP SUBMIT
  // ===============================
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!passwordValid) {
      setError("Password does not meet all requirements.");
      return;
    }

    if (password !== password2) {
      setError("Passwords do not match.");
      return;
    }

    // Split full name into first and last names
    const nameParts = fullName.trim().split(" ");
    const first_name = nameParts[0];
    const last_name = nameParts.slice(1).join(" ") || "";

    try {
      setLoading(true);

      // Send registration request
      await API.post("register/", {
        username: email, // Using email as username
        email,
        first_name,
        last_name,
        password,
        password2,
        user_type: userType, // "tenant" or "owner"
      });

      // Redirect to email verification page with email
      navigate("/verify-email", { state: { email } });

    } catch (err: any) {
      const data = err?.response?.data;

      // Clean error handling
      if (typeof data === "string") {
        setError(data);
      } else if (data?.detail) {
        setError(data.detail);
      } else if (data) {
        const firstKey = Object.keys(data)[0];
        const message = Array.isArray(data[firstKey])
          ? data[firstKey][0]
          : data[firstKey];
        setError(message);
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="auth-page-wrapper">
      <div className="auth-layout">

        {/* LEFT SIDE */}
        <div className="auth-left">
          <div className="auth-logo">
            <div className="logo-icon">
              <Home size={20} strokeWidth={2.5} color="white" />
            </div>
            <span className="logo-text">StayEasy</span>
          </div>

          <h1 className="auth-heading">Join StayEasy Today</h1>
          <p className="auth-subheading">
            Create your account and start finding or listing<br />
            properties in Nepal.
          </p>

          <div className="auth-features">
            {[
              "Verified Properties & Landlords",
              "Secure eSewa Payment Integration",
              "Digital Rental Agreements",
              "24/7 Customer Support"
            ].map((text, index) => (
              <div key={index} className="feature-item">
                <div className="check-circle">
                  <Check size={14} strokeWidth={3} />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE FORM */}
        <div className="auth-right">
          <div className="auth-card">

            {/* LOGIN / SIGNUP SWITCH */}
            <div className="tab-switcher">
              <button
                className="tab-btn"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
              <button className="tab-btn active">
                Sign Up
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit} className="auth-form">

              {/* ROLE SELECTION */}
              <div className="form-group">
                <label className="input-label">
                  I am a <span className="asterisk">*</span>
                </label>
                <div className="role-container">

                  {/* TENANT */}
                  <div
                    className={`role-box ${userType === "tenant" ? "active" : ""}`}
                    onClick={() => setUserType("tenant")}
                  >
                    <div className="role-icon-wrapper">
                      <User size={20} />
                    </div>
                    <span className="role-title">Tenant</span>
                    <span className="role-subtitle">
                      Looking for property
                    </span>
                  </div>

                  {/* LANDLORD */}
                  <div
                    className={`role-box ${userType === "owner" ? "active" : ""}`}
                    onClick={() => setUserType("owner")}
                  >
                    <div className="role-icon-wrapper">
                      <Building size={20} />
                    </div>
                    <span className="role-title">Landlord</span>
                    <span className="role-subtitle">
                      Listing property
                    </span>
                  </div>

                </div>
              </div>

              {/* FULL NAME */}
              <div className="form-group">
                <label className="input-label">Full Name <span className="asterisk">*</span></label>
                <div className="input-box">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label className="input-label">Email Address <span className="asterisk">*</span></label>
                <div className="input-box">
                  <Mail size={18} className="input-icon" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div className="form-group">
                <label className="input-label">Password <span className="asterisk">*</span></label>
                <div className="input-box">
                  <Lock size={18} className="input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} className="input-icon" /> : <Eye size={18} className="input-icon" />}
                  </button>
                </div>
                <PasswordStrengthBar password={password} />
              </div>

              {/* CONFIRM PASSWORD */}
              <div className="form-group">
                <label className="input-label">Confirm Password <span className="asterisk">*</span></label>
                <div className="input-box">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    placeholder="Confirm password"
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

              {/* ERROR */}
              {error && <p className="auth-error">{error}</p>}

              {/* SUBMIT BUTTON */}
              <button type="submit" className="submit-btn" disabled={loading || !passwordValid}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="auth-bottom-text">
              Already have an account? <Link to="/login" className="signup-link">Sign In</Link>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Signup;