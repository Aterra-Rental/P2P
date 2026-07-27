require("dotenv").config();


const express = require("express");
const cors = require("cors");

const bakongRoutes = require("./routes/bakong");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/bakong", bakongRoutes);

app.listen(3001, () => {
    console.log("Bakong Service running on port 3001");
});