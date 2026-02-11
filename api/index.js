import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// --- Local Data Files (Fallback) ---
const SPONSORS_FILE = path.join(__dirname, '../server/sponsors.json');
const TEAMS_FILE = path.join(__dirname, '../server/teams.json');

const ensureFilesExist = () => {
    if (!fs.existsSync(SPONSORS_FILE)) {
        try { fs.mkdirSync(path.dirname(SPONSORS_FILE), { recursive: true }); fs.writeFileSync(SPONSORS_FILE, '[]'); } catch (e) { console.error('Error creating sponsors file:', e); }
    }
    if (!fs.existsSync(TEAMS_FILE)) {
        try { fs.mkdirSync(path.dirname(TEAMS_FILE), { recursive: true }); fs.writeFileSync(TEAMS_FILE, '[]'); } catch (e) { console.error('Error creating teams file:', e); }
    }
};
ensureFilesExist();

const readData = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) return [];
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (err) { return []; }
};
const writeData = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

// --- MongoDB Schemas ---
const teamSchema = new mongoose.Schema({
    name: String,
    members: [String],
});
teamSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });
const Team = mongoose.model('Team', teamSchema);

const sponsorSchema = new mongoose.Schema({
    companyName: String,
    sector: String,
    companyEmail: String,
    contactPerson: String,
    poc: String,
    phoneNumber: String,
    location: String,
    notes: String,
    status: { type: String, enum: ['In Progress', 'Contacted', 'Completed', 'Follow-up Required', 'Not Interested', 'Cold Mail', 'Cold Call'], default: 'In Progress' },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }
});
sponsorSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });
const Sponsor = mongoose.model('Sponsor', sponsorSchema);

// --- Database Connection State ---
let isMongoConnected = false;

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.log('[DB] No MONGODB_URI found. Using local files.');
        return;
    }
    if (mongoose.connection.readyState === 1) {
        isMongoConnected = true;
        return;
    }
    if (mongoose.connection.readyState === 2) {
        console.log('[DB] Connection already in progress...');
        return;
    }

    console.log('[DB] Attempting to connect to MongoDB...');
    const startTime = Date.now();

    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Fail fast if no connection after 5s
        });
        console.log(`[DB] Connected to MongoDB in ${Date.now() - startTime}ms`);
        isMongoConnected = true;
    } catch (err) {
        console.error(`[DB] MongoDB connection error after ${Date.now() - startTime}ms:`, err.message);
        console.log('[DB] Falling back to local files');
        isMongoConnected = false;
    }
};

// Initial connection
connectDB();

app.use(cors());
app.use(express.json());

// Middleware to retry connection if needed
app.use(async (req, res, next) => {
    if (!isMongoConnected && process.env.MONGODB_URI) {
        // Try one more time if disconnected, but don't block too long
        // Or just let the background retry handle it?
        // Let's trigger a check without awaiting effectively if we want background
        // But user says "reload to connect", so maybe await it briefly?
        // Better: trigger it and let next request pick it up OR await it proper.
        // Let's await it to fix the "reload multiple times" issue.
        await connectDB();
    }
    next();
});

// --- Routes (Hybrid) ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mongoConnected: isMongoConnected,
        readyState: mongoose.connection.readyState,
        source: isMongoConnected ? 'mongodb' : 'local-files'
    });
});

