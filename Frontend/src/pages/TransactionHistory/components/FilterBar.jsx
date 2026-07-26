import "./FilterBar.css";

const filters = [
  "All",
  "Completed",
  "Cancelled",
  "Refunded",
  "Disputed",
];

const FilterBar = ({ selectedFilter, setSelectedFilter }) => {
  return (
    <div className="filter-bar">
      {filters.map((filter) => (
        <button
          key={filter}
          className={
            selectedFilter === filter
              ? "filter-btn active"
              : "filter-btn"
          }
          onClick={() => setSelectedFilter(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
};

export default FilterBar;