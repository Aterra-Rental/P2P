import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from "recharts";

import { getSignupsByMonth } from "../../../../lib/dashboard";

const SignupsChart = () => {
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        getSignupsByMonth()
            .then(setData)
            .catch((err) => setError(err.message));
    }, []);

    if (error) {
        return <p style={{ color: "#F87171" }}>{error}</p>;
    }

    return (
        <div style={{ width: "100%", height: 320 }}>
            <h3 style={{
                marginBottom: "1.5rem",
                color: "#F8FAFC",
                fontSize: "1.1rem",
                fontWeight: 600
            }}>
                New Users per Month — {currentYear}
            </h3>
            <ResponsiveContainer width="100%" height="85%">
                <BarChart data={data} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                        dataKey="month"
                        stroke="#94A3B8"
                        tick={{ fill: "#94A3B8" }}
                    />
                    <YAxis
                        allowDecimals={false}
                        stroke="#94A3B8"
                        tick={{ fill: "#94A3B8" }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "#1E1B2E",
                            border: "1px solid #7C3AED",
                            borderRadius: "8px",
                            color: "#F8FAFC"
                        }}
                        labelStyle={{ color: "#A855F7" }}
                    />
                    <Bar
                        dataKey="count"
                        fill="#7C3AED"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={50}
                    />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SignupsChart;