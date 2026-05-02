const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

/* =========================
   LOG DIRECTORY SETUP
========================= */

const logDir = path.join(__dirname, "logs");
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const appLogPath = path.join(logDir, "app.log");
const osLogPath = path.join(logDir, "os.log");
const centralLogPath = path.join(logDir, "central.log");

/* =========================
   LOGGING FUNCTIONS
========================= */

function writeAppLog(message) {
    const log = `[${new Date().toISOString()}] ${message}\n`;
    console.log(log.trim());
    fs.appendFileSync(appLogPath, log);
    fs.appendFileSync(centralLogPath, log);
}

function writeOSLog(message) {
    const log = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(osLogPath, log);
    fs.appendFileSync(centralLogPath, log);
}

/* Log Every HTTP Request */
app.use((req, res, next) => {
    writeAppLog(`${req.method} ${req.url}`);
    next();
});

/* =========================
   DATABASE
========================= */

const db = new sqlite3.Database("database.db");

db.serialize(() => {

    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        password TEXT,
        role TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        type TEXT,
        criticality TEXT,
        risk TEXT,
        owner TEXT,
        environment TEXT,
        lastUpdated TEXT
    )`);

    db.run(`INSERT OR IGNORE INTO users VALUES (1,'admin','admin123','admin')`);
});

/* =========================
   LOGIN + MONITORING
========================= */

let failedAttempts = 0;

app.post("/login", (req, res) => {

    const start = Date.now();
    const { username, password } = req.body;

    const query =
        `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;

    db.get(query, [], (err, row) => {

        const responseTime = Date.now() - start;

        writeAppLog(`Login Attempt Bundle:
Username: ${username}
Password: ${password}
Query Used: ${query}
Response Time: ${responseTime}ms`);

        /* Rule 1: Slow Response */
        if (responseTime > 500) {
            writeAppLog("[ALERT] Slow Response Detected");
        }

        if (row) {
            failedAttempts = 0;
            writeAppLog("Login Success");
            res.json({ success: true });
        } else {
            failedAttempts++;
            writeAppLog("Login Failed");

            /* Rule 2: Abnormal Login Attempts */
            if (failedAttempts >= 3) {
                writeAppLog("[ALERT] Abnormal Login Attempts Detected");
            }

            res.json({ success: false });
        }
    });
});

/* =========================
   ATTACK SIMULATIONS
========================= */

app.get("/simulate/sql", (req, res) => {

    const payload = "' OR 1=1--";

    writeAppLog(`SQL Injection Simulation Bundle:
Payload Used: ${payload}
Injected Query: SELECT * FROM users WHERE username='${payload}'
Impact: Authentication Bypass Attempt`);

    res.json({ success: true });
});

app.get("/simulate/bruteforce", (req, res) => {

    const attempts = [
        "admin/1234",
        "admin/password",
        "admin/admin123"
    ];

    attempts.forEach(cred => {
        writeAppLog(`Brute Force Attempt:
Credential Used: ${cred}`);
    });

    writeAppLog("[ALERT] Brute Force Pattern Detected");

    res.json({ success: true });
});

app.get("/simulate/xss", (req, res) => {

    const payload = "<script>alert('XSS')</script>";

    writeAppLog(`XSS Simulation Bundle:
Payload Used: ${payload}
Target: Asset Name Field
Impact: Stored XSS Attempt`);

    res.json({ success: true });
});

/* =========================
   LAB 2 – ASSET MANAGEMENT
========================= */

app.post("/addAsset", (req, res) => {

    const { name, type, criticality, risk, owner, environment } = req.body;

    db.run(
        `INSERT INTO assets VALUES (NULL,?,?,?,?,?,?,?)`,
        [name, type, criticality, risk, owner, environment, new Date().toISOString()]
    );

    writeAppLog(`Asset Created:
Name: ${name}
Owner: ${owner}
Criticality: ${criticality}`);

    res.json({ success: true });
});

app.get("/generateAssets", (req, res) => {

    for (let i = 0; i < 5; i++) {
        const name = "Server-" + Math.floor(Math.random()*1000);

        db.run(
            `INSERT INTO assets VALUES (NULL,?,?,?,?,?,?,?)`,
            [name,"Server","Medium","Medium","AutoSystem","Production",new Date().toISOString()]
        );
    }

    writeAppLog("Bulk Asset Generation Executed");
    res.json({ success: true });
});

app.get("/assets", (req, res) => {
    db.all("SELECT * FROM assets", [], (err, rows) => {
        res.json(rows);
    });
});

app.get("/asset/:id", (req, res) => {
    db.get("SELECT * FROM assets WHERE id=?", [req.params.id], (err, row) => {
        res.json(row);
    });
});

/* =========================
   LAB 3 – MULTI SOURCE LOG COLLECTION
========================= */

app.get("/collectLogs", (req, res) => {

    writeOSLog("OS Log Collected: CPU Usage Normal");
    writeOSLog("OS Log Collected: Memory Usage Checked");
    writeAppLog("Application Logs Collected");

    res.json({ success: true });
});

/* =========================
   LAB 4 – MONITORING METRICS
========================= */

app.get("/metrics", (req, res) => {

    const logs = fs.readFileSync(appLogPath, "utf8");
    const alertCount = (logs.match(/\[ALERT\]/g) || []).length;

    res.json({ alerts: alertCount });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`LogCraft running at http://localhost:${PORT}`);
});
