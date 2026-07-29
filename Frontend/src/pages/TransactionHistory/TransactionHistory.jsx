import React from 'react'
import Statistics from './components/Statistics'
import "./TransactionHistory.css";
import { useState } from "react";
import SearchBar from './components/SearchBar'
import FilterBar from './components/FilterBar'
import TransactionCard from "./components/TransactionCard";


const transactions = [
  {
    id: "TX000001",
    roomId: "RM000001",
    item: "Gaming Mouse",
    partner: "John Smith",
    partnerId: "U000123",
    role: "Buyer",
    amount: "120.00",
    status: "Completed",
    completedAt: "26 Jul 2026",
  },
];
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



export default function TransactionHistory() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");






const filteredTransactions = transactions.filter((transaction) => {
  const matchesSearch =
    transaction.item.toLowerCase().includes(search.toLowerCase()) ||
    transaction.id.toLowerCase().includes(search.toLowerCase()) ||
    transaction.partner.toLowerCase().includes(search.toLowerCase()) ||
    transaction.roomId.toLowerCase().includes(search.toLowerCase());

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
    <TransactionCard key={transaction.id}transaction={transaction}/>))):( <div className="empty-state">
    <h3>No transactions found</h3>
    <p>Try changing your search or filter.</p></div>)}
      

    </div>
  );
}