import { useEffect, useState, useRef } from "react";
import { notify, clearNotificationCount } from "../utils/NotificationManager";
import api from "../services/api";
import "./Home.css";

import bellSound from "../assets/sounds/bell.mp3";
import UserCard from "../components/UserCard";
import Notification from "../components/Notifications/Notification";
import ChatWindow from "../components/Chat/ChatWindow";
import logo from "../assets/logo.png";
import Sidebar from "../components/Sidebar/Sidebar";

function Home({ employee, socket, onLogout }) {
  const [activeTab, setActiveTab] = useState("chat"); // "chat" or "admin" (if admin)
  const [statusOnline, setStatusOnline] = useState(() => {
    return localStorage.getItem("presence_status") !== "offline";
  });

  const toggleOnlineStatus = () => {
    const nextStatus = !statusOnline;
    setStatusOnline(nextStatus);
    
    const statusString = nextStatus ? "online" : "offline";
    localStorage.setItem("presence_status", statusString);
    
    if (socket) {
      socket.emit("toggle_status", { status: statusString });
    }
  };
  
  // Chat Lists
  const [channels, setChannels] = useState([]);
  const [coworkers, setCoworkers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  
  // Selected Chat State
  const [selectedChat, setSelectedChat] = useState(null); // { type: 'private'|'room', id, name }
  const [messages, setMessages] = useState([]);
  
  // Real-time states
  const [caller, setCaller] = useState("");
  const [showNotification, setShowNotification] = useState(false);
  const [typingUser, setTypingUser] = useState(null); // { from, name, room_id }

  // Admin Dashboard States
  const [adminStats, setAdminStats] = useState(null);
  const [allEmployees, setAllEmployees] = useState([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [newEmpId, setNewEmpId] = useState("");
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpDept, setNewEmpDept] = useState("General");
  const [newEmpPassword, setNewEmpPassword] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  const bellRef = useRef(new Audio(bellSound));
  const employeeId = employee.employee_id;
  const isAdmin = employee.role === "admin";

  // ===========================
  // INITIAL DATA LOADING
  // ===========================
  const loadChatData = async () => {
    try {
      // 1. Fetch Rooms/Channels
      const roomsRes = await api.get("/rooms");
      setChannels(roomsRes.data);

      // 2. Fetch Coworkers Directory
      const coworkersRes = await api.get("/auth/members");
      setCoworkers(coworkersRes.data);
    } catch (err) {
      console.error("Error loading workspace data:", err);
    }
  };

  const loadAdminData = async () => {
    if (!isAdmin) return;
    try {
      // 1. Fetch Stats
      const statsRes = await api.get("/admin/stats");
      setAdminStats(statsRes.data);

      // 2. Fetch Employees
      const employeesRes = await api.get("/admin/employees");
      setAllEmployees(employeesRes.data);
    } catch (err) {
      console.error("Error loading admin data:", err);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchChatData = async () => {
      try {
        const roomsRes = await api.get("/rooms");
        if (active) setChannels(roomsRes.data);
        const coworkersRes = await api.get("/auth/members");
        if (active) setCoworkers(coworkersRes.data);
      } catch (err) {
        console.error("Error loading workspace data:", err);
      }
    };
    const fetchAdminData = async () => {
      try {
        const statsRes = await api.get("/admin/stats");
        if (active) setAdminStats(statsRes.data);
        const employeesRes = await api.get("/admin/employees");
        if (active) setAllEmployees(employeesRes.data);
      } catch (err) {
        console.error("Error loading admin data:", err);
      }
    };

    fetchChatData();
    if (isAdmin) {
      fetchAdminData();
    }

    return () => {
      active = false;
    };
  }, [employee, isAdmin]);

  // ===========================
  // BROWSER CLOSING PRESENCE RESET
  // ===========================
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket) {
        socket.emit("toggle_status", { status: "offline" });
        socket.disconnect();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [socket]);

  // ===========================
  // SOCKET PRESENCE LISTENERS
  // ===========================
  useEffect(() => {
    socket.on("online_users", (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socket.off("online_users");
    };
  }, [socket]);

  // ===========================
  // BELL RINGING
  // ===========================
  useEffect(() => {
    socket.on("bell_ring", (data) => {
      setCaller(data.fromName || data.from);
      setShowNotification(true);

      notify({ type: "bell", sender: data.fromName || data.from });

      bellRef.current.currentTime = 0;
      bellRef.current.play();
    });

    return () => {
      socket.off("bell_ring");
    };
  }, [socket]);

  // ===========================
  // RECEIVE CHAT MESSAGE
  // ===========================
  useEffect(() => {
    socket.on("receive_message", (data) => {
      console.log("MESSAGE RECEIVED", data);

      // Add to messages list
      setMessages((prev) => [...prev, data]);

      socket.emit("message_delivered", { id: data.id });

      // Determine sender identity and fire notifications
      if (data.from.toUpperCase() !== employeeId.toUpperCase()) {
        const isSelected = selectedChat && (
          (selectedChat.type === "room" && String(selectedChat.id) === String(data.room_id)) ||
          (selectedChat.type === "private" && selectedChat.id.toUpperCase() === data.from.toUpperCase())
        );

        if (!isSelected) {
          notify({ type: "message", sender: data.from, body: data.message });
        }
      }
    });

    return () => {
      socket.off("receive_message");
    };
  }, [socket, employeeId, selectedChat]);

  // ===========================
  // TYPING NOTIFICATIONS
  // ===========================
  useEffect(() => {
    socket.on("user_typing", (data) => {
      setTypingUser(data); // { from, name, room_id }
    });

    socket.on("user_stop_typing", (data) => {
      setTypingUser((prev) => (prev && prev.from === data?.from ? null : prev));
    });

    return () => {
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };
  }, [socket]);

  // ===========================
  // DELIVERED / SEEN TICK UPDATES
  // ===========================
  useEffect(() => {
    socket.on("message_delivered_update", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id ? { ...msg, delivered: true } : msg
        )
      );
    });

    socket.on("message_seen_update", (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.id ? { ...msg, seen: true } : msg
        )
      );
    });

    socket.on("chat_seen_update", ({ unseenIds }) => {
      const idSet = new Set(unseenIds);
      setMessages((prev) =>
        prev.map((msg) =>
          idSet.has(msg.id) ? { ...msg, seen: true } : msg
        )
      );
    });

    return () => {
      socket.off("message_delivered_update");
      socket.off("message_seen_update");
      socket.off("chat_seen_update");
    };
  }, [socket]);

  // ===========================
  // NOTIFICATION ACTIONS
  // ===========================
  useEffect(() => {
    const handler = (event) => {
      const targetEmpId = event.detail;
      const targetUser = coworkers.find(c => c.employee_id.toUpperCase() === targetEmpId.toUpperCase());
      if (targetUser) {
        setSelectedChat({
          type: "private",
          id: targetUser.employee_id,
          name: targetUser.name
        });
        clearNotificationCount(targetEmpId);
      }
    };

    window.addEventListener("open-chat", handler);
    return () => {
      window.removeEventListener("open-chat", handler);
    };
  }, [coworkers]);

  useEffect(() => {
    if (!showNotification) return;
    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [showNotification]);

  // ===========================
  // CHAT INTERACTION
  // ===========================
  const openPrivateChat = (userEmpId, name) => {
    setSelectedChat({
      type: "private",
      id: userEmpId,
      name: name
    });
    clearNotificationCount(userEmpId);
  };

  const openRoomChat = (roomId, roomName) => {
    setSelectedChat({
      type: "room",
      id: roomId,
      name: roomName
    });
  };

  const closeChat = () => {
    setSelectedChat(null);
  };

  // ===========================
  // ADMIN PANEL ACTIONS
  // ===========================
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");

    if (!newRoomName.trim()) return;

    try {
      const res = await api.post("/rooms", { room_name: newRoomName.trim() });
      if (res.data) {
        setAdminSuccess(`Channel #${res.data.room_name} created successfully!`);
        setNewRoomName("");
        
        // Notify socket server to join this new room
        socket.emit("join_room", { room_id: res.data.id });
        
        // Reload data
        loadChatData();
        loadAdminData();
      }
    } catch (err) {
      setAdminError(err.response?.data?.error || "Error creating room.");
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminSuccess("");

    if (!newEmpId.trim() || !newEmpName.trim() || !newEmpPassword) {
      setAdminError("Please fill in all employee fields.");
      return;
    }

    try {
      const res = await api.post("/admin/employees", {
        employee_id: newEmpId.trim(),
        name: newEmpName.trim(),
        department: newEmpDept,
        password: newEmpPassword,
      });

      if (res.data.success) {
        setAdminSuccess(`Employee account for ${res.data.employee.name} (ID: ${res.data.employee.employee_id}) created successfully!`);
        setNewEmpId("");
        setNewEmpName("");
        setNewEmpDept("General");
        setNewEmpPassword("");

        // Reload data
        loadAdminData();
        loadChatData();
      }
    } catch (err) {
      setAdminError(err.response?.data?.error || "Error adding employee.");
    }
  };

  const handleUpdateStatus = async (empId, currentStatus) => {
    setAdminError("");
    setAdminSuccess("");
    const newStatus = currentStatus === "active" ? "suspended" : "active";

    try {
      await api.put(`/admin/employees/${empId}/status`, { status: newStatus });
      setAdminSuccess(`Employee status updated to ${newStatus}.`);
      loadAdminData();
    } catch (err) {
      setAdminError(err.response?.data?.error || "Error updating status.");
    }
  };

  const handleRemoveEmployee = async (empId) => {
    if (!window.confirm("Are you sure you want to permanently remove this employee from your workspace?")) {
      return;
    }
    setAdminError("");
    setAdminSuccess("");

    try {
      await api.delete(`/admin/employees/${empId}`);
      setAdminSuccess("Employee successfully removed.");
      loadAdminData();
      loadChatData();
    } catch (err) {
      setAdminError(err.response?.data?.error || "Error removing employee.");
    }
  };

  // Check online presence
  const isOnline = (empId) => {
    return onlineUsers.some(u => u.employee_id.toUpperCase() === empId.toUpperCase());
  };

  return (
    <div className="home-container">
      {/* Top Banner Navigation */}
      <div className="top-bar">
        <div className="company-logo-section">
          <img src={logo} alt="Logo" className="home-logo-img" />
          <h2>Office Alert</h2>
          <span className="company-name-badge">{employee.company_name}</span>
        </div>

        <div className="user-profile-center">
          <span className="profile-name">{employee.name}</span>
          <div className="profile-id-row">
            <span className="badge-id">{employeeId}</span>
            <button 
              type="button"
              className={`status-toggle-btn ${statusOnline ? "online" : "offline"}`}
              onClick={toggleOnlineStatus}
            >
              {statusOnline ? "Online" : "Offline"}
            </button>
          </div>
        </div>

        <div className="navigation-tabs">
          {isAdmin && (
            <div className="tab-pill-box">
              <button 
                className={activeTab === "chat" ? "tab-pill active" : "tab-pill"} 
                onClick={() => setActiveTab("chat")}
              >
                Chat Rooms
              </button>
              <button 
                className={activeTab === "admin" ? "tab-pill active" : "tab-pill"} 
                onClick={() => setActiveTab("admin")}
              >
                Admin Console
              </button>
            </div>
          )}

          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>

      {/* =========================================
          VIEW 1: CHAT CHANNELS & DIRECT MESSAGES
          ========================================= */}
      {activeTab === "chat" && (
        <div className="chat-layout">
          <div className="sidebar-chat-panel">
            {/* Workspace Navigation Sidebar */}
            <div className="sidebar-section">
              <Sidebar />
            </div>

            {/* Channels/Rooms Section */}
            <div className="sidebar-section">
              <h3 className="section-title"># CHANNELS ({channels.length})</h3>
              <div className="channels-list">
                {channels.map((channel) => {
                  const isSelected = selectedChat?.type === "room" && selectedChat.id === channel.id;
                  return (
                    <button
                      key={channel.id}
                      className={isSelected ? "channel-row active" : "channel-row"}
                      onClick={() => openRoomChat(channel.id, channel.room_name)}
                    >
                      <span className="hash-symbol">#</span> {channel.room_name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Private Messages/Coworkers Section */}
            <div className="sidebar-section">
              <h3 className="section-title">COWORKERS</h3>
              <div className="users-list">
                {coworkers.map((user) => {
                  const userOnline = isOnline(user.employee_id);
                  const enrichedUser = { ...user, isOnline: userOnline };
                  return (
                    <UserCard
                      key={user.employee_id}
                      user={enrichedUser}
                      currentEmployeeId={employeeId}
                      openChat={() => openPrivateChat(user.employee_id, user.name)}
                      socket={socket}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Main welcome content area when no chat is active */}
          <div className="chat-main-landing">
            <h1 className="landing-welcome-title">Welcome to {employee.company_name}</h1>
            
            <div className="landing-coworkers-section">
              <h3 className="section-subtitle">Coworkers Directory</h3>
              <div className="landing-coworkers-grid">
                {coworkers.filter((user) => user.employee_id.toUpperCase() !== employeeId.toUpperCase()).length > 0 ? (
                  coworkers
                    .filter((user) => user.employee_id.toUpperCase() !== employeeId.toUpperCase())
                    .map((user) => {
                      const userOnline = isOnline(user.employee_id);
                      const enrichedUser = { ...user, isOnline: userOnline };
                      return (
                        <UserCard
                          key={user.employee_id}
                          user={enrichedUser}
                          currentEmployeeId={employeeId}
                          openChat={() => openPrivateChat(user.employee_id, user.name)}
                          socket={socket}
                        />
                      );
                    })
                ) : (
                  <p className="no-coworkers-msg">No other coworkers have joined this workspace yet.</p>
                )}
              </div>
            </div>

            <div className="workspace-code-corner">
              Workspace Code: <code>{employee.workspace_code}</code>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          VIEW 2: ADMIN MANAGEMENT DASHBOARD
          ========================================= */}
      {activeTab === "admin" && isAdmin && (
        <div className="admin-console-layout">
          <h1 className="admin-header-title">Workspace Admin Control</h1>
          
          {adminError && <div className="admin-toast error">{adminError}</div>}
          {adminSuccess && <div className="admin-toast success">{adminSuccess}</div>}

          {/* Stat Cards row */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-data">
                <h4>Total Employees</h4>
                <h3>{adminStats?.stats?.totalEmployees || 0}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-data">
                <h4>Communication Rooms</h4>
                <h3>{adminStats?.stats?.totalRooms || 0}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon"></div>
              <div className="stat-data">
                <h4>Messages Logged</h4>
                <h3>{adminStats?.stats?.totalMessages || 0}</h3>
              </div>
            </div>
          </div>

          {/* Admin forms and table */}
          <div className="admin-split-view">
            <div className="admin-left-col">
              {/* Create Room Box */}
              <div className="admin-card room-manager-box">
                <h3>Create Communication Room</h3>
                <p className="card-desc-subtitle">Create organization-wide channels for group chats.</p>
                <form onSubmit={handleCreateRoom} className="admin-form">
                  <input
                    type="text"
                    placeholder="e.g. Sales, Marketing, IT Team"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="admin-input"
                    required
                  />
                  <button type="submit" className="admin-btn">Create Channel</button>
                </form>

                <div className="workspace-details-card">
                  <h4>Workspace Details</h4>
                  <div className="details-list">
                    <div><span>Company:</span> <strong>{adminStats?.organization?.company_name}</strong></div>
                    <div><span>Admin Email:</span> <strong>{adminStats?.organization?.company_email}</strong></div>
                    <div><span>Workspace Code:</span> <strong className="ws-code-tag">{adminStats?.organization?.workspace_code}</strong></div>
                  </div>
                </div>
              </div>

              {/* Add Employee Box */}
              <div className="admin-card room-manager-box">
                <h3>Add Employee Account</h3>
                <p className="card-desc-subtitle">Directly register a new employee in this workspace.</p>
                <form onSubmit={handleCreateEmployee} className="admin-form">
                  <input
                    type="text"
                    placeholder="Employee ID (e.g. EMP101)"
                    value={newEmpId}
                    onChange={(e) => setNewEmpId(e.target.value)}
                    className="admin-input"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newEmpName}
                    onChange={(e) => setNewEmpName(e.target.value)}
                    className="admin-input"
                    required
                  />
                  <select
                    value={newEmpDept}
                    onChange={(e) => setNewEmpDept(e.target.value)}
                    className="form-select admin-input"
                    style={{ appearance: 'none', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', height: '45px', paddingLeft: '16px', color: '#fff' }}
                  >
                    <option value="General" style={{background: '#1c1936'}}>General</option>
                    <option value="Engineering" style={{background: '#1c1936'}}>Engineering</option>
                    <option value="Design" style={{background: '#1c1936'}}>Design</option>
                    <option value="Marketing" style={{background: '#1c1936'}}>Marketing</option>
                    <option value="Sales" style={{background: '#1c1936'}}>Sales</option>
                    <option value="HR" style={{background: '#1c1936'}}>HR</option>
                    <option value="Accounts" style={{background: '#1c1936'}}>Accounts</option>
                    <option value="Management" style={{background: '#1c1936'}}>Management</option>
                  </select>
                  <input
                    type="password"
                    placeholder="Login Password"
                    value={newEmpPassword}
                    onChange={(e) => setNewEmpPassword(e.target.value)}
                    className="admin-input"
                    required
                  />
                  <button type="submit" className="admin-btn">Add Employee</button>
                </form>
              </div>
            </div>

            {/* Employee Management Table */}
            <div className="admin-card employee-table-box">
              <h3>Employee Directory</h3>
              <p className="card-desc-subtitle">Manage memberships, suspend or remove employee accounts.</p>

              <div className="table-responsive">
                <table className="employee-admin-table">
                  <thead>
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allEmployees.map((emp) => (
                      <tr key={emp.id} className={emp.status === "suspended" ? "row-suspended" : ""}>
                        <td><code>{emp.employee_id}</code></td>
                        <td><strong>{emp.name}</strong></td>
                        <td>{emp.department}</td>
                        <td><span className={`role-pill ${emp.role}`}>{emp.role}</span></td>
                        <td>
                          <span className={`status-pill ${emp.status}`}>
                            {emp.status}
                          </span>
                        </td>
                        <td>
                          {emp.role !== "admin" ? (
                            <div className="action-btns-group">
                              <button
                                className={emp.status === "active" ? "btn-action suspend" : "btn-action activate"}
                                onClick={() => handleUpdateStatus(emp.id, emp.status)}
                              >
                                {emp.status === "active" ? "Suspend" : "Activate"}
                              </button>
                              <button
                                className="btn-action delete"
                                onClick={() => handleRemoveEmployee(emp.id)}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <span className="owner-label">Owner</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      <Notification caller={caller} visible={showNotification} />

      {/* Selected Chat Box Drawer */}
      {selectedChat && (
        <ChatWindow
          currentEmployeeId={employeeId}
          selectedChat={selectedChat}
          messages={messages}
          setMessages={setMessages}
          typingUser={typingUser}
          onClose={closeChat}
          socket={socket}
        />
      )}
    </div>
  );
}

export default Home;
