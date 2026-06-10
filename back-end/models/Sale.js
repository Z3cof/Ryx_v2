//model pour les ventes si l'utilisateur est un commercant

const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},//commercant
    category: {type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true},//type de vente (alimentaire, non alimentaire, etc.)
    amount: {type: Number, required: true},
    description: {type: String},
    date: {type: Date, required: true},
});

module.exports = mongoose.model('Sale', saleSchema);