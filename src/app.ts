import express from 'express';
import cors from 'cors';
import * as categories from './api/v2/models/categories';

const app = express();

app.use( cors() );

app.use( '/api', require( './api' ) );

app.get( '/', ( req, res ) => res.send( 'Copyright Alex Zhao 2019' ) );

exports.app = app;
exports.init = Promise.all( [ categories.init() ] );