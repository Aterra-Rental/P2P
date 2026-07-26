
import "./Statistics.css";

const Statistics = ({ stats }) => {
  return (
    <div className="statistics-container">
      {stats.map((stat) => (
        <div className="stat-card" key={stat.title}>
          <h3>{stat.value}</h3>
          <p>{stat.title}</p>
        </div>
      ))}
    </div>
  );
};

export default Statistics;