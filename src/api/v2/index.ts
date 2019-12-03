import express from 'express';
import request from 'request-promise-native';
import * as search from './controllers/search';
import * as items from './controllers/items';
import * as categories from './controllers/categories';

const router = express.Router();
const ipApiKey = process.env.IP_API_KEY;

router.get( '/search', search.search );
router.get( '/items/:id', items.getItem );
router.get( '/items/:id/pictures', items.getItemPictures );
router.get( '/items/:id/description', items.getItemDescription );
router.get( '/categories', categories.getCategories );
router.get( '/categories/:categoryId', categories.getCategory );
router.get( '/categories/:categoryId/conditions', categories.getCategoryConditions );

router.get( '/ip', ( req, res ) => {
  try {
    let url = `https://api.ipgeolocation.io/ipgeo?apiKey=${ipApiKey}&ip=${req.ip}`;

    request( url, { json: true } ).then( response => {
      res.json( {
        ip: response.ip,
        zipCode: response.zipcode
      } );
    } ).catch( error => {
      res.json( {
        ip: req.ip,
        zipCode: '98177'
      } );
    } );
  } catch ( error ) {
    console.error( error );
    res.sendStatus( 500 );
  }

} );

module.exports = router;