

// Landsat stacking

// load the LandTrendr.js module
var ltgee = require('users/emaprlab/public:Modules/LandTrendr.js'); 

var renbands = function(bandstr){
    var months = ee.List(['Jan', 'Feb','Mar','Apr',
                      'May','Jun','Jul','Aug',
                     'Sep','Oct','Nov','Dec']);
    var slist = ee.String(bandstr).split('_');
    var month = ee.Number.parse(slist.get(5));
    var band = ee.String(slist.get(-3));
    var rp = months.get(month.subtract(1));
    return (band.cat(ee.String('_'))).cat(rp);
};

//
exports.lstack = function(year, monthlist, roi){
  // params
  var projpath = 'projects/KalmanGFwork/GFLandsat_V1';
  var bands = ee.List(['B1_mean_post', 'B2_mean_post', 
                 'B3_mean_post','B4_mean_post', 
                 'B5_mean_post', 'B7_mean_post']);
                 
  // get collection and convert to image
  var imgs = ee.ImageCollection(projpath)
           .filter(ee.Filter.eq('year', year))
           .filter(ee.Filter.inList('month', monthlist))
           .filterBounds(roi)
           .select(bands)
           .sort('month')
           .toBands();
  
  // reformat band names and update image stack         
  var stkbands = imgs.bandNames();
  var nbands = stkbands.map(renbands);
  return imgs.select(stkbands,nbands);
};

// Landcover change mapping

exports.getchangemask = function(imgcolParams, runParams, changeParams){
  // run landtrendr
  var startYear = imgcolParams.startYear;
  var endYear = imgcolParams.endYear;
  var startDay =imgcolParams.startDay;
  var endDay = imgcolParams.endDay;
  var clipaoi = imgcolParams.clipaoi;
  var changeYear = imgcolParams.changeYear;
  var index = imgcolParams.index;
  var maskThese = imgcolParams.maskthese;
  
   // add index to changeParams object
  changeParams.index = index;
  var lt = ltgee.runLT(startYear, endYear, startDay, endDay, clipaoi, index, [], runParams, maskThese);
  
  // get the change map layers
  var changeImg = ltgee.getChangeMap(lt, changeParams).unmask(0).short();
  
  // extract yod and mask
  var ychange = changeImg.select(['yod']).unmask(0).short();

  var ymask = ychange.gte(changeYear).multiply(1000).int16();
  var dat = ee.Image.cat([ymask,ychange]);
  
  return dat.select(
    ['yod', 'yod_1'], // old names
    ['changemask', 'yod'] // new names
  );
  
};

// LANDFIRE dataset stacking

exports.lfstack = function(clipaoi){
  // get LF datasets
  var evh = ee.ImageCollection("projects/sat-io/open-datasets/landfire/vegetation/EVH").filterBounds(clipaoi).toBands();
  var ch = ee.ImageCollection("projects/sat-io/open-datasets/landfire/fuel/CH").filterBounds(clipaoi).toBands();
  var cbd = ee.ImageCollection("projects/sat-io/open-datasets/landfire/fuel/CBD").filterBounds(clipaoi).toBands();
  var cbh = ee.ImageCollection("projects/sat-io/open-datasets/landfire/fuel/CBH").filterBounds(clipaoi).toBands();
  var cc = ee.ImageCollection("projects/sat-io/open-datasets/landfire/fuel/CC").filterBounds(clipaoi).toBands();
  
  var img = ee.Image.cat([evh,ch,cbh,cc,cbd]);

  return img.select(
    img.bandNames(),
    ['EVH','CH','CBH','CC','CBD']);
};
