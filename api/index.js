import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Team Schema
const teamSchema = new mongoose.Schema({
    name: String,
    members: [String],
});

teamSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
});

const Team = mongoose.model('Team', teamSchema);

// Sponsor Schema
const sponsorSchema = new mongoose.Schema({
    companyName: String,
    sector: String,
    companyEmail: String,
    contactPerson: String,
    poc: String,
    phoneNumber: String,
    location: String,
    notes: String,
    status: {
        type: String,
        enum: ['In Progress', 'Contacted', 'Completed', 'Follow-up Required', 'Not Interested'],
        default: 'In Progress'
    },
    assignedTeam: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    }
});

// Transform _id to id for frontend compatibility
sponsorSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret._id;
    }
});

const Sponsor = mongoose.model('Sponsor', sponsorSchema);

// Routes
app.get('/api/sponsors', async (req, res) => {
    try {
        const sponsors = await Sponsor.find().populate('assignedTeam');
        res.json(sponsors);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/sponsors', async (req, res) => {
    try {
        const newSponsor = new Sponsor(req.body);
        const savedSponsor = await newSponsor.save();
        res.status(201).json(savedSponsor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.put('/api/sponsors/:id', async (req, res) => {
    try {
        const updatedSponsor = await Sponsor.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        ).populate('assignedTeam');
        if (!updatedSponsor) return res.status(404).json({ message: "Sponsor not found" });
        res.json(updatedSponsor);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

app.delete('/api/sponsors/:id', async (req, res) => {
    try {
        await Sponsor.findByIdAndDelete(req.params.id);
        res.json({ message: "Sponsor deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Team Routes
app.get('/api/teams', async (req, res) => {
    try {
        const teams = await Team.find();
        res.json(teams);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/teams', async (req, res) => {
    try {
        console.log('Received team data:', req.body);
        const newTeam = new Team(req.body);
        const savedTeam = await newTeam.save();
        res.status(201).json(savedTeam);
    } catch (error) {
        console.error('Error saving team:', error);
        res.status(400).json({ message: error.message });
    }
});


// Export for Vercel
export default app;

// Only listen if running locally
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}
