import "./Login.css";
import { useState, useEffect } from "react";
import api from "../services/api";
import { BeamsBackground } from "../components/ui/beams-background";
import SplitText from "./SplitText";
import { motion } from "motion/react";
import logo from "../assets/logo.png";

function Login({ onLogin }) {
  const getSessionValue = (key, defaultValue) => {
    const val = sessionStorage.getItem(key);
    if (val === null) return defaultValue;
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  };

  const shouldSkipIntro = () => {
    return (
      sessionStorage.getItem("skipLoginIntro") === "true" ||
      !!(
        getSessionValue("login_employeeId", "") ||
        getSessionValue("login_workspaceCode", "") ||
        getSessionValue("login_fullName", "") ||
        getSessionValue("login_newEmployeeId", "") ||
        getSessionValue("login_companyName", "")
      )
    );
  };

  const [isIntro, setIsIntro] = useState(() => !shouldSkipIntro());
  const [showForm, setShowForm] = useState(() => shouldSkipIntro());

  const handleAnimationComplete = () => {
    console.log('All letters have animated!');
    setTimeout(() => {
      setIsIntro(false);
      sessionStorage.setItem("skipLoginIntro", "true");
      setTimeout(() => {
        setShowForm(true);
      }, 500);
    }, 1000);
  };

  const [tab, setTab] = useState(() => getSessionValue("login_tab", "login"));
  
  // Login Form States
  const [employeeId, setEmployeeId] = useState(() => getSessionValue("login_employeeId", ""));
  const [password, setPassword] = useState(() => getSessionValue("login_password", ""));
  
  // Workspace Join States
  const [workspaceCode, setWorkspaceCode] = useState(() => getSessionValue("login_workspaceCode", ""));
  const [workspaceVerified, setWorkspaceVerified] = useState(() => getSessionValue("login_workspaceVerified", false));
  const [verifiedOrg, setVerifiedOrg] = useState(() => getSessionValue("login_verifiedOrg", null));
  const [fullName, setFullName] = useState(() => getSessionValue("login_fullName", ""));
  const [newEmployeeId, setNewEmployeeId] = useState(() => getSessionValue("login_newEmployeeId", ""));
  const [department, setDepartment] = useState(() => getSessionValue("login_department", "General"));
  const [newPassword, setNewPassword] = useState(() => getSessionValue("login_newPassword", ""));
  
  // Company Registration States
  const [companyName, setCompanyName] = useState(() => getSessionValue("login_companyName", ""));
  const [companyEmail, setCompanyEmail] = useState(() => getSessionValue("login_companyEmail", ""));
  const [adminName, setAdminName] = useState(() => getSessionValue("login_adminName", ""));
  const [adminPassword, setAdminPassword] = useState(() => getSessionValue("login_adminPassword", ""));
  const [createdWorkspaceCode, setCreatedWorkspaceCode] = useState("");
  const [copied, setCopied] = useState(false);

  // Common UI States
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync form states to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem("login_tab", JSON.stringify(tab));
    sessionStorage.setItem("login_employeeId", JSON.stringify(employeeId));
    sessionStorage.setItem("login_password", JSON.stringify(password));
    sessionStorage.setItem("login_workspaceCode", JSON.stringify(workspaceCode));
    sessionStorage.setItem("login_workspaceVerified", JSON.stringify(workspaceVerified));
    sessionStorage.setItem("login_verifiedOrg", JSON.stringify(verifiedOrg));
    sessionStorage.setItem("login_fullName", JSON.stringify(fullName));
    sessionStorage.setItem("login_newEmployeeId", JSON.stringify(newEmployeeId));
    sessionStorage.setItem("login_department", JSON.stringify(department));
    sessionStorage.setItem("login_newPassword", JSON.stringify(newPassword));
    sessionStorage.setItem("login_companyName", JSON.stringify(companyName));
    sessionStorage.setItem("login_companyEmail", JSON.stringify(companyEmail));
    sessionStorage.setItem("login_adminName", JSON.stringify(adminName));
    sessionStorage.setItem("login_adminPassword", JSON.stringify(adminPassword));
  }, [
    tab, employeeId, password, workspaceCode, workspaceVerified, verifiedOrg,
    fullName, newEmployeeId, department, newPassword, companyName, companyEmail,
    adminName, adminPassword
  ]);

  const clearSessionForm = () => {
    const keys = [
      "login_tab", "login_employeeId", "login_password", "login_workspaceCode",
      "login_workspaceVerified", "login_verifiedOrg", "login_fullName",
      "login_newEmployeeId", "login_department", "login_newPassword",
      "login_companyName", "login_companyEmail", "login_adminName",
      "login_adminPassword"
    ];
    keys.forEach(key => sessionStorage.removeItem(key));
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!employeeId.trim()) {
      setError("Please enter your Employee ID or Email.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/login", {
        employee_id: employeeId.trim(),
        password,
      });

      const { token, employee } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("employee", JSON.stringify(employee));

      onLogin(employee, token);
      clearSessionForm();
    } catch (err) {
      const message = err.response?.data?.error || "Invalid Employee ID/Email or password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Workspace Code Verification
  const handleVerifyWorkspace = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!workspaceCode.trim()) {
      setError("Please enter a workspace code.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/verify-workspace", {
        workspace_code: workspaceCode.trim(),
      });

      if (res.data.success) {
        setVerifiedOrg(res.data.organization);
        setWorkspaceVerified(true);
      }
    } catch (err) {
      const message = err.response?.data?.error || "Invalid workspace code.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Employee Account Creation
  const handleRegisterEmployee = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!fullName.trim() || !newEmployeeId.trim() || !newPassword) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    try {
      const registerRes = await api.post("/auth/register-employee", {
        workspace_code: workspaceCode.trim(),
        employee_id: newEmployeeId.trim(),
        name: fullName.trim(),
        password: newPassword,
        department: department,
      });

      if (registerRes.data.success) {
        // Automatically login the employee after registration
        const loginRes = await api.post("/auth/login", {
          employee_id: newEmployeeId.trim(),
          password: newPassword,
        });

        const { token, employee } = loginRes.data;
        localStorage.setItem("token", token);
        localStorage.setItem("employee", JSON.stringify(employee));
        onLogin(employee, token);
        clearSessionForm();
      }
    } catch (err) {
      const message = err.response?.data?.error || "Registration failed. Try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Company Registration
  const handleRegisterCompany = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!companyName.trim() || !companyEmail.trim() || !adminName.trim() || !adminPassword) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/register-company", {
        company_name: companyName.trim(),
        company_email: companyEmail.trim(),
        admin_name: adminName.trim(),
        password: adminPassword,
      });

      if (res.data.success) {
        setCreatedWorkspaceCode(res.data.workspace_code);
        setSuccess("Workspace created successfully!");
      }
    } catch (err) {
      const message = err.response?.data?.error || "Company registration failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // Copy Workspace Code to Clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(createdWorkspaceCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Switch tabs cleanly
  const switchTab = (newTab) => {
    setTab(newTab);
    setError("");
    setSuccess("");
    setWorkspaceVerified(false);
    setVerifiedOrg(null);
    setFullName("");
    setNewEmployeeId("");
    setNewPassword("");
    setWorkspaceCode("");
  };

  return (
    <BeamsBackground className="login-container">
      <motion.div 
        layout 
        className={`login-card ${isIntro ? "intro" : "form-active"}`}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
      >
        <motion.div layout className="login-header">
          {!isIntro && (
            <div className="login-logo-container">
              <img src={logo} alt="Office Alert Logo" className="login-logo-img" />
            </div>
          )}
          <motion.h1 
            layout 
            style={{ 
              fontSize: isIntro ? "4rem" : "1.75rem",
              margin: 0,
              fontWeight: 700
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          >
            {isIntro ? (
              <SplitText
                text="Office Alert"
                className="font-semibold text-center tracking-tighter"
                delay={50}
                duration={1.00}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 40 }}
                to={{ opacity: 1, y: 0 }}
                threshold={0.1}
                rootMargin="-100px"
                textAlign="center"
                onLetterAnimationComplete={handleAnimationComplete}
                showCallback
              />
            ) : (
              <span className="font-semibold text-center tracking-tighter">Office Alert</span>
            )}
          </motion.h1>
          
          {!isIntro && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={showForm ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="login-subtitle"
            >
              {tab === "login" && "Sign in to your organization"}
              {tab === "join" && "Join your team workspace"}
              {tab === "register-company" && "Register a new company"}
            </motion.p>
          )}
        </motion.div>

        {!isIntro && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={showForm ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >

        {/* Tab Toggle Navigation */}
        <div className="login-tabs">
          <button 
            type="button"
            className={tab === "login" ? "tab-btn active" : "tab-btn"} 
            onClick={() => switchTab("login")}
          >
            Login
          </button>
          <button 
            type="button"
            className={tab === "join" ? "tab-btn active" : "tab-btn"} 
            onClick={() => switchTab("join")}
          >
            Join
          </button>
          <button 
            type="button"
            className={tab === "register-company" ? "tab-btn active" : "tab-btn"} 
            onClick={() => switchTab("register-company")}
          >
            Register Org
          </button>
        </div>

        {/* TAB 1: EMPLOYEE LOGIN */}
        {tab === "login" && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="input-group">
              <label htmlFor="employeeId">Employee ID or Email</label>
              <div className="input-wrapper">
                <span className="input-icon"></span>
                <input
                  id="employeeId"
                  type="text"
                  placeholder="e.g. EMP001 or admin@abc.com"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon"></span>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="login-btn">
              {loading ? <span className="spinner"></span> : "Sign In"}
            </button>
          </form>
        )}

        {/* TAB 2: JOIN WORKSPACE (Employee Registration) */}
        {tab === "join" && (
          <div className="join-workspace-flow">
            {!workspaceVerified ? (
              // Step 1: Verify Workspace Code
              <form onSubmit={handleVerifyWorkspace} className="login-form">
                <div className="input-group">
                  <label htmlFor="wsCode">Enter Workspace Code</label>
                  <p className="field-hint">Provided by your administrator (e.g. ABC-82K9X)</p>
                  <div className="input-wrapper">
                    <span className="input-icon"></span>
                    <input
                      id="wsCode"
                      type="text"
                      placeholder="e.g. ABC-82K9X"
                      value={workspaceCode}
                      onChange={(e) => setWorkspaceCode(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" disabled={loading} className="login-btn">
                  {loading ? <span className="spinner"></span> : "Continue"}
                </button>
              </form>
            ) : (
              // Step 2: Workspace details verified, register account
              <form onSubmit={handleRegisterEmployee} className="login-form">
                <div className="verified-org-badge">
                  <span>Workspace Code: <strong>{verifiedOrg?.workspace_code}</strong></span>
                  <h3>{verifiedOrg?.company_name}</h3>
                </div>

                <div className="input-group">
                  <label htmlFor="fullName">Full Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon"></span>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="newEmpId">Employee ID</label>
                  <div className="input-wrapper">
                    <span className="input-icon"></span>
                    <input
                      id="newEmpId"
                      type="text"
                      placeholder="e.g. EMP102"
                      value={newEmployeeId}
                      onChange={(e) => setNewEmployeeId(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="dept">Department</label>
                  <div className="input-wrapper select-wrapper">
                    <span className="input-icon"></span>
                    <select
                      id="dept"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="form-select"
                    >
                      <option value="General">General</option>
                      <option value="Engineering">Engineering</option>
                      <option value="Design">Design</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Sales">Sales</option>
                      <option value="HR">HR</option>
                      <option value="Accounts">Accounts</option>
                      <option value="Management">Management</option>
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="newPass">Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon"></span>
                    <input
                      id="newPass"
                      type="password"
                      placeholder="Create password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="action-buttons-row">
                  <button 
                    type="button" 
                    className="back-btn" 
                    onClick={() => setWorkspaceVerified(false)}
                  >
                    Back
                  </button>
                  <button type="submit" disabled={loading} className="login-btn submit-half">
                    {loading ? <span className="spinner"></span> : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: REGISTER COMPANY */}
        {tab === "register-company" && (
          <div className="register-company-flow">
            {success ? (
              // Success Screen with Workspace Code
              <div className="success-screen">
                <div className="success-checkmark"></div>
                <h2>Workspace Created!</h2>
                <p>Provide this workspace code to your team so they can register and join:</p>
                
                <div className="workspace-code-display" onClick={handleCopyCode}>
                  <code>{createdWorkspaceCode}</code>
                  <span className="copy-label">{copied ? "Copied! ✓" : "Click to Copy"}</span>
                </div>

                <button 
                  type="button" 
                  className="login-btn" 
                  onClick={() => switchTab("login")}
                >
                  Proceed to Login
                </button>
              </div>
            ) : (
              // Form screen
              <form onSubmit={handleRegisterCompany} className="login-form">
                <div className="input-group">
                  <label htmlFor="compName">Company Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon"></span>
                    <input
                      id="compName"
                      type="text"
                      placeholder="e.g. ABC Plumbing Services"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="compEmail">Company Email</label>
                  <div className="input-wrapper">
                    <span className="input-icon"></span>
                    <input
                      id="compEmail"
                      type="email"
                      placeholder="e.g. info@abcplumbing.com"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="admName">Admin Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon"></span>
                    <input
                      id="admName"
                      type="text"
                      placeholder="e.g. Admin User"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label htmlFor="admPass">Admin Password</label>
                  <div className="input-wrapper">
                    <span className="input-icon"></span>
                    <input
                      id="admPass"
                      type="password"
                      placeholder="Create password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button type="submit" disabled={loading} className="login-btn">
                  {loading ? <span className="spinner"></span> : "Register Workspace"}
                </button>
              </form>
            )}
          </div>
        )}

            <p className="login-footer">
              Secure multi-tenant workspace powered by JWT
            </p>
          </motion.div>
        )}
      </motion.div>
    </BeamsBackground>
  );
}

export default Login;