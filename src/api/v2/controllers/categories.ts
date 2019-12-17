import request from 'request-promise-native';
import xml2js from 'xml2js';
import { ICategory, ICondition } from '../common/interfaces';
import { HttpError, countUtf8Bytes } from '../common/utils';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseStringPromise;
const appId = process.env.APP_ID;
const authNAuth = process.env.AUTH_N_AUTH;

function getRootCategories( req, res ) {
  console.log( 'REQUEST Get root categories' );
  let body = `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${authNAuth}</eBayAuthToken>
      </RequesterCredentials>
      <ErrorLanguage>en_US</ErrorLanguage>
      <WarningLevel>High</WarningLevel>
      <CategorySiteID>0</CategorySiteID>
      <DetailLevel>ReturnAll</DetailLevel>
      <LevelLimit>1</LevelLimit>
    </GetCategoriesRequest>
  `;
  let options = {
    method: 'POST',
    url: 'https://api.ebay.com/ws/api.dll',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': countUtf8Bytes( body ),
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'GetCategories',
    },
    body: body,
  };
  request( options ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetCategoriesResponse.Ack !== 'Success' ) {
      // TODO: Check ebay error message to find cause of failure 
      throw new HttpError( 'Failed to get category info', 400 );
    }
    let categories = [].concat( result.GetCategoriesResponse.CategoryArray.Category || [] );
    let cleanCategories: ICategory[] = categories.map( category => {
      let cleanCategory: ICategory = {
        id: category.CategoryID,
        name: category.CategoryName,
        parentId: category.CategoryParentID,
      };
      return cleanCategory;
    } );

    res.json( cleanCategories );
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } );
}

function getChildCategories( req, res ) {
  console.log( 'REQUEST Get child categories of category:', req.query.parentId );
  let body = `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoryInfoRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <ErrorLanguage>en_US</ErrorLanguage>
      <WarningLevel>High</WarningLevel>
      <CategoryID>${req.query.parentId}</CategoryID>
      <IncludeSelector>ChildCategories</IncludeSelector>
    </GetCategoryInfoRequest>
  `;
  let options = {
    method: 'POST',
    url: 'https://open.api.ebay.com/shopping',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': countUtf8Bytes( body ),
      'X-EBAY-API-APP-ID': appId,
      'X-EBAY-API-SITE-ID': '0',
      'X-EBAY-API-CALL-NAME': 'GetCategoryInfo',
      'X-EBAY-API-VERSION': '963',
      'X-EBAY-API-REQUEST-ENCODING': 'xml',
    },
    body: body,
  };
  request( options ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetCategoryInfoResponse.Ack !== 'Success' ) {
      // TODO: Check ebay error message to find cause of failure 
      throw new HttpError( 'Failed to get category info', 400 );
    }
    let categories = [].concat( result.GetCategoryInfoResponse.CategoryArray.Category || [] );
    let cleanCategories: ICategory[] = categories.map( category => {
      let cleanCategory: ICategory = {
        id: category.CategoryID,
        name: category.CategoryName,
        parentId: category.CategoryParentID,
      };
      return cleanCategory;
    } );

    res.json( cleanCategories );
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } );
}

function getCategory( req, res ) {
  console.log( 'REQUEST Get category id:', req.params.categoryId );
  let body = `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoryInfoRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <ErrorLanguage>en_US</ErrorLanguage>
      <WarningLevel>High</WarningLevel>
      <CategoryID>${req.params.categoryId}</CategoryID>
    </GetCategoryInfoRequest>
  `;
  let options = {
    method: 'POST',
    url: 'https://open.api.ebay.com/shopping',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': countUtf8Bytes( body ),
      'X-EBAY-API-APP-ID': appId,
      'X-EBAY-API-SITE-ID': '0',
      'X-EBAY-API-CALL-NAME': 'GetCategoryInfo',
      'X-EBAY-API-VERSION': '963',
      'X-EBAY-API-REQUEST-ENCODING': 'xml',
    },
    body: body,
  };
  request( options ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetCategoryInfoResponse.Ack !== 'Success' ) {
      if ( result.GetCategoryInfoResponse.Errors.ErrorCode === '10.54' ) {
        // Category does not exist
        throw new HttpError( 'Failed to get category info, category does not exist', 404 );
      } else {
        // TODO: Check ebay error message to find cause of failure 
        throw new HttpError( 'Failed to get category info', 400 );
      }
    }
    let cleanCategory: ICategory = {
      id: result.GetCategoryInfoResponse.CategoryArray.Category.CategoryID,
      name: result.GetCategoryInfoResponse.CategoryArray.Category.CategoryName,
      parentId: result.GetCategoryInfoResponse.CategoryArray.Category.CategoryParentID,
    }
    if ( result.GetCategoryInfoResponse.CategoryArray.Category.CategoryLevel === '1' ) {
      cleanCategory.parentId = result.GetCategoryInfoResponse.CategoryArray.Category.CategoryID;
    }
    res.status( 200 ).json( cleanCategory );
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } );
}

function getCategoryConditions( req, res ) {
  console.log( 'REQUEST Get conditions of category:', req.params.categoryId );
  let body = `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoryFeaturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <RequesterCredentials>
        <eBayAuthToken>${authNAuth}</eBayAuthToken>
      </RequesterCredentials>
      <DetailLevel>ReturnAll</DetailLevel>
      <LevelLimit>1</LevelLimit>
      <ViewAllNodes>true</ViewAllNodes>
      <CategoryID>${req.params.categoryId}</CategoryID>
      <FeatureID>ConditionValues</FeatureID>
    </GetCategoryFeaturesRequest>
  `;
  let options = {
    method: 'POST',
    url: 'https://api.ebay.com/ws/api.dll',
    headers: {
      'Content-Type': 'text/xml',
      'Content-Length': countUtf8Bytes( body ),
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'GetCategoryFeatures',
    },
    body: body,
  };
  request( options ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetCategoryFeaturesResponse.Ack !== 'Success' ) {
      // TODO: Check ebay error message to find cause of failure 
      throw new HttpError( 'Failed to get condition info', 400 );
    }
    if ( result.GetCategoryFeaturesResponse.hasOwnProperty( 'Category' ) ) {
      let conditions = [].concat( result.GetCategoryFeaturesResponse.Category.ConditionValues.Condition || [] );
      let cleanConditions: ICondition[] = conditions.map( condition => {
        let cleanCondition: ICondition = {
          id: condition.ID,
          name: condition.DisplayName,
        }
        return cleanCondition
      } );
      res.status( 200 ).json( cleanConditions );
    } else {
      res.status( 200 ).json( [] );
    }
  } ).catch( error => {
    if ( error instanceof HttpError ) {
      console.error( error.toString() );
      res.sendStatus( error.status );
    } else {
      console.error( error );
      res.sendStatus( 500 );
    }
  } );
}

export { getRootCategories, getChildCategories, getCategory, getCategoryConditions };