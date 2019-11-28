const fs = require( 'fs' );
const request = require( 'request-promise-native' );
const parser = require( 'xml2js' ).Parser( { 'explicitArray': false } ).parseString;
const moment = require( 'moment-timezone' );

const auth = JSON.parse( fs.readFileSync( './auth.json' ) );
const appId = auth.appId;
const ipApiKey = auth.ipApiKey;
const config = JSON.parse( fs.readFileSync( './api/v2/config/config.json' ) );
const version = config.version;

module.exports.search = ( req, res ) => {
  try {
    console.log( req.query );

    let searchUrl = 'https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=1.13.0&RESPONSE-DATA-FORMAT=XML&REST-PAYLOAD=true'
    searchUrl += '&SECURITY-APPNAME=' + appId;
    searchUrl += '&paginationInput.entriesPerPage=20';
    // searchUrl += '&outputSelector(0)=PictureURLSuperSize'
    searchUrl += '&outputSelector(0)=PictureURLLarge'

    let filterIndex = 0;
    let selectorIndex = 1;

    // ====================================================================================
    // Pagination
    // ====================================================================================
    if ( req.query.query != undefined ) {
      searchUrl += '&keywords=' + req.query.query;
    }

    // ====================================================================================
    // Pagination
    // ====================================================================================
    if ( req.query.page != undefined && Number.isInteger( +req.query.page ) && +req.query.page > 1 ) {
      searchUrl += '&paginationInput.pageNumber=' + req.query.page;
    }

    // ====================================================================================
    // Sorting
    // ====================================================================================
    const validSortings = new Map( [
      [ 1, 'EndTimeSoonest' ],
      [ 2, 'StartTimeNewest' ],
      [ 3, 'PricePlusShippingLowest' ],
      [ 4, 'PricePlusShippingHighest' ]
    ] );

    if ( req.query.sortBy != undefined && validSortings.has( +req.query.sortBy ) ) {
      searchUrl += '&sortOrder=' + validSortings.get( +req.query.sortBy );
    }

    // ====================================================================================
    // Category
    // ====================================================================================

    if ( req.query.category != undefined ) {
      searchUrl += '&categoryId=' + req.query.category;
    }

    // ====================================================================================
    // Filtering -- Listing Type
    // ====================================================================================

    if ( req.query.listType != undefined ) {
      if ( req.query.listType === '1' ) {
        searchUrl += `&itemFilter(${filterIndex}).name=ListingType`;
        searchUrl += `&itemFilter(${filterIndex}).value(0)=AuctionWithBIN`;
        searchUrl += `&itemFilter(${filterIndex}).value(1)=FixedPrice`;
        searchUrl += `&itemFilter(${filterIndex}).value(2)=StoreInventory`;
        filterIndex++;
      } else if ( req.query.listType === '2' ) {
        searchUrl += `&itemFilter(${filterIndex}).name=BestOfferOnly`;
        searchUrl += `&itemFilter(${filterIndex}).value(0)=true`;
        filterIndex++;
      } else if ( req.query.listType === '3' ) {
        searchUrl += `&itemFilter(${filterIndex}).name=ListingType`;
        searchUrl += `&itemFilter(${filterIndex}).value(0)=AuctionWithBIN`;
        searchUrl += `&itemFilter(${filterIndex}).value(1)=Auction`;
        filterIndex++;
      }
    }

    // ====================================================================================
    // Filtering -- Condition
    // ====================================================================================

    if ( req.query.condition != undefined ) {
      searchUrl += `&itemFilter(${filterIndex}).name=Condition`
      searchUrl += `&itemFilter(${filterIndex}).value(0)=${req.query.condition}`
    }

    let zipCode = '';
    let timeZone = '';

    request( `https://api.ipgeolocation.io/timezone?apiKey=${ipApiKey}&ip=${req.ip}` ).then( response => {
      searchUrl += `&buyerPostalCode=${response.geo.zipcode}`;
      timeZone = response.timezone;
    } ).catch( error => {
      searchUrl += `&buyerPostalCode=98177`;
      timeZone = 'America/Los_Angeles'
    } ).then( () => {
      return request( searchUrl );
    } ).then( response => {
      parser( response, ( err, result ) => {
        result = result.findItemsAdvancedResponse;
        if ( result.ack == 'Failure' ) {
          res.sendStatus( 400 );
        } else {
          let clean = {}
          clean.searchResult = {
            count: 0,
            items: []
          }
          clean.searchResult.items = result.searchResult.item.map( item => {
            cleanItem = {
              'itemId': item.itemId,
              'title': item.title,
              'thumbnailUrl': item.pictureURLLarge ||
                item.galleryURL ||
                'https://thumbs1.ebaystatic.com/pict/04040_0.jpg',
              'country': item.country,
              'listingInfo': {
                'startTimeUtc': item.listingInfo.startTime,
                'endTimeUtc': item.listingInfo.endTime,
                'endTimeLocal': item.listingInfo.endTime,
                'timeRemaining': item.sellingStatus.timeLeft,
                'timeTilEndDay': 0,
              },
              'listingType': item.listingInfo.listingType,
              'bestOfferEnabled': item.listingInfo.bestOfferEnabled === 'true',
              'buyItNowEnabled': item.listingInfo.buyItNowAvailable === 'true',
              'currentPrice': {
                'price': +item.sellingStatus.currentPrice[ '_' ],
                'currencyId': item.sellingStatus.currentPrice[ '$' ].currencyId
              },
              'currentPriceConverted': {
                'price': +item.sellingStatus.convertedCurrentPrice[ '_' ],
                'currencyId': item.sellingStatus.convertedCurrentPrice[ '$' ].currencyId
              },
              'sellingState': item.sellingStatus.sellingState,
              'watchCount': +item.listingInfo.watchCount,
              'shippingInfo': {
                'shippingType': item.shippingInfo.shippingType
              },
              'category': item.primaryCategory,
            }

            if ( item.condition != undefined ) {
              cleanItem.condition = {
                'conditionId': item.condition.conditionId,
                'conditionName': item.condition.conditionDisplayName
              }
            }

            if ( cleanItem.listingType === 'Auction' || cleanItem.listingType == 'AuctionWithBIN' ) {
              cleanItem.bidCount = +item.sellingStatus.bidCount;
            }

            cleanItem.listingInfo.endTimeLocal = moment( cleanItem.listingInfo.endTimeUtc ).tz( timeZone ).toString();

            timeTilEndDay = moment.duration( moment( cleanItem.listingInfo.endTimeUtc ).tz( timeZone ).startOf( 'day' ).diff( moment().tz( timeZone ) ) );

            if ( timeTilEndDay.asMilliseconds() < 1 ) {
              cleanItem.listingInfo.timeTilEndDay = 'PT0S';
            } else {
              cleanItem.listingInfo.timeTilEndDay = timeTilEndDay.toISOString();
            }

            return cleanItem;
          } );

          clean.searchResult.count = clean.searchResult.items.length;

          clean.pagination = {
            page: +result.paginationOutput.pageNumber,
            totalPages: +result.paginationOutput.totalPages,
            entriesPerPage: +result.paginationOutput.entriesPerPage,
          }

          clean.searchEbayUrl = result.itemSearchURL;

          res.status( 200 ).json( clean );
        }
      } );
    } ).catch( error => {
      throw new Error( 'Failed promise' );
    } );
  } catch ( error ) {
    console.error( error );
    res.sendStatus( 500 );
  }
}