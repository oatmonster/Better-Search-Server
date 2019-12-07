import request from 'request-promise-native';
import xml2js from 'xml2js';
import { IItem, ISearchResult } from '../common/interfaces';
import { HttpError } from '../common/utils';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseStringPromise;
const appId = process.env.APP_ID;
const ipApiKey = process.env.IP_API_KEY;

const search = ( req, res ) => {
  console.log( 'REQUEST Search query:', req.query );



  let searchUrl = 'https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsAdvanced&SERVICE-VERSION=1.13.0&RESPONSE-DATA-FORMAT=XML&REST-PAYLOAD=true'
  searchUrl += '&SECURITY-APPNAME=' + appId;
  searchUrl += '&paginationInput.entriesPerPage=20';
  searchUrl += '&outputSelector(0)=PictureURLLarge'

  let filterIndex = 0;
  let selectorIndex = 1;

  try {
    // ====================================================================================
    // Query
    // ====================================================================================
    if ( req.query.hasOwnProperty( 'query' ) ) {
      searchUrl += '&keywords=' + req.query.query;
    } else {
      throw new HttpError( 'Keyword is required', 400 );
    }

    // ====================================================================================
    // Pagination
    // ====================================================================================
    if ( req.query.hasOwnProperty( 'page' ) ) {
      if ( Number.isInteger( +req.query.page ) && +req.query.page > 1 ) {
        searchUrl += '&paginationInput.pageNumber=' + req.query.page;
      } else {
        throw new HttpError( 'Invalid page', 400 );
      }
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

    if ( req.query.hasOwnProperty( 'sortBy' ) ) {
      if ( validSortings.has( +req.query.sortBy ) ) {
        searchUrl += '&sortOrder=' + validSortings.get( +req.query.sortBy );
      } else {
        throw new HttpError( 'Invalid sorting', 400 );
      }
    }

    // ====================================================================================
    // Category
    // ====================================================================================

    if ( req.query.hasOwnProperty( 'category' ) ) {
      searchUrl += '&categoryId=' + req.query.category;
    }

    // ====================================================================================
    // Filtering -- Listing Type
    // ====================================================================================

    if ( req.query.hasOwnProperty( 'listType' ) ) {
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
      } else {
        throw new HttpError( 'Invalid list type', 400 );
      }
    }

    // ====================================================================================
    // Filtering -- Condition
    // ====================================================================================

    if ( req.query.hasOwnProperty( 'condition' ) ) {
      searchUrl += `&itemFilter(${filterIndex}).name=Condition`
      searchUrl += `&itemFilter(${filterIndex}).value(0)=${req.query.condition}`
    }

    let zipCode = '';
    let timeZone = '';

    request( `https://api.ipgeolocation.io/timezone?apiKey=${ipApiKey}&ip=${req.ip}` ).then( response => {
      searchUrl += `&buyerPostalCode=${response.geo.zipcode}`;
    } ).catch( error => {
      searchUrl += `&buyerPostalCode=98177`;
    } ).then( () => {
      return request.get( searchUrl );
    } ).then( response => {
      return parser( response );
    } ).then( result => {
      result = result.findItemsAdvancedResponse;
      if ( result.ack !== 'Success' ) {
        // TODO: Check ebay error message to find cause of failure 
        throw new HttpError( 'Failed to get item info', 400 );
      }
      let clean: ISearchResult = {
        searchResult: {
          count: result.searchResult[ '$' ].count,
          items: []
        },
        pagination: {
          page: +result.paginationOutput.pageNumber,
          totalPages: +result.paginationOutput.totalPages,
          totalEntries: +result.paginationOutput.totalEntries,
          entriesPerPage: +result.paginationOutput.entriesPerPage,
        },
        searchEbayUrl: result.itemSearchURL
      };
      let items = [].concat( result.searchResult.item || [] );
      clean.searchResult.items = items.map( item => {
        let cleanItem: IItem = {
          itemId: item.itemId,
          title: item.title,
          thumbnailUrl: item.pictureURLLarge ||
            item.galleryURL ||
            'https://thumbs1.ebaystatic.com/pict/04040_0.jpg',
          country: item.country,
          listingInfo: {
            startTimeUtc: item.listingInfo.startTime,
            endTimeUtc: item.listingInfo.endTime,
            timeRemaining: item.sellingStatus.timeLeft,
          },
          listingType: undefined,
          bestOfferEnabled: item.listingInfo.bestOfferEnabled === 'true',
          buyItNowEnabled: item.listingInfo.buyItNowAvailable === 'true',
          currentPrice: {
            price: +item.sellingStatus.currentPrice[ '_' ],
            currencyId: item.sellingStatus.currentPrice[ '$' ].currencyId
          },
          currentPriceConverted: {
            price: +item.sellingStatus.convertedCurrentPrice[ '_' ],
            currencyId: item.sellingStatus.convertedCurrentPrice[ '$' ].currencyId
          },
          sellingState: item.sellingStatus.sellingState,
          watchCount: +item.listingInfo.watchCount,
          shippingInfo: {
            type: item.shippingInfo.shippingType,
            cost: +item.shippingInfo.shippingServiceCost[ '_' ],
            currencyId: item.shippingInfo.shippingServiceCost[ '$' ].currencyId
          },
          category: item.primaryCategory,
          itemEbayUrl: item.viewItemURL,
        };

        if ( item.hasOwnProperty( 'condition' ) ) {
          cleanItem.condition = {
            conditionId: item.condition.conditionId,
            conditionName: item.condition.conditionDisplayName
          };
        }

        if ( item.listingInfo.listingType === 'AdType' || item.listingInfo.listingType === 'Classified' ) {
          cleanItem.listingType = 'Advertisement';
        } else if ( item.listingInfo.listingType === 'Auction' || item.listingInfo.listingType === 'AuctionWithBIN' || item.listingInfo.listingType === 'FixedPrice' ) {
          cleanItem.listingType = item.listingInfo.listingType;
        } else if ( item.listingInfo.listingType === 'StoreInventory' ) {
          cleanItem.listingType = 'FixedPrice';
        } else {
          cleanItem.listingType = 'OtherType';
        }

        if ( cleanItem.listingType === 'Auction' || cleanItem.listingType === 'AuctionWithBIN' ) {
          cleanItem.bidCount = +item.sellingStatus.bidCount;
        }

        return cleanItem;
      } );

      res.status( 200 ).json( clean );

    } ).catch( error => {
      if ( error instanceof HttpError ) {
        console.error( error.toString() );
        res.sendStatus( error.status );
      } else {
        console.error( error );
        res.sendStatus( 500 );
      }
    } );
  } catch ( error ) {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  }
}

export { search };