// GET /api/sponsors
app.get('/api/sponsors', async (req, res) => {
    const start = Date.now();
    console.log(`[GET /api/sponsors] Request received`);

    // Set custom header to inform client about data source
    res.set('X-Database-Connected', isMongoConnected ? 'true' : 'false');

    try {
        if (isMongoConnected) {
            const sponsors = await Sponsor.find().populate('assignedTeam');
            console.log(`[GET /api/sponsors] Served ${sponsors.length} sponsors from MongoDB in ${Date.now() - start}ms`);
            res.json(sponsors);
        } else {
            console.log(`[GET /api/sponsors] Serving from local files (DB disconnected)`);
            const sponsors = readData(SPONSORS_FILE);
            const teams = readData(TEAMS_FILE);
            const populated = sponsors.map(s => {
                if (s.assignedTeam) {
                    const team = teams.find(t => t.id === s.assignedTeam);
                    return { ...s, assignedTeam: team || s.assignedTeam };
                }
                return s;
            });
            console.log(`[GET /api/sponsors] Served ${populated.length} sponsors from local files in ${Date.now() - start}ms`);
            res.json(populated);
        }
    } catch (error) {
        console.error(`[GET /api/sponsors] Error:`, error);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/sponsors
app.post('/api/sponsors', async (req, res) => {
    try {
        if (isMongoConnected) {
            const newSponsor = new Sponsor(req.body);
            const savedSponsor = await newSponsor.save();
            res.status(201).json(savedSponsor);
        } else {
            const sponsors = readData(SPONSORS_FILE);
            const newSponsor = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), ...req.body };
            sponsors.push(newSponsor);
            writeData(SPONSORS_FILE, sponsors);
            res.status(201).json(newSponsor);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// POST /api/sponsors/bulk
app.post('/api/sponsors/bulk', async (req, res) => {
    try {
        if (!Array.isArray(req.body)) return res.status(400).json({ message: "Input must be an array" });

        if (isMongoConnected) {
            // MongoDB Bulk Insert
            const savedSponsors = await Sponsor.insertMany(req.body);
            res.status(200).json({
                added: savedSponsors.length,
                skipped: 0,
                total: req.body.length,
                newSponsors: savedSponsors
            });
        } else {
            // Local JSON Bulk Insert
            const sponsors = readData(SPONSORS_FILE);
            let addedCount = 0;
            const addedSponsors = [];
            req.body.forEach(sponsorData => {
                if (!sponsorData.companyName) return;
                const newSponsor = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), ...sponsorData };
                sponsors.push(newSponsor);
                addedSponsors.push(newSponsor);
                addedCount++;
            });
            if (addedCount > 0) writeData(SPONSORS_FILE, sponsors);
            res.status(200).json({ added: addedCount, skipped: 0, total: req.body.length, newSponsors: addedSponsors });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// PUT /api/sponsors/:id
app.put('/api/sponsors/:id', async (req, res) => {
    try {
        if (isMongoConnected) {
            const updatedSponsor = await Sponsor.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('assignedTeam');
            if (!updatedSponsor) return res.status(404).json({ message: "Sponsor not found" });
            res.json(updatedSponsor);
        } else {
            const sponsors = readData(SPONSORS_FILE);
            const index = sponsors.findIndex(s => s.id === req.params.id);
            if (index === -1) return res.status(404).json({ message: "Sponsor not found" });
            sponsors[index] = { ...sponsors[index], ...req.body };
            writeData(SPONSORS_FILE, sponsors);

            const teams = readData(TEAMS_FILE);
            const updated = sponsors[index];
            if (updated.assignedTeam && typeof updated.assignedTeam === 'string') {
                const team = teams.find(t => t.id === updated.assignedTeam);
                updated.assignedTeam = team || updated.assignedTeam;
            }
            res.json(updated);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE /api/sponsors/:id
app.delete('/api/sponsors/:id', async (req, res) => {
    try {
        if (isMongoConnected) {
            await Sponsor.findByIdAndDelete(req.params.id);
            res.json({ message: "Sponsor deleted" });
        } else {
            let sponsors = readData(SPONSORS_FILE);
            const initialLength = sponsors.length;
            sponsors = sponsors.filter(s => s.id !== req.params.id);
            if (sponsors.length === initialLength) return res.status(404).json({ message: "Sponsor not found" });
            writeData(SPONSORS_FILE, sponsors);
            res.json({ message: "Sponsor deleted" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// GET /api/teams
app.get('/api/teams', async (req, res) => {
    try {
        if (isMongoConnected) {
            const teams = await Team.find();
            res.json(teams);
        } else {
            res.json(readData(TEAMS_FILE));
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// POST /api/teams
app.post('/api/teams', async (req, res) => {
    try {
        if (isMongoConnected) {
            const newTeam = new Team(req.body);
            const savedTeam = await newTeam.save();
            res.status(201).json(savedTeam);
        } else {
            const teams = readData(TEAMS_FILE);
            const newTeam = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), ...req.body };
            teams.push(newTeam);
            writeData(TEAMS_FILE, teams);
            res.status(201).json(newTeam);
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

export default app;

if (process.env.NODE_ENV !== 'production' || process.argv[1] === __filename) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}