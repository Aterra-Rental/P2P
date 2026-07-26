import React from 'react'
import Statistics from './components/Statistics'
import "./TransactionHistory.css";
import { useState } from "react";
import SearchBar from './components/SearchBar'
import FilterBar from './components/FilterBar'
import TransactionCard from "./components/TransactionCard";



const statistics = [
    {
        title: "Completed",
        value: 0,
    },
    {
        title: "Cancelled",
        value: 0,
    },
    {
        title: "Refunded",
        value: 0,
    },
    {
        title: "Disputed",
        value: 0,
    },
];

const transactions = [
  {
    id: "TX000001",
    item: "Gaming Mouse",
    role: "Buyer",
    amount: "$120.00",
    status: "Completed",
    date: "26 Jul 2026",
  },
  {
    id: "TX000002",
    item: "iPhone 15",
    role: "Seller",
    amount: "$850.00",
    status: "Cancelled",
    date: "25 Jul 2026",
  },
  {
    id: "TX000003",
    item: "RTX 4060",
    role: "Buyer",
    amount: "$350.00",
    status: "Pending",
    date: "24 Jul 2026",
  },
];

export default function TransactionHistory() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");







  return (
    <div className="transaction-page">
      
      <div className="transaction-header">
        <h1>Transaction History</h1>
        <Statistics stats={statistics} />
        <SearchBar search={search} setSearch={setSearch} />
        <FilterBar selectedFilter={selectedFilter} setSelectedFilter={setSelectedFilter} /> 
        {transactions.map((transaction) => (<TransactionCard key={transaction.id} transaction={transaction}/>))}
        <p>View all of your completed and previous escrow transactions.</p>
      </div>

      {transactions.map((tx) => (
        <div className="transaction-card" key={tx.id}>
          
          <div className="transaction-left">
            <h3>{tx.item}</h3>
            <p>Transaction ID: {tx.id}</p>
            <p>{tx.date}</p>
          </div>

          <div className="transaction-middle">
            <p><strong>Role</strong></p>
            <span>{tx.role}</span>
          </div>

          <div className="transaction-middle">
            <p><strong>Amount</strong></p>
            <span>{tx.amount}</span>
          </div>

          <div className="transaction-right">
            <span className={`status ${tx.status.toLowerCase()}`}>
              {tx.status}
            </span>
          </div>
        
        </div>
      ))}

    </div>
  );
}