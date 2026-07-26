import React from 'react'
import Statistics from './components/Statistics'
import "./TransactionHistory.css";
import SearchBar from './components/SearchBar'
import FilterBar from './components/FilterBar'
import TransactionCard from "./components/TransactionCard";
import { useState, useEffect } from "react";






export default function TransactionHistory() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [transactions, setTransactions] = useState([]);
  const statistics = [
  {
    title: "Completed",
    value: transactions.filter(t => t.status === "Completed").length,
  },
  {
    title: "Cancelled",
    value: transactions.filter(t => t.status === "Cancelled").length,
  },
  {
    title: "Refunded",
    value: transactions.filter(t => t.status === "Refunded").length,
  },
  {
    title: "Disputed",
    value: transactions.filter(t => t.status === "Disputed").length,
  },
];

  useEffect(() => {
    fetch("/api/transactions")
        .then((res) => res.json())
        .then((data) => setTransactions(data))
        .catch((err) => console.error(err));
}, []);





const filteredTransactions = transactions.filter((transaction) => {
  const matchesSearch =
    transaction.item.toLowerCase().includes(search.toLowerCase()) ||
    transaction.transactionId.toString().includes(search) ||
    transaction.partner.toLowerCase().includes(search.toLowerCase()) ||
    transaction.roomId.toString().includes(search);

  const matchesFilter =
    selectedFilter === "All" ||
    transaction.status === selectedFilter;

  return matchesSearch && matchesFilter;
});
  return (
    <div className="transaction-page">
      
      <div className="transaction-header">
        <h1>Transaction History</h1>
        
        <p>View all of your completed and previous escrow transactions.</p>
      </div>
        <Statistics stats={statistics} />
        <SearchBar search={search} setSearch={setSearch} />
        <FilterBar selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} /> 
        {filteredTransactions.length > 0 ? (
      filteredTransactions.map((transaction) => (
    <TransactionCard key={transaction.transactionId} transaction={transaction}/>))):( <div className="empty-state">
    <h3>No transactions found</h3>
    <p>Try changing your search or filter.</p></div>)}
      

    </div>
  );
}