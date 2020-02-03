const Joi = require('joi');
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const util = require('util');

const API_PORT = 3000;
const app = express();
const router = express.Router();

const Data = mongoose.model('Data', new mongoose.Schema({
	// todo Add requirement
	id: { type: Number },
	text: { type: String }
}));

const dbRoute = 'mongodb+srv://yuki:yuki@cluster0-xzvas.mongodb.net/test?retryWrites=true&w=majority';

mongoose.connect(dbRoute, {
	useNewUrlParser: true,
	useUnifiedTopology: true, 
	useNewUrlParser: true
});

let db = mongoose.connection;

db.once('open', () => console.log('connected to the database'));
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
app.use(bodyParser.urlencoded({
	extended: true
}));

router.get('/', (req, res) => {
	res.send('hello world')
});

router.get('/data/:id', (req, res) => {
	res.send(req.params.id)
});

router.post('/', async (req, res) => {
	const { error } = validateData(req.body); 
	if (error) return res.status(400).send(error.details[0].message);
	let data = new Data({
		id: req.body.id,
		text: req.body.text,
	})
	data = await data.save();
	res.send(data);
});

app.use('/api/data', router);
app.listen(API_PORT, () => console.log(`LISTENING ON PORT ${API_PORT}`));

function validateData(data) {
	const schema = {
		text: Joi.string().min(1).required(),
		id: Joi.number(),
	};

	return Joi.validate(data, schema);
}
