import "./UserCard.css";
import { Bell, MessageSquare } from "lucide-react";

function UserCard({ user, currentEmployeeId, openChat, socket }) {

  const handleBell = () => {
    socket.emit("ring_user", user.employee_id);
  };

  return (
    <div className="user-card">

      <div className="user-info">

        <span className={`status-dot ${user.isOnline ? 'online' : 'offline'}`}></span>

        <div>

          <h3>{user.name}</h3>

          <p>{user.employee_id}</p>

        </div>

      </div>

      {user.employee_id !== currentEmployeeId ? (

        <div className="actions">

          <button
            className="bell-btn"
            onClick={handleBell}
            disabled={!user.isOnline}
            title={user.isOnline ? "Call" : "User is offline"}
            style={{ 
              opacity: user.isOnline ? 1 : 0.4, 
              cursor: user.isOnline ? "pointer" : "not-allowed" 
            }}
          >
            <Bell size={16} />
          </button>

          <button
            className="message-btn"
            onClick={() => openChat(user.employee_id)}
            title="Message"
          >
            <MessageSquare size={16} />
          </button>

        </div>

      ) : (

        <span className="you-label">

          You

        </span>

      )}

    </div>
  );
}

export default UserCard;