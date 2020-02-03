const Joi = require('joi');

module.exports = function validateData(data) {
	const schema = {
		text: Joi.string().min(1).required(),
		key: Joi.number(),
	};

	return Joi.validate(data, schema);
};