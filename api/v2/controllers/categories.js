// app.get( '/category', ( req, res ) => {
//   let options = {
//     method: 'POST',
//     url: 'https://api.ebay.com/ws/api.dll',
//     headers: {
//       'Content-Type': 'text/xml',
//       'X-EBAY-API-SITEID': '0',
//       'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
//       'X-EBAY-API-CALL-NAME': 'GetCategories',
//     },
//     body: `
//     <?xml version="1.0" encoding="utf-8"?>
//     <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
//       <RequesterCredentials>
//         <eBayAuthToken>${authNAuth}</eBayAuthToken>
//       </RequesterCredentials>
//       <ErrorLanguage>en_US</ErrorLanguage>
//       <WarningLevel>High</WarningLevel>
//       <CategorySiteID>0</CategorySiteID>
//       <DetailLevel>ReturnAll</DetailLevel>
//       <LevelLimit>1</LevelLimit>
//     </GetCategoriesRequest>
//     `,
//   }
//   request( options ).then( response => {
//     parser.parseString( response, ( err, result ) => {
//       delete result.GetCategoriesResponse[ '$' ];
//       res.json( result.GetCategoriesResponse );
//     } );
//   } ).catch( err => {
//     console.error( err );
//   } );
// } );

// app.get( '/category/:categoryId', ( req, res ) => {
//   let options = {
//     method: 'POST',
//     url: 'https://api.ebay.com/ws/api.dll',
//     headers: {
//       'Content-Type': 'text/xml',
//       'X-EBAY-API-SITEID': '0',
//       'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
//       'X-EBAY-API-CALL-NAME': 'GetCategories',
//     },
//     body: `
//     <?xml version="1.0" encoding="utf-8"?>
//     <GetCategoriesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
//       <RequesterCredentials>
//         <eBayAuthToken>${authNAuth}</eBayAuthToken>
//       </RequesterCredentials>
//       <CategoryParent>${req.params.categoryId}</CategoryParent>
//       <ErrorLanguage>en_US</ErrorLanguage>
//       <WarningLevel>High</WarningLevel>
//       <CategorySiteID>0</CategorySiteID>
//       <DetailLevel>ReturnAll</DetailLevel>
//       <LevelLimit>1</LevelLimit>
//     </GetCategoriesRequest>
//     `,
//   }
//   request( options ).then( response => {
//     parser.parseString( response, ( err, result ) => {
//       delete result.GetCategoriesResponse[ '$' ];
//       res.json( result.GetCategoriesResponse );
//     } );
//   } ).catch( err => {
//     console.error( err );
//   } );
// } );

// app.get( '/category/:categoryId/condition/', ( req, res ) => {
//   let options = {
//     method: 'POST',
//     url: 'https://api.ebay.com/ws/api.dll',
//     headers: {
//       'Content-Type': 'text/xml',
//       'X-EBAY-API-SITEID': '0',
//       'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
//       'X-EBAY-API-CALL-NAME': 'GetCategoryFeatures',
//     },
//     body: `
//     <?xml version="1.0" encoding="utf-8"?>
//     <GetCategoryFeaturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
//       <RequesterCredentials>
//         <eBayAuthToken>${authNAuth}</eBayAuthToken>
//       </RequesterCredentials>
//       <DetailLevel>ReturnAll</DetailLevel>
//       <LevelLimit>1</LevelLimit>
//       <ViewAllNodes>true</ViewAllNodes>
//       <CategoryID>${req.params.categoryId}</CategoryID>
//       <FeatureID>ConditionValues</FeatureID>
//     </GetCategoryFeaturesRequest>
//     `,
//   }
//   request( options ).then( response => {
//     parser.parseString( response, ( err, result ) => {
//       delete result.GetCategoryFeaturesResponse[ '$' ];
//       res.json( result.GetCategoryFeaturesResponse );
//     } );
//   } ).catch( err => {
//     console.error( err );
//   } );
// } );