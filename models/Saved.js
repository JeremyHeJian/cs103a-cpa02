'use strict';
const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

var savedSchema = Schema( {
  userId: ObjectId,
  repoId: ObjectId,
} );

module.exports = mongoose.model( 'Saved', savedSchema );
