'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;
const Mixed = Schema.Types.Mixed;

var repoSchema = Schema({
  id: Number,
  repo_name: String,
  full_name: String,
  description: String,
  created: String,
  language: String,
  type: String,
  username: String,
  stars: Number,
  forks: Number,
  subscribers: Number,
  open_issues: Number,
  topics: Mixed,
});

module.exports = mongoose.model('Repo', repoSchema);
