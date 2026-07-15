import "./UserCard.css";
import socket from "../services/socket";

function UserCard({ user, currentUser, openChat }) {

  const handleBell = () => {
    socket.emit("ring_user", user);
  };

  return (
    <div className="user-card">

      <div className="user-info">

        <span className="status-dot"></span>

        <div>

          <h3>{user}</h3>

          <p>Online</p>

        </div>

      </div>

      {user !== currentUser ? (

        <div className="actions">

          <button
            className="bell-btn"
            onClick={handleBell}
            title="Call"
          >
            🔔
          </button>

          <button
            className="message-btn"
            onClick={() => openChat(user)}
            title="Message"
          >
            💬
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