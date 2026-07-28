import "./ParticipantsPanel.css";

const ParticipantsPanel = () => {
    return (
        <div className="participants-panel">

            <h2>Participants</h2>

            <div className="participant-card">
                👤 You
            </div>

            <div className="participant-card">
                👤 Other User
            </div>

        </div>
    );
};

export default ParticipantsPanel;