const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const validateData = require('./validator');

const makeRandomStr = () => Math.random().toString(36).substring(2);

// Pleaes set your mongoDB's ID and password here
const mongodbID = process.env.MONGO_ID;
const mongodbPW = '';

const API_PORT = 3000;
const app = express();
const router = express.Router();
const expireAfterSeconds = 3600;
const maxNumOfCachedItems = 30;

const Data = mongoose.model('Data', new mongoose.Schema({
	key: { type: String },
	text: { type: String },
	createAt: { type: Number }
}));

const dbRoute = `mongodb+srv://${mongodbID}:${mongodbPW}@cluster0-xzvas.mongodb.net/test?retryWrites=true&w=majority`;

mongoose.connect(dbRoute, {
	useNewUrlParser: true,
	useUnifiedTopology: true, 
	useNewUrlParser: true,
	useFindAndModify: false,
});

let db = mongoose.connection;
db.collection('Data').createIndex( { "lastModifiedDate": 1 }, { expireAfterSeconds } )
db.once('open', () => console.log('connected to the database'));
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

router.get('/', async (req, res) => {
	const data = await Data.find().sort('key');
	if (data.length === 0) return res.status(404).send('There are no data');
	const keys = data.map(item => item.key);
	res.send(keys)
});

router.post('/', async (req, res) => {
	const { error } = validateData(req.body);
	if (error) return res.status(400).send(error.details[0].message);

	// This is how I approced to overwrite the old entry with new one 
	// The first condition is to check if the max number of cached item is reached
	// If it is reached, it finds the oldest entry in the current collection by sorting by timemstamp and gettint the oldest one
	// Then, it replace the oldest one and the newly posted one
	const data = await Data.find().sort('key');
	if (data.length === maxNumOfCachedItems){
		const currentDataArr = await Data.find().sort('key');
		const oldestData = currentDataArr.sort((a, b) => a.createAt - b.createAt)[0];
		const newData = new Data({
			key: req.body.key,
			text: req.body.text,
			createAt: Date.now(),
		})
		const data = await Data.findOneAndUpdate({ key: oldestData.key }, newData, { new: true });
		res.send(data);
	}

	let data = new Data({
		key: req.body.key,
		text: req.body.text,
		createAt: Date.now(),
	})
	data = await data.save();
	res.send(data);
});

router.delete('/', async (req, res) => {
	mongoose.connection.db.dropCollection('Data', (err, result) => {
		console.log('err', err)
		res.send(result);
	});
});

router.put('/:key', async (req, res) => {
	const { error } = validateData(req.body); 
	if (error) return res.status(400).send(error.details[0].message);
	const data = await Data.findOneAndUpdate({ key: req.params.key }, req.body, { new: true });
	if (!data) return res.status(404).send('The data with the given ID was not found.');

	res.send(data);
});

router.delete('/:key', async (req, res) => {
	const data = await Data.findOneAndRemove({ key: req.params.key });
	if (!data) return res.status(404).send('The data with the given ID was not found.');

	if (res.statusCode === 200) {
		console.log(`Succecessfully deleted ${req.params.key}`)
		res.send(data);
	}
});

router.get('/:key', async (req, res) => {
	const data = await Data.find({ key: req.params.key });
	if (data.length === 0) {
		console.log('Cache miss');
		const randomStr = makeRandomStr();
		let newData = new Data({
			key: req.params.key,
			text: randomStr,
			createAt: Date.now(),
		})
		newData = await newData.save();
		res.send(newData);
	} else {
		console.log(`Cache hit! \n ${data}`);
		res.send(data)
	}
});

app.use('/api/data', router);
app.listen(API_PORT, () => console.log(`LISTENING ON PORT ${API_PORT}`));
