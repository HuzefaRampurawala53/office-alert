import "./UserCard.css";

function UserCard({ user, currentEmployeeId, openChat, socket }) {

  const handleBell = () => {
    socket.emit("ring_user", user.employee_id);
  };

  return (
    <div className="user-card">

      <div className="user-info">

        <span className="status-dot"></span>

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
            title="Call"
          >
            🔔
          </button>

          <button
            className="message-btn"
            onClick={() => openChat(user.employee_id)}
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