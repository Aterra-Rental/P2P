import "./SearchBar.css";

const SearchBar = ({ search, setSearch }) => {
  return (
    <div className="search-container">
      <input
        type="text"
        placeholder="Search by Transaction ID, Room ID, Item, or Partner..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;