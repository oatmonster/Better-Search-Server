import request from 'request-promise-native';
import xml2js from 'xml2js';
import moment from 'moment-timezone';
import { IItem } from '../common/interfaces';
import * as utils from '../common/utils';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseStringPromise;
const appId = process.env.APP_ID;
const authNAuth = process.env.AUTH_N_AUTH;
const ipApiKey = process.env.IP_API_KEY;

const getItem = ( req, res ) => {
  console.log( 'REQUEST Get item id:', req.params.id );
  let countryCode = 'US';
  let zipCode = '98177';
  let timeZone = 'America/Los_Angeles';
  let shippingInfo = {
    type: undefined,
    cost: undefined,
    currencyId: undefined,
  };
  request( `https://api.ipgeolocation.io/timezone?apiKey=${ipApiKey}&ip=${req.ip}` ).then( response => {
    countryCode = response.geo.country_code2;
    zipCode = response.geo.zipcode;
    timeZone = response.timezone;
  } ).catch( error => {
  } ).then( () => {
    // Get shipping cost
    let body = `
      <?xml version="1.0" encoding="utf-8"?>
      <GetShippingCostsRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <ItemID>${req.params.id}</ItemID>
        <DestinationCountryCode>${countryCode}</DestinationCountryCode>
        <DestinationPostalCode>${zipCode}</DestinationPostalCode>
      </GetShippingCostsRequest>
    `;
    let options = {
      method: 'POST',
      url: 'https://open.api.ebay.com/shopping',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': utils.countUtf8Bytes( body ),
        'X-EBAY-API-APP-ID': appId,
        'X-EBAY-API-SITE-ID': '0',
        'X-EBAY-API-CALL-NAME': 'GetShippingCosts',
        'X-EBAY-API-VERSION': '963',
        'X-EBAY-API-REQUEST-ENCODING': 'xml',
      },
      body: body,
    }

    return request( options );

  } ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetShippingCostsResponse.Ack != "Success" ) {
      throw new Error( 'ERROR: Failed to get shipping info' );
    }
    shippingInfo.type = result.GetShippingCostsResponse.ShippingCostSummary.ShippingType;
    shippingInfo.cost = +result.GetShippingCostsResponse.ShippingCostSummary.ShippingServiceCost[ '_' ];
    shippingInfo.currencyId = result.GetShippingCostsResponse.ShippingCostSummary.ShippingServiceCost[ '$' ].currencyID;
    if ( shippingInfo.type === 'Flat' && shippingInfo.cost === 0 ) {
      shippingInfo.type = 'Free';
    }
  } ).then( () => {
    let body = `
      <?xml version="1.0" encoding="utf-8"?>
      <GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <RequesterCredentials>
          <eBayAuthToken>${authNAuth}</eBayAuthToken>
        </RequesterCredentials>
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <DetailLevel>ReturnAll</DetailLevel>
        <ItemID>${req.params.id}</ItemID>
      </GetItemRequest>
    `;
    let options = {
      method: 'POST',
      url: 'https://api.ebay.com/ws/api.dll',
      headers: {
        'Content-Type': 'text/xml',
        'Content-Length': utils.countUtf8Bytes( body ),
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetItem',
      },
      body: body,
    };
    return request( options )
  } ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetItemResponse.Ack != "Success" ) {
      throw new Error( 'ERROR: Failed to get item' );
    }
    delete result.GetItemResponse[ '$' ];
    result = result.GetItemResponse.Item;

    let cleanItem: IItem = {
      itemId: result.ItemID,
      title: result.Title,
      thumbnailUrl: result.PictureDetails.GalleryURL,
      galleryUrls: result.PictureDetails.PictureURL,
      country: result.Country,
      category: {
        categoryId: result.PrimaryCategory.CategoryID,
        categoryName: result.PrimaryCategory.CategoryName.split( ':' ).slice( -1 )[ 0 ],
      },
      listingInfo: {
        startTimeUtc: result.ListingDetails.StartTime,
        endTimeUtc: result.ListingDetails.EndTime,
        endTimeLocal: undefined,
        timeRemaining: result.TimeLeft,
        timeTilEndDay: undefined,
      },
      listingType: undefined,
      bestOfferEnabled: false,
      buyItNowEnabled: false,
      currentPrice: {
        price: +result.SellingStatus.CurrentPrice[ '_' ],
        currencyId: result.SellingStatus.CurrentPrice[ '$' ].currencyID,
      },
      currentPriceConverted: {
        price: +result.SellingStatus.ConvertedCurrentPrice[ '_' ],
        currencyId: result.SellingStatus.ConvertedCurrentPrice[ '$' ].currencyID,
      },
      sellingState: result.SellingStatus.ListingState,
      shippingInfo: shippingInfo,
      description: result.Description,
    };

    // Set condition if user specified one
    if ( result.hasOwnProperty( 'ConditionID' ) ) {
      cleanItem.condition = {
        conditionId: result.ConditionID,
        conditionName: result.ConditionDisplayName,
      };
    }

    if ( result.hasOwnProperty( 'BestOfferDetails' ) && result.BestOfferDetails.BestOfferEnabled === 'true' ) {
      cleanItem.bestOfferEnabled = true;
    }
    if ( result.ListingType === 'Chinese' && result.ListingDetails.BuyItNowAvailable === 'true' ) {
      cleanItem.buyItNowEnabled = true;
    }

    // Normalize listing type
    if ( result.ListingType === 'Chinese' ) {
      if ( cleanItem.buyItNowEnabled ) {
        cleanItem.listingType = 'AuctionWithBIN';
      } else {
        cleanItem.listingType = 'Auction';
      }
    } else if ( result.ListingType === 'AdType' || result.ListingType === 'LeadGeneration' ) {
      cleanItem.listingType = 'Advertisement';
    } else if ( result.ListingType === 'FixedPriceItem' ) {
      cleanItem.listingType = 'FixedPrice';
    } else {
      cleanItem.listingType = 'OtherType';
    }

    // Get bid count for auctions
    if ( cleanItem.listingType === 'Auction' || cleanItem.listingType === 'AuctionWithBIN' ) {
      cleanItem.bidCount = +result.SellingStatus.BidCount;
    }

    // Set listing time info
    cleanItem.listingInfo.endTimeLocal = moment( cleanItem.listingInfo.endTimeUtc ).tz( timeZone ).toString();

    let timeTilEndDay = moment.duration( moment( cleanItem.listingInfo.endTimeUtc ).tz( timeZone ).startOf( 'day' ).diff( moment().tz( timeZone ) ) );

    if ( timeTilEndDay.asMilliseconds() < 1 ) {
      cleanItem.listingInfo.timeTilEndDay = 'PT0S';
    } else {
      cleanItem.listingInfo.timeTilEndDay = timeTilEndDay.toISOString();
    }

    res.status( 200 ).json( cleanItem );
  } ).catch( error => {
    console.error( error.message );
    res.sendStatus( 500 );
  } );

}

const getItemPictures = ( req, res ) => {
  console.log( 'REQUEST Get pictures for item id:', req.params.id );
  let url = 'http://open.api.ebay.com/shopping?callname=GetSingleItem'
  url += '&responseencoding=XML&siteid=0&version=967';
  url += '&appid=' + appId;
  url += '&ItemID=' + req.params.id;

  request( url ).then( response => {
    return parser( response );
  } ).then( result => {
    res.status( 200 ).json( result.GetSingleItemResponse.Item.PictureURL );
  } ).catch( error => {
    console.error( error );
    res.sendStatus( 500 );
  } );

}

const getItemDescription = ( req, res ) => {
  console.log( 'REQUEST Get description for item id:', req.params.id );
  let url = 'http://open.api.ebay.com/shopping?callname=GetSingleItem'
  url += '&responseencoding=XML&siteid=0&version=967';
  url += '&appid=' + appId;
  url += '&ItemID=' + req.params.id;
  url += '&IncludeSelector=Description';

  request( url ).then( response => {
    return parser( response );
  } ).then( result => {
    res.status( 200 ).json( result.GetSingleItemResponse.Item.Description );
  } ).catch( error => {
    console.error( error );
    res.sendStatus( 500 );
  } );
}

export { getItem, getItemPictures, getItemDescription };