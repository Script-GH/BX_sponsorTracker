import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// --- Database Connection State ---
global.isMongoConnected = false;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

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
    companyName: { type: String, required: true, index: true },
    sector: { type: String, index: true },
    companyEmail: { type: String, required: true },
    contactPerson: { type: String, required: true },
    poc: String,
    phoneNumber: { type: String, required: true },
    location: { type: String, required: true },
    notes: String,
    status: {
        type: String,
        enum: ['In Progress', 'Contacted', 'Completed', 'Follow-up Required', 'Not Interested', 'Cold Mail', 'Cold Call'],
        default: 'In Progress',
        index: true
    },
    assignedTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', index: true }
});
sponsorSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });
const Sponsor = mongoose.model('Sponsor', sponsorSchema);

// --- Database Connection State ---
let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const checkEnv = () => {
            if (!process.env.MONGODB_URI) {
                console.error('[DB] No MONGODB_URI found in environment variables.');
                throw new Error('MONGODB_URI is missing');
            }
        }
        checkEnv();

        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
        };

        console.log('[DB] Connecting to MongoDB...');
        cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then((mongoose) => {
            console.log('[DB] New connection established');
            return mongoose;
        });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        console.error('[DB] Connection error:', e);
        throw e;
    }

    return cached.conn;
}

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
    // Skip for health check if we want it to report status without blocking
    if (req.path === '/api/health') return next();

    if (process.env.MONGODB_URI) {
        try {
            await connectDB();
            global.isMongoConnected = true;
        } catch (e) {
            console.error('[DB] Failed to connect in middleware:', e.message);
            global.isMongoConnected = false;
        }
    }
    next();
});

// --- Routes (Hybrid) ---

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        mongoConnected: global.isMongoConnected,
        readyState: mongoose.connection.readyState,
        source: global.isMongoConnected ? 'mongodb' : 'local-files'
    });
});

// GET /api/sponsors
app.get('/api/sponsors', async (req, res) => {
    const start = Date.now();
    console.log(`[GET /api/sponsors] Request received`, req.query);

    // Pagination & Filtering Params
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    const status = req.query.status || 'All';
    const team = req.query.team || 'All';

    // Set custom header to inform client about data source
    res.set('X-Database-Connected', global.isMongoConnected ? 'true' : 'false');

    try {
        if (global.isMongoConnected) {
            // Build Query
            const query = {};
            if (search) {
                query.$or = [
                    { companyName: { $regex: search, $options: 'i' } },
                    { contactPerson: { $regex: search, $options: 'i' } }
                ];
            }
            if (status !== 'All') {
                query.status = status;
            }
            if (team !== 'All') {
                if (team === 'Unassigned') {
                    query.assignedTeam = null;
                } else {
                    query.assignedTeam = team;
                }
            }

            // Excecute Query
            const totalSponsors = await Sponsor.countDocuments(query);
            const totalPages = Math.ceil(totalSponsors / limit);

            const sponsors = await Sponsor.find(query)
                .sort({ _id: -1 }) // Sort by newest first
                .skip(skip)
                .limit(limit)
                .populate('assignedTeam');

            console.log(`[GET /api/sponsors] Served page ${page} (${sponsors.length} items) from MongoDB in ${Date.now() - start}ms`);

            res.json({
                sponsors,
                pagination: {
                    total: totalSponsors,
                    page,
                    pages: totalPages,
                    limit
                }
            });
        } else {
            console.log(`[GET /api/sponsors] Serving from local files (DB disconnected)`);
            let sponsors = readData(SPONSORS_FILE);
            const teams = readData(TEAMS_FILE);

            // Populate Check (for team filter consistency)
            // Ideally we filter first, then paginate, then populate? 
            // Or populate first? Populating first is easier for 'team' object access if needed, 
            // but for 'Unassigned' check we just need the ID.

            // 1. Filter
            let filtered = sponsors.filter(s => {
                // Search
                const matchesSearch = !search ||
                    (s.companyName && s.companyName.toLowerCase().includes(search.toLowerCase())) ||
                    (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase()));

                // Status
                const matchesStatus = status === 'All' || s.status === status;

                // Team
                let matchesTeam = true;
                if (team !== 'All') {
                    if (team === 'Unassigned') {
                        matchesTeam = !s.assignedTeam;
                    } else {
                        // assignedTeam might be an ID string in local file
                        matchesTeam = s.assignedTeam === team;
                    }
                }

                return matchesSearch && matchesStatus && matchesTeam;
            });

            // 2. Sort (Newest first)
            // Local files might strictly be chronological push, so reverse?
            // If they have IDs that are timestamps like we make them:
            // const newSponsor = { id: Date.now()... }
            // We can sort by ID or just reverse.
            filtered.reverse();

            // 3. Paginate
            const totalSponsors = filtered.length;
            const totalPages = Math.ceil(totalSponsors / limit);
            const paginated = filtered.slice(skip, skip + limit);

            // 4. Populate
            const populated = paginated.map(s => {
                if (s.assignedTeam) {
                    const teamObj = teams.find(t => t.id === s.assignedTeam);
                    return { ...s, assignedTeam: teamObj || s.assignedTeam };
                }
                return s;
            });

            console.log(`[GET /api/sponsors] Served page ${page} from local files in ${Date.now() - start}ms`);

            res.json({
                sponsors: populated,
                pagination: {
                    total: totalSponsors,
                    page,
                    pages: totalPages,
                    limit
                }
            });
        }
    } catch (error) {
        console.error(`[GET /api/sponsors] Error:`, error);
        res.status(500).json({ message: error.message });
    }
});

// POST /api/sponsors
app.post('/api/sponsors', async (req, res) => {
    try {
        if (global.isMongoConnected) {
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

        if (global.isMongoConnected) {
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
        if (global.isMongoConnected) {
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
        if (global.isMongoConnected) {
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
        if (global.isMongoConnected) {
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
        if (global.isMongoConnected) {
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