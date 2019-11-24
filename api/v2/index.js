const express = require( 'express' );
const router = express.Router();

const search = require( './controllers/search' );
const items = require( './controllers/items' );

router.get( '/search', search.search );
router.get( '/items/:id', items.getItem );
router.get( '/items/:id/pictures', items.getItemPictures );
router.get( '/items/:id/description', items.getItemDescription );

module.exports = router;