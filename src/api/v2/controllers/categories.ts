import request from 'request-promise-native';
import xml2js from 'xml2js';
import { ICategory, ICondition } from '../common/interfaces';

const parser = new xml2js.Parser( { 'explicitArray': false } ).parseStringPromise;
const appId = process.env.APP_ID;
const authNAuth = process.env.AUTH_N_AUTH;

const getCategories = ( req, res ) => {
  if ( req.query.hasOwnProperty( 'parentId' ) ) {
    console.log( 'REQUEST Get categories with parent:', req.query.parentId );
    let options = {
      method: 'POST',
      url: 'https://open.api.ebay.com/shopping',
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-APP-ID': appId,
        'X-EBAY-API-SITE-ID': '0',
        'X-EBAY-API-CALL-NAME': 'GetCategoryInfo',
        'X-EBAY-API-VERSION': '963',
        'X-EBAY-API-REQUEST-ENCODING': 'xml',
      },
      body: `
      <?xml version="1.0" encoding="utf-8"?>
      <GetCategoryInfoRequest xmlns="urn:ebay:apis:eBLBaseComponents">
        <ErrorLanguage>en_US</ErrorLanguage>
        <WarningLevel>High</WarningLevel>
        <CategoryID>${req.query.parentId}</CategoryID>
        <IncludeSelector>ChildCategories</IncludeSelector>
      </GetCategoryInfoRequest>
      `,
    };
    request( options ).then( response => {
      return parser( response );
    } ).then( result => {
      if ( result.GetCategoryInfoResponse.Ack !== 'Success' ) {
        // Handle errors
        throw new Error( 'ERROR: Ebay Error' );
      }

      let cleanCategories: ICategory[] = result.GetCategoryInfoResponse.CategoryArray.Category.map( category => {
        let cleanCategory: ICategory = {
          categoryId: category.CategoryID,
          categoryName: category.CategoryName,
          parentId: category.CategoryParentID,
        };
        return cleanCategory;
      } );

      res.json( cleanCategories );
    } ).catch( error => {
      console.error( error );
      res.sendStatus( 500 );
    } );
  } else {
    console.log( 'REQUEST Get root categories' );
    let options = {
      method: 'POST',
      url: 'https://api.ebay.com/ws/api.dll',
      headers: {
        'Content-Type': 'text/xml',
        'X-EBAY-API-SITEID': '0',
        'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
        'X-EBAY-API-CALL-NAME': 'GetCategories',
      },
      body: `
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
    `,
    };
    request( options ).then( response => {
      return parser( response );
    } ).then( result => {
      if ( result.GetCategoriesResponse.Ack !== 'Success' ) {
        // Handle errors
        throw new Error( 'ERROR: Ebay Error' );
      }

      let cleanCategories: ICategory[] = result.GetCategoriesResponse.CategoryArray.Category.map( category => {
        let cleanCategory: ICategory = {
          categoryId: category.CategoryID,
          categoryName: category.CategoryName,
          parentId: category.CategoryParentID,
        };
        return cleanCategory;
      } );

      res.json( cleanCategories );
    } ).catch( error => {
      console.error( error );
      res.sendStatus( 500 );
    } );
  }
}

const getCategory = ( req, res ) => {
  console.log( 'REQUEST Get category id:', req.params.categoryId );
  let options = {
    method: 'POST',
    url: 'https://open.api.ebay.com/shopping',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-APP-ID': appId,
      'X-EBAY-API-SITE-ID': '0',
      'X-EBAY-API-CALL-NAME': 'GetCategoryInfo',
      'X-EBAY-API-VERSION': '963',
      'X-EBAY-API-REQUEST-ENCODING': 'xml',
    },
    body: `
    <?xml version="1.0" encoding="utf-8"?>
    <GetCategoryInfoRequest xmlns="urn:ebay:apis:eBLBaseComponents">
      <ErrorLanguage>en_US</ErrorLanguage>
      <WarningLevel>High</WarningLevel>
      <CategoryID>${req.params.categoryId}</CategoryID>
    </GetCategoryInfoRequest>
    `,
  };
  request( options ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetCategoryInfoResponse.Ack !== 'Success' ) {
      if ( result.GetCategoryInfoResponse.Errors.ErrorCode === '10.54' ) {
        // Category does not exist
        res.sendStatus( 404 );
      } else {
        // Handle errors
        throw new Error( 'ERROR: Ebay Error' );
      }
    } else {
      let cleanCategory: ICategory = {
        categoryId: result.GetCategoryInfoResponse.CategoryArray.Category.CategoryID,
        categoryName: result.GetCategoryInfoResponse.CategoryArray.Category.CategoryName,
        parentId: result.GetCategoryInfoResponse.CategoryArray.Category.CategoryParentID,
      }
      if ( result.GetCategoryInfoResponse.CategoryArray.Category.CategoryLevel === '1' ) {
        cleanCategory.parentId = result.GetCategoryInfoResponse.CategoryArray.Category.CategoryID;
      }
      res.status( 200 ).json( cleanCategory );
    }
  } ).catch( error => {
    console.error( error );
    res.sendStatus( 500 );
  } );
}


const getCategoryConditions = ( req, res ) => {
  console.log( 'REQUEST Get conditions of category:', req.params.categoryId );
  let options = {
    method: 'POST',
    url: 'https://api.ebay.com/ws/api.dll',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-CALL-NAME': 'GetCategoryFeatures',
    },
    body: `
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
    `,
  };
  request( options ).then( response => {
    return parser( response );
  } ).then( result => {
    if ( result.GetCategoryFeaturesResponse.Ack !== 'Success' ) {
      // Handle errors
      throw new Error( 'ERROR: Ebay Error' );
    }
    if ( result.GetCategoryFeaturesResponse.hasOwnProperty( 'Category' ) ) {
      let cleanConditions: ICondition[] = result.GetCategoryFeaturesResponse.Category.ConditionValues.Condition.map( condition => {
        let cleanCondition: ICondition = {
          conditionId: condition.ID,
          conditionName: condition.DisplayName,
        }
        return cleanCondition
      } );
      res.status( 200 ).json( cleanConditions );
    } else {
      res.status( 200 ).json( [] );
    }
  } ).catch( error => {
    console.error( error );
    res.sendStatus( 500 );
  } );
}

export { getCategories, getCategory, getCategoryConditions };