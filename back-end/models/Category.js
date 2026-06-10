//model pour les categories 

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {type: String, required: true},
    type: {
      type: String,
      enum: ['expense', 'income', 'product'],
      required: true,
    }, // expense / income : flux perso ; product : rayons boutique
}, {timestamps: true});

module.exports = mongoose.model('Category', categorySchema